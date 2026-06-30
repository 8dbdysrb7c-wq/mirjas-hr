const express = require('express');
const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const cors = require('cors');

// Firebase Web SDK for listening
const { initializeApp } = require('firebase/app');
const { getFirestore, collection, query, where, onSnapshot, doc, updateDoc, setDoc, getDocs } = require('firebase/firestore');

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
    authStrategy: new LocalAuth(),
    puppeteer: {
        executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
        args: ['--no-sandbox', '--disable-setuid-sandbox'],
    }
});

let isClientReady = false;
let currentQR = '';
let connectionStatus = 'DISCONNECTED'; 

const updateFirebaseStatus = async () => {
    try {
        const payload = {
            fields: {
                status: { stringValue: connectionStatus },
                qr: { stringValue: currentQR },
                updatedAt: { stringValue: new Date().toISOString() }
            }
        };
        await fetch(STATUS_URL, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
    } catch(err) {
        console.error('Failed to sync status to Firebase via REST:', err);
    }
};

client.on('qr', (qr) => {
    currentQR = qr;
    connectionStatus = 'QR_READY';
    qrcode.generate(qr, { small: true });
    console.log('================================================================');
    console.log('SCAN THE QR CODE ABOVE WITH WHATSAPP TO LOG IN');
    console.log('================================================================');
    updateFirebaseStatus();
});

client.on('ready', () => {
    console.log('Client is ready!');
    isClientReady = true;
    currentQR = '';
    connectionStatus = 'READY';
    updateFirebaseStatus();

    // Start listening to the queue ONLY when client is ready
    console.log('Listening for pending messages in whatsapp_queue...');
    const q = query(collection(db, 'whatsapp_queue'), where('status', '==', 'pending'));
    onSnapshot(q, async (snapshot) => {
        snapshot.docChanges().forEach(async (change) => {
            if (change.type === 'added' || change.type === 'modified') {
                const data = change.doc.data();
                const docId = change.doc.id;
                
                if (data.status === 'pending') {
                    let phone = data.phone || '';
                    let message = data.message || '';
                    
                    if (!phone || !message) {
                        await updateDoc(doc(db, 'whatsapp_queue', docId), { status: 'failed', error: 'Missing phone or message', sentAt: new Date().toISOString() });
                        return;
                    }
                    
                    try {
                        phone = phone.replace(/[^0-9]/g, '');
                        if (phone.startsWith('07') && phone.length === 10) {
                            phone = '962' + phone.substring(1);
                        } else if (phone.startsWith('00962')) {
                            phone = phone.substring(2);
                        }
                        const chatId = phone + '@c.us';
                        
                        await client.sendMessage(chatId, message);
                        console.log(`Message sent successfully to ${phone}`);
                        
                        // Mark as sent to keep as log
                        await updateDoc(doc(db, 'whatsapp_queue', docId), { status: 'sent', sentAt: new Date().toISOString() });
                    } catch (error) {
                        console.error('Failed to send queued message:', error);
                        await updateDoc(doc(db, 'whatsapp_queue', docId), { status: 'failed', error: error.message, sentAt: new Date().toISOString() });
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
    updateFirebaseStatus();
});

client.on('auth_failure', msg => {
    console.error('AUTHENTICATION FAILURE', msg);
    connectionStatus = 'DISCONNECTED';
    updateFirebaseStatus();
});

client.on('disconnected', (reason) => {
    console.log('Client was logged out', reason);
    isClientReady = false;
    currentQR = '';
    connectionStatus = 'DISCONNECTED';
    updateFirebaseStatus();
});

client.initialize();
updateFirebaseStatus();

// Listen for LOGOUT command from Firebase
onSnapshot(doc(db, 'whatsapp_config', 'status'), async (docSnap) => {
    if (docSnap.exists()) {
        const data = docSnap.data();
        if (data.command === 'LOGOUT') {
            console.log('Received LOGOUT command from Firebase');
            try {
                await updateDoc(doc(db, 'whatsapp_config', 'status'), { command: '' }); // reset command
            } catch(e) {}
            
            try {
                await client.logout();
                console.log('Client logged out successfully via Firebase command.');
            } catch(err) {
                console.error('Error logging out:', err);
            }
            
            isClientReady = false;
            currentQR = '';
            connectionStatus = 'DISCONNECTED';
            updateFirebaseStatus();
            try {
                client.initialize();
            } catch(e) {}
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
        updateFirebaseStatus();
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
