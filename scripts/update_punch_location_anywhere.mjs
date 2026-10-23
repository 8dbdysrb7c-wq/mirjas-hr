import { readFileSync, writeFileSync } from 'node:fs';
import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, doc, runTransaction } from 'firebase/firestore';

const source = readFileSync('src/firebase.js', 'utf8');
const config = Object.fromEntries([...source.matchAll(/(apiKey|authDomain|projectId|appId):\s*"([^"]+)"/g)].map(m => [m[1], m[2]]));
const db = getFirestore(initializeApp(config));

// Target employees to allow punching from anywhere:
// 1. جهاد بركات فلاح المهيرات (EMP-0007)
// 2. عماد فتحي زياد عزيز عوض (EMP-0025)
// 3. أماني يونس صالح وادي (EMP-0013)
// 4. البراء محمد سمير علي لعبود (EMP-0005)

const targetIds = ['EMP-0005', 'EMP-0007', 'EMP-0013', 'EMP-0025'];
const timestamp = new Date().toISOString();

console.log('Fetching documents for target employees...');

const result = await runTransaction(db, async (tx) => {
  const auditRef = doc(collection(db, 'hr_audit_logs'));
  
  // 1. Read existing records from employees collection
  const empSnapshots = await Promise.all(
    targetIds.map(id => tx.get(doc(db, 'employees', id)))
  );

  // 2. Read existing records from users collection
  const userSnapshots = await Promise.all(
    targetIds.map(id => tx.get(doc(db, 'users', id)))
  );

  const changes = [];

  // Now execute all writes
  for (let i = 0; i < targetIds.length; i++) {
    const snap = empSnapshots[i];
    const id = targetIds[i];
    if (!snap.exists()) {
      throw new Error(`Employee ${id} not found in employees collection!`);
    }
    const data = snap.data();
    changes.push({
      id,
      name: data.name,
      previousWorkLocationId: data.workLocationId || '',
      previousAllowedWorkLocations: data.allowedWorkLocations || [],
      newWorkLocationId: 'anywhere',
      newAllowedWorkLocations: ['anywhere']
    });

    // Update employee document
    tx.update(snap.ref, {
      workLocationId: 'anywhere',
      allowedWorkLocations: ['anywhere'],
      updatedAt: timestamp
    });
  }

  for (let i = 0; i < targetIds.length; i++) {
    const snap = userSnapshots[i];
    if (snap.exists()) {
      tx.update(snap.ref, {
        workLocationId: 'anywhere',
        allowedWorkLocations: ['anywhere'],
        updatedAt: timestamp
      });
      console.log(`Also found and updating user record for ${targetIds[i]}`);
    }
  }

  // 3. Save HR audit log
  tx.set(auditRef, {
    date: '2026-10-17',
    timestamp,
    user: 'المدير العام',
    action: 'تفعيل خيار السماح بالبصمة من أي مكان لموظفين محددين',
    description: 'تم ضبط موقع البصمة إلى "السماح بالبصمة من أي مكان (بدون قيود)" للموظفين: جهاد، عماد، أماني، البراء.',
    changes
  });

  return changes;
});

console.log('Successfully updated employees in Firestore:');
console.log(JSON.stringify(result, null, 2));

// Verify the update
const verifyDocs = await Promise.all(targetIds.map(id => txDocVerify(db, id)));
async function txDocVerify(db, id) {
  const { getDoc } = await import('firebase/firestore');
  const d = await getDoc(doc(db, 'employees', id));
  return {
    id: d.id,
    name: d.data().name,
    workLocationId: d.data().workLocationId,
    allowedWorkLocations: d.data().allowedWorkLocations
  };
}

console.log('Verification:');
console.log(JSON.stringify(verifyDocs, null, 2));

writeFileSync('artifacts/update-anywhere-result.json', JSON.stringify({ result, verifyDocs, timestamp }, null, 2));
process.exit(0);
