import { db } from '../firebase';
import { collection, addDoc, serverTimestamp, getDocs, query, orderBy } from 'firebase/firestore';

export const sendWhatsAppNotification = async (phone, message) => {
  if (!phone || !message) return false;
  
  try {
    // Write message request to Firestore Queue instead of sending directly to localhost.
    // This allows the live site (HTTPS) to send messages without Mixed Content errors.
    // The local Node.js server will listen to this collection and send the actual messages.
    await addDoc(collection(db, 'whatsapp_queue'), {
      phone,
      message,
      status: 'pending',
      createdAt: serverTimestamp()
    });
    
    return true;
  } catch (error) {
    console.error('Error adding message to WhatsApp queue in Firebase:', error);
    return false;
  }
};

export const getWhatsAppLogs = async () => {
  try {
    const q = query(collection(db, 'whatsapp_queue'), orderBy('createdAt', 'desc'), limit(500));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  } catch (error) {
    console.error('Error fetching WhatsApp logs:', error);
    return [];
  }
};

export const getWhatsAppLogsByDateRange = async (dateFrom, dateTo) => {
  try {
    const fromDate = new Date(dateFrom);
    fromDate.setHours(0, 0, 0, 0);
    const toDate = new Date(dateTo);
    toDate.setHours(23, 59, 59, 999);
    
    // Firestore serverTimestamp requires Date objects for comparison
    const q = query(
      collection(db, 'whatsapp_queue'), 
      where('createdAt', '>=', fromDate),
      where('createdAt', '<=', toDate),
      orderBy('createdAt', 'desc')
    );
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  } catch (error) {
    console.error('Error fetching WhatsApp logs by date:', error);
    return [];
  }
};
