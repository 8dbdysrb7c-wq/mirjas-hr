import { db } from '../src/firebase.js';
import { doc, getDoc, setDoc } from 'firebase/firestore';

async function forceEnableSound() {
  const docRef = doc(db, 'settings', 'globalSettings');
  const docSnap = await getDoc(docRef);
  
  if (docSnap.exists()) {
    const data = docSnap.data().value;
    const notificationSettings = data.notificationSettings || {};
    
    console.log('Current soundEnabled:', notificationSettings.soundEnabled);
    
    const newData = {
      ...data,
      notificationSettings: {
        ...notificationSettings,
        soundEnabled: true
      }
    };
    
    await setDoc(docRef, { value: newData });
    console.log('Successfully enabled sound for all users.');
  } else {
    console.log('Global settings doc not found.');
  }
  process.exit(0);
}

forceEnableSound();
