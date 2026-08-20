const { initializeApp } = require('firebase/app');
const { initializeFirestore, doc, getDoc, updateDoc } = require('firebase/firestore');

const app = initializeApp({
  apiKey: 'AIzaSyDrTFkfeZr7F2UFhubaxt0s4_VNwYC5R8Q',
  projectId: 'mirjaswork',
});
const db = initializeFirestore(app, {});
const ids = ['YW0lBfHDgxNUvMpGIKPg', 'BGErNz2gBpIrkRI0IXdS'];
const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function normalizePhone(rawPhone) {
  let phone = String(rawPhone || '').replace(/[^0-9]/g, '');
  if (phone.startsWith('07') && phone.length === 10) phone = `962${phone.slice(1)}`;
  if (phone.startsWith('00962')) phone = phone.slice(2);
  return phone;
}

async function main() {
  const apiKey = process.env.WAHA_API_KEY;
  if (!apiKey) throw new Error('WAHA_API_KEY is missing');

  for (let index = 0; index < ids.length; index += 1) {
    const id = ids[index];
    const ref = doc(db, 'whatsapp_queue_v2', id);
    const snapshot = await getDoc(ref);
    if (!snapshot.exists()) throw new Error(`Message ${id} does not exist`);

    const data = snapshot.data();
    if (!['pending', 'failed'].includes(data.status)) {
      throw new Error(`Message ${id} has unexpected status ${data.status}`);
    }

    const phone = normalizePhone(data.phone);
    await updateDoc(ref, { status: 'processing', error: null });

    try {
      const response = await fetch('http://127.0.0.1:3000/api/sendText', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Api-Key': apiKey,
        },
        body: JSON.stringify({
          chatId: `${phone}@c.us`,
          text: data.message,
          session: 'default',
        }),
      });
      const bodyText = await response.text();
      if (!response.ok) throw new Error(`WAHA ${response.status}: ${bodyText}`);

      let body = {};
      try { body = JSON.parse(bodyText); } catch (_) {}
      const sentAt = new Date().toISOString();
      await updateDoc(ref, {
        status: 'sent',
        sentAt,
        error: null,
        wahaMessageId: body.id || body.key?.id || null,
      });
      console.log(JSON.stringify({ id, phone, status: 'sent', sentAt, wahaMessageId: body.id || body.key?.id || null }));
    } catch (error) {
      await updateDoc(ref, {
        status: 'failed',
        sentAt: new Date().toISOString(),
        error: error.message,
      });
      throw error;
    }

    if (index < ids.length - 1) await delay(35000);
  }
}

main().then(() => process.exit(0)).catch((error) => {
  console.error(error);
  process.exit(1);
});
