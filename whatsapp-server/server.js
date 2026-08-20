const express = require('express');
const cors = require('cors');
const http = require('http');
const https = require('https');
const fs = require('fs');
const path = require('path');

if (!process.env.WAHA_API_KEY || process.env.WAHA_API_KEY.trim() === '') {
    console.error('[Startup Error] WAHA_API_KEY is missing');
    process.exit(1);
}

const { initializeApp } = require('firebase/app');
const { getFirestore, collection, query, where, onSnapshot, doc, updateDoc, setDoc, runTransaction, getDocs } = require('firebase/firestore');

const firebaseConfig = {
    apiKey: "AIzaSyDrTFkfeZr7F2UFhubaxt0s4_VNwYC5R8Q",
    projectId: "mirjaswork",
};
const firebaseApp = initializeApp(firebaseConfig);
const db = getFirestore(firebaseApp);

const app = express();
app.use(cors());
app.use(express.json());

let connectionStatus = 'READY';

const updateFirebaseStatus = async (status, qr = '') => {
    try {
        await setDoc(doc(db, 'whatsapp_config', 'status'), {
            status: status,
            qr: qr,
            updatedAt: new Date().toISOString()
        }, { merge: true });
        console.log(`[FirebaseSync] Status synced to Firebase: ${status}`);
    } catch(err) {
        console.error('Failed to sync status to Firebase:', err);
    }
};

updateFirebaseStatus('READY');

const cacheFile = path.join(__dirname, 'dedup_cache.json');
const messageQueue = [];
const activeDocIds = new Set();
let isProcessingQueue = false;
let lastSentTime = 0;
let sentMessagesCache = new Map(); 

// Startup limits
const STARTUP_TIME = Date.now();
const STARTUP_BURST_WINDOW = 10 * 60 * 1000; // 10 minutes
const MAX_STARTUP_BURST = 20; // max 20 messages in first 10 mins
let messagesSentSinceStartup = 0;

try {
    if (fs.existsSync(cacheFile)) {
        const data = fs.readFileSync(cacheFile, 'utf8');
        sentMessagesCache = new Map(JSON.parse(data));
        console.log(`[Deduplication] Loaded ${sentMessagesCache.size} items from persistent cache.`);
    }
} catch(e) { console.error('Error loading deduplication cache', e); }

const saveCacheToDisk = () => {
    try {
        fs.writeFileSync(cacheFile, JSON.stringify(Array.from(sentMessagesCache.entries())));
    } catch(e) { console.error('Error saving cache', e); }
};

const RATE_LIMIT_DELAY = 35000;
const MAX_AGE_MS = 10 * 60 * 1000; // 10 minutes

const WAHA_URL = process.env.WAHA_URL || 'http://127.0.0.1:3000';

const sendWahaRequest = (payload) => {
    return new Promise((resolve, reject) => {
        const payloadStr = JSON.stringify(payload);
        const parsedUrl = new URL(`${WAHA_URL}/api/sendText`);
        const isHttps = parsedUrl.protocol === 'https:';
        const reqModule = isHttps ? https : http;

        const options = {
            hostname: parsedUrl.hostname,
            port: parsedUrl.port || (isHttps ? 443 : 80),
            path: parsedUrl.pathname + parsedUrl.search,
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-Api-Key': process.env.WAHA_API_KEY,
                'Content-Length': Buffer.byteLength(payloadStr)
            }
        };

        const req = reqModule.request(options, (res) => {
            let body = '';
            res.on('data', (chunk) => body += chunk);
            res.on('end', () => {
                if (res.statusCode === 200 || res.statusCode === 201) {
                    try {
                        const jsonBody = JSON.parse(body);
                        resolve({ success: true, body: jsonBody });
                    } catch(e) {
                        resolve({ success: true, body });
                    }
                } else {
                    reject(new Error(`WAHA API returned status ${res.statusCode}: ${body}`));
                }
            });
        });

        req.on('error', (e) => reject(e));
        req.write(payloadStr);
        req.end();
    });
};

const getMessageAge = (createdAt) => {
    if (!createdAt) return 0;
    try {
        const createdTime = typeof createdAt.toMillis === 'function' ? createdAt.toMillis() : new Date(createdAt).getTime();
        return Date.now() - createdTime;
    } catch(e) {
        return 0;
    }
};

