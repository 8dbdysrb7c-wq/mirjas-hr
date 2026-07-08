const express = require('express');
const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const cors = require('cors');

// Firebase Web SDK for listening
const { initializeApp } = require('firebase/app');
const { getFirestore, collection, query, where, onSnapshot, doc, updateDoc, setDoc, getDocs, runTransaction } = require('firebase/firestore');

const firebaseConfig = {
    apiKey: "AIzaSyDrTFkfeZr7F2UFhubaxt0s4_VNwYC5R8Q",
    projectId: "mirjaswork",
};
const firebaseApp = initializeApp(firebaseConfig);
const db = getFirestore(firebaseApp);

// REST API Config for writing status (bypass node polyfill issues)
const API_KEY = "AIzaSyDrTFkfeZr7F2UFhubaxt0s4_VNwYC5R8Q";
const PROJECT_ID = "mirjaswork";
const STATUS_URL = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents/whatsapp_config/status?key=${API_KEY}`;

const app = express();
app.use(cors());
app.use(express.json());

const client = new Client({
    authStrategy: new LocalAuth({ clientId: 'mirjas_session_8' }),
    puppeteer: {
        executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
        args: ['--no-sandbox', '--disable-setuid-sandbox'],
    }
});

let isClientReady = false;
let currentQR = '';
let connectionStatus = 'DISCONNECTED'; 

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

client.on('qr', (qr) => {
    currentQR = qr;
    connectionStatus = 'QR_READY';
    qrcode.generate(qr, { small: true });
    console.log('================================================================');
    console.log('SCAN THE QR CODE ABOVE WITH WHATSAPP TO LOG IN');
    console.log('================================================================');
    updateFirebaseStatus('QR_READY', qr);
});

client.on('ready', () => {
    console.log('Client is ready!');
    isClientReady = true;
    currentQR = '';
    connectionStatus = 'READY';
    updateFirebaseStatus('READY');

    const fs = require('fs');
    const path = require('path');
    const cacheFile = path.join(__dirname, 'dedup_cache.json');
    
    // Strict Rate Limiting and Deduplication State
    const messageQueue = [];
    const activeDocIds = new Set();
    let isProcessingQueue = false;
    let lastSentTime = 0; // Timestamp of the last sent message
    let sentMessagesCache = new Map(); // phone_message => timestamp
    
    // Load cache from disk
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

    const DEDUPLICATION_TTL = 12 * 60 * 60 * 1000; // 12 hours
    const RATE_LIMIT_DELAY = 10000; // 10 seconds

    // Garbage collection for cache every hour
    setInterval(() => {
        const now = Date.now();
        let changed = false;
        for (const [key, timestamp] of sentMessagesCache.entries()) {
            if (now - timestamp > DEDUPLICATION_TTL) {
                sentMessagesCache.delete(key);
                changed = true;
            }
        }
        if (changed) saveCacheToDisk();
    }, 60 * 60 * 1000);

    const processQueue = async () => {
        if (isProcessingQueue || messageQueue.length === 0) return;
        isProcessingQueue = true;

        while (messageQueue.length > 0) {
            const task = messageQueue.shift();
            const { docId, phone: rawPhone, message } = task;

            try {
                let phone = rawPhone.replace(/[^0-9]/g, '');
                if (phone.startsWith('07') && phone.length === 10) {
                    phone = '962' + phone.substring(1);
                } else if (phone.startsWith('00962')) {
                    phone = phone.substring(2);
                }
                
                const cacheKey = `${phone}_${Buffer.from(message).toString('base64')}`;
                
                // 1. Deduplication check
                if (sentMessagesCache.has(cacheKey)) {
                    console.log(`[Deduplication] Skipped duplicate message to ${phone}`);
                    await updateDoc(doc(db, 'whatsapp_queue_v2', docId), { status: 'skipped_duplicate', sentAt: new Date().toISOString() });
                    activeDocIds.delete(docId);
                    continue; // Skip rate limiter delay for skipped messages
                }

                const chatId = phone + '@c.us';
                
                // 2. Strict Rate Limiting wait
                const now = Date.now();
                const timeSinceLastSend = now - lastSentTime;
                if (timeSinceLastSend < RATE_LIMIT_DELAY) {
                    const waitTime = RATE_LIMIT_DELAY - timeSinceLastSend;
                    console.log(`[RateLimiter] Enforcing strict delay. Waiting ${waitTime}ms before sending to ${phone}...`);
                    await new Promise(resolve => setTimeout(resolve, waitTime));
                }

                // 3. Add to deduplication cache BEFORE sending (to handle concurrent fail cases safely)
                sentMessagesCache.set(cacheKey, Date.now());
                saveCacheToDisk();
                
                // 4. Send Message
                await client.sendMessage(chatId, message);
                lastSentTime = Date.now(); // Update last sent time immediately after sending
                
                console.log(`[Success] Message sent successfully to ${phone}`);
                await updateDoc(doc(db, 'whatsapp_queue_v2', docId), { status: 'sent', sentAt: new Date().toISOString() });
            } catch (error) {
                console.error('[Error] Failed to send queued message:', error);
                await updateDoc(doc(db, 'whatsapp_queue_v2', docId), { status: 'failed', error: error.message, sentAt: new Date().toISOString() });
            } finally {
                activeDocIds.delete(docId);
            }
        }

        isProcessingQueue = false;
    };

    console.log('Listening for pending messages in whatsapp_queue_v2...');
    const q = query(collection(db, 'whatsapp_queue_v2'), where('status', '==', 'pending'));
    
    onSnapshot(q, async (snapshot) => {
        snapshot.docChanges().forEach(async (change) => {
            if (change.type === 'added' || change.type === 'modified') {
                const data = change.doc.data();
                const docId = change.doc.id;
                
                if (data.status === 'pending') {
                    if (activeDocIds.has(docId)) return;

                    if (!data.phone || !data.message) {
                        activeDocIds.add(docId);
                        await updateDoc(doc(db, 'whatsapp_queue_v2', docId), { status: 'failed', error: 'Missing phone or message', sentAt: new Date().toISOString() });
                        activeDocIds.delete(docId);
                        return;
                    }

                    // Immediately claim the document using a transaction to prevent race conditions with zombie servers
                    activeDocIds.add(docId);
                    try {
                        const docRef = doc(db, 'whatsapp_queue_v2', docId);
                        await runTransaction(db, async (transaction) => {
                            const docSnap = await transaction.get(docRef);
                            if (!docSnap.exists() || docSnap.data().status !== 'pending') {
                                throw new Error('Already claimed by another process');
                            }
                            transaction.update(docRef, { status: 'processing' });
                        });
                        
                        // Push to our local queue
                        messageQueue.push({ docId, phone: data.phone, message: data.message });
                        console.log(`Added message to queue. Queue size: ${messageQueue.length}`);
                        
                        // Trigger processing
                        processQueue();
                    } catch (err) {
                        console.log(`[Queue] Document ${docId} skipped: ${err.message}`);
                        activeDocIds.delete(docId); // allow retry
                    }
                }
            }
        });
    });
});

client.on('authenticated', () => {
    console.log('AUTHENTICATED SUCCESSFULLY');
    currentQR = '';
    connectionStatus = 'AUTHENTICATED';
    updateFirebaseStatus('AUTHENTICATED');
});

client.on('auth_failure', msg => {
    console.error('AUTHENTICATION FAILURE', msg);
    connectionStatus = 'DISCONNECTED';
    updateFirebaseStatus('DISCONNECTED');
});

client.on('disconnected', (reason) => {
    console.log('Client was logged out', reason);
    isClientReady = false;
    currentQR = '';
    connectionStatus = 'DISCONNECTED';
    updateFirebaseStatus('DISCONNECTED');
});

client.initialize();
updateFirebaseStatus('DISCONNECTED');

// Listen for LOGOUT command from Firebase
onSnapshot(doc(db, 'whatsapp_config', 'status'), async (docSnap) => {
    if (docSnap.exists()) {
        const data = docSnap.data();
        if (data.command === 'LOGOUT') {
            console.log('Received LOGOUT command from Firebase');
            try {
                await updateDoc(doc(db, 'whatsapp_config', 'status'), { command: '' }); // reset command immediately
            } catch(e) {}
            
            if (isClientReady) {
                try {
                    await client.logout();
                    console.log('Client logged out successfully via Firebase command.');
                } catch(err) {
                    console.error('Error logging out:', err);
                }
            } else {
                console.log('Client is not ready, ignoring active logout execution');
            }
            
            isClientReady = false;
            currentQR = '';
            connectionStatus = 'DISCONNECTED';
            updateFirebaseStatus('DISCONNECTED');
            console.log('Please restart the Node.js server manually to log in again.');
        }
    }
});


// Status Endpoint (Legacy fallback)
app.get('/api/whatsapp/status', (req, res) => {
    res.json({ status: connectionStatus, qr: currentQR });
});

// Logout Endpoint
app.post('/api/whatsapp/logout', async (req, res) => {
    try {
        await client.logout();
        isClientReady = false;
        currentQR = '';
        connectionStatus = 'DISCONNECTED';
        updateFirebaseStatus('DISCONNECTED');
        res.json({ success: true });
        client.initialize();
    } catch(err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

const PORT = 3001;
app.listen(PORT, () => {
    console.log(`WhatsApp API server is running on http://localhost:${PORT}`);
});
