import os

server_code = """const express = require('express');
const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const cors = require('cors');
const { initializeApp } = require('firebase/app');
const { getFirestore, doc, setDoc, collection, onSnapshot, deleteDoc } = require('firebase/firestore');

// Firebase Config
const firebaseConfig = {
  apiKey: "AIzaSyDrTFkfeZr7F2UFhubaxt0s4_VNwYC5R8Q",
  authDomain: "mirjaswork.firebaseapp.com",
  projectId: "mirjaswork",
  storageBucket: "mirjaswork.firebasestorage.app",
  messagingSenderId: "742199978686",
  appId: "1:742199978686:web:6fc97d192fa99d8dd60cef",
  measurementId: "G-1D6XHXSKVG"
};

const appFb = initializeApp(firebaseConfig);
const db = getFirestore(appFb);

const app = express();
app.use(cors());
app.use(express.json());

const client = new Client({
    authStrategy: new LocalAuth(),
    puppeteer: {
        executablePath: 'C:\\\\Program Files\\\\Google\\\\Chrome\\\\Application\\\\chrome.exe',
        args: ['--no-sandbox', '--disable-setuid-sandbox'],
    }
});

let isClientReady = false;
let currentQR = '';
let connectionStatus = 'DISCONNECTED'; // DISCONNECTED, QR_READY, AUTHENTICATED, READY

const updateFirebaseStatus = async () => {
    try {
        await setDoc(doc(db, 'whatsapp_config', 'status'), {
            status: connectionStatus,
            qr: currentQR,
            updatedAt: new Date().toISOString()
        });
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
    updateFirebaseStatus();
});

client.on('ready', () => {
    console.log('Client is ready!');
    isClientReady = true;
    currentQR = '';
    connectionStatus = 'READY';
    updateFirebaseStatus();
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

// Listen to Firebase Queue
let isListeningToQueue = false;
const queueCollection = collection(db, 'whatsapp_queue');

onSnapshot(queueCollection, (snapshot) => {
    snapshot.docChanges().forEach(async (change) => {
        if (change.type === 'added') {
            const data = change.doc.data();
            if (data.status === 'pending') {
                if (!isClientReady) {
                    console.log('Message queued but client not ready yet.');
                    return;
                }
                let { phone, message } = data;
                if (!phone || !message) {
                    await deleteDoc(change.doc.ref);
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
                    console.log(`Message sent successfully from Firebase Queue to ${phone}`);
                    // Delete doc after success
                    await deleteDoc(change.doc.ref);
                } catch (error) {
                    console.error('Failed to send queued message:', error);
                }
            }
        }
    });
});

// Status Endpoint (Legacy)
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
"""

with open('whatsapp-server/server.js', 'w', encoding='utf-8') as f:
    f.write(server_code)

print("Server.js overwritten successfully")
