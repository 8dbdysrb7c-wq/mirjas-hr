import { initializeApp } from 'firebase/app';
import { getFirestore, getDocFromServer, doc, terminate } from 'firebase/firestore';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { shouldArchiveStockVoucher } from '../src/utils/stockVoucherHistory.js';
const db = getFirestore(initializeApp({ apiKey: 'AIzaSyDrTFkfeZr7F2UFhubaxt0s4_VNwYC5R8Q', projectId: 'mirjaswork', appId: '1:742199978686:web:6fc97d192fa99d8dd60cef' }));
try {
  const backupFile = path.resolve(process.argv[2]);
  const backup = JSON.parse(await readFile(backupFile, 'utf8'));
  const selected = Object.entries(backup.collections.stock_vouchers).filter(([, v]) => shouldArchiveStockVoucher(v));
  const probe = await getDocFromServer(doc(db, 'stock_vouchers', selected[0][0]));
  console.log(JSON.stringify({ probeExists: probe.exists(), archiveId: probe.data()?.historyArchiveId || null, expectedArchiveId: path.basename(path.dirname(backupFile)) }));
} catch (error) { console.error(error.message); process.exitCode = 1; } finally { await terminate(db); }