const cleanupStaleMessagesOnStartup = async () => {
    console.log('[Startup] Checking for stale pending/processing messages...');
    try {
        const qPending = query(collection(db, 'whatsapp_queue_v2'), where('status', '==', 'pending'));
        const qProcessing = query(collection(db, 'whatsapp_queue_v2'), where('status', '==', 'processing'));
        
        const [pendingSnap, processingSnap] = await Promise.all([getDocs(qPending), getDocs(qProcessing)]);
        
        let staleCount = 0;
        
        for (const docSnap of pendingSnap.docs) {
            const data = docSnap.data();
            const ageMs = getMessageAge(data.createdAt);
            if (ageMs > MAX_AGE_MS) {
                await updateDoc(docSnap.ref, { status: 'expired', error: 'Message expired on startup (older than 10 minutes)', sentAt: new Date().toISOString() });
                console.log(`[Log: expired] Startup-Cleanup: Pending message ${docSnap.id} marked as expired.`);
                staleCount++;
            }
        }
        
        for (const docSnap of processingSnap.docs) {
            const data = docSnap.data();
            const ageMs = getMessageAge(data.createdAt);
            if (ageMs > MAX_AGE_MS) {
                await updateDoc(docSnap.ref, { status: 'failed_stale', error: 'Stuck in processing on startup (older than 10 minutes)', sentAt: new Date().toISOString() });
                console.log(`[Log: failed] Startup-Cleanup: Processing message ${docSnap.id} marked as failed_stale.`);
            } else {
                await updateDoc(docSnap.ref, { status: 'failed_interrupted', error: 'Stuck in processing on startup (interrupted before completion)', sentAt: new Date().toISOString() });
                console.log(`[Log: failed] Startup-Cleanup: Processing message ${docSnap.id} marked as failed_interrupted.`);
            }
            staleCount++;
        }
        console.log(`[Startup] Cleanup finished. Cleaned ${staleCount} stale messages.`);
    } catch (e) {
        console.error('[Startup] Failed to cleanup stale messages:', e);
    }
};

const processQueue = async () => {
    if (isProcessingQueue || messageQueue.length === 0) return;
    isProcessingQueue = true;

    while (messageQueue.length > 0) {
        const task = messageQueue.shift();
        const { docId, phone: rawPhone, message, eventId, retryCount = 0 } = task;

        try {
            // Check if already sent
            const dedupKey = eventId ? `event_${eventId}` : `doc_${docId}`;
            if (sentMessagesCache.has(dedupKey)) {
                const timeSinceLastSendCache = Date.now() - sentMessagesCache.get(dedupKey);
                if (timeSinceLastSendCache < 24 * 60 * 60 * 1000) { // Same message within 24 hours
                    console.log(`[Log: duplicate-skipped] Skipping identical message. Key: ${dedupKey}`);
                    await updateDoc(doc(db, 'whatsapp_queue_v2', docId), { status: 'duplicate-skipped', sentAt: new Date().toISOString() });
                    continue;
                }
            }

            let phone = rawPhone.replace(/[^0-9]/g, '');
            if (phone.startsWith('07') && phone.length === 10) {
                phone = '962' + phone.substring(1);
            } else if (phone.startsWith('00962')) {
                phone = phone.substring(2);
            }
            
            const chatId = phone + '@c.us';
            
            // Startup Burst Limiter
            const timeSinceStartup = Date.now() - STARTUP_TIME;
            if (timeSinceStartup < STARTUP_BURST_WINDOW) {
                if (messagesSentSinceStartup >= MAX_STARTUP_BURST) {
                    console.log(`[BurstLimit] Reached max burst of ${MAX_STARTUP_BURST} in first 10 mins. Delaying sending.`);
                    const waitTime = STARTUP_BURST_WINDOW - timeSinceStartup;
                    await new Promise(resolve => setTimeout(resolve, waitTime));
                }
            }
            
            // Strict Rate Limiting wait
            const now = Date.now();
            const timeSinceLastSend = now - lastSentTime;
            if (timeSinceLastSend < RATE_LIMIT_DELAY) {
                const waitTime = RATE_LIMIT_DELAY - timeSinceLastSend;
                console.log(`[RateLimiter] Enforcing strict delay. Waiting ${waitTime}ms before sending to ${phone}...`);
                await new Promise(resolve => setTimeout(resolve, waitTime));
            }
            
            // Send via WAHA
            const response = await sendWahaRequest({ chatId: chatId, text: message, session: "default" });
            
            lastSentTime = Date.now();
            messagesSentSinceStartup++;
            
            // Cache for deduplication
            sentMessagesCache.set(dedupKey, Date.now());
            saveCacheToDisk();
            
            console.log(`[Log: sent] Message sent successfully to ${phone}. WAHA ID: ${response.body?.id || 'unknown'}`);
            await updateDoc(doc(db, 'whatsapp_queue_v2', docId), { 
                status: 'sent', 
                sentAt: new Date().toISOString(),
                wahaMessageId: response.body?.id || null 
            });
            
        } catch (error) {
            console.error(`[Log: failed] Failed to send to ${rawPhone}. Attempt ${retryCount + 1}:`, error.message);
            
            if (retryCount < 1) { // 1 extra retry allowed
                console.log(`[Retry] Pushing ${docId} back to queue for 1 extra retry.`);
                messageQueue.push({ ...task, retryCount: retryCount + 1 });
            } else {
                await updateDoc(doc(db, 'whatsapp_queue_v2', docId), { 
                    status: 'failed', 
                    error: error.message, 
                    sentAt: new Date().toISOString() 
                });
            }
        } finally {
            if (retryCount >= 1 || messageQueue.findIndex(t => t.docId === docId) === -1) {
                activeDocIds.delete(docId);
            }
        }
    }

    isProcessingQueue = false;
};

const listenToQueue = () => {
    console.log('Listening for pending messages in whatsapp_queue_v2 (WAHA Mode)...');
    const q = query(collection(db, 'whatsapp_queue_v2'), where('status', '==', 'pending'));

    onSnapshot(q, async (snapshot) => {
        snapshot.docChanges().forEach(async (change) => {
            if (change.type === 'added' || change.type === 'modified') {
                const data = change.doc.data();
                const docId = change.doc.id;
                
                if (data.status === 'pending') {
                    if (activeDocIds.has(docId)) return;

                    const ageMs = getMessageAge(data.createdAt);
                    if (ageMs > MAX_AGE_MS) {
                        activeDocIds.add(docId);
                        console.log(`[Log: expired] Discarding expired message (${docId}) - Age: ${Math.round(ageMs / 60000)} minutes`);
                        await updateDoc(doc(db, 'whatsapp_queue_v2', docId), { 
                            status: 'expired', 
                            error: 'Message expired (older than 10 minutes)', 
                            sentAt: new Date().toISOString() 
                        });
                        activeDocIds.delete(docId);
                        return;
                    }

                    if (!data.phone || !data.message) {
                        activeDocIds.add(docId);
                        console.log(`[Log: failed] Missing phone or message in doc ${docId}`);
                        await updateDoc(doc(db, 'whatsapp_queue_v2', docId), { status: 'failed', error: 'Missing phone or message', sentAt: new Date().toISOString() });
                        activeDocIds.delete(docId);
                        return;
                    }

                    activeDocIds.add(docId);
                    try {
                        const docRef = doc(db, 'whatsapp_queue_v2', docId);
                        await runTransaction(db, async (transaction) => {
                            const docSnap = await transaction.get(docRef);
                            if (!docSnap.exists() || docSnap.data().status !== 'pending') {
                                throw new Error('Already claimed');
                            }
                            transaction.update(docRef, { status: 'processing' });
                        });
                        
                        console.log(`[Log: processing] Document ${docId} claimed and added to queue.`);
                        messageQueue.push({ docId, phone: data.phone, message: data.message, eventId: data.eventId, retryCount: 0 });
                        processQueue();
                    } catch (err) {
                        console.error('[Queue Transaction Error]', docId, err);
                        activeDocIds.delete(docId);
                    }
                }
            }
        });
    });
};

// Start logic
cleanupStaleMessagesOnStartup().then(() => {
    listenToQueue();
});

// Status Endpoint
app.get('/api/whatsapp/status', (req, res) => {
    res.json({ status: connectionStatus });
});

// Fake Logout for backwards compatibility with Firebase commands
app.post('/api/whatsapp/logout', async (req, res) => {
    console.log("Logout triggered via API, ignoring because we use WAHA.");
    res.json({ success: true, message: "Handled by WAHA directly" });
});

onSnapshot(doc(db, 'whatsapp_config', 'status'), async (docSnap) => {
    if (docSnap.exists()) {
        const data = docSnap.data();
        if (data.command === 'LOGOUT') {
            try {
                await updateDoc(doc(db, 'whatsapp_config', 'status'), { command: '' }); // reset command immediately
            } catch(e) {}
        }
    }
});

const PORT = 3001;
app.listen(PORT, () => {
    console.log(`WhatsApp API server (WAHA Integration) is running on http://localhost:${PORT}`);
});

