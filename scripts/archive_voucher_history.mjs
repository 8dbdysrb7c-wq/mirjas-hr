import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, doc, writeBatch, terminate } from 'firebase/firestore';
import { writeFile, readFile, mkdir } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import path from 'node:path';
import { shouldArchiveStockVoucher, ARCHIVABLE_VOUCHER_TYPES } from '../src/utils/stockVoucherHistory.js';

const app = initializeApp({ apiKey: 'AIzaSyDrTFkfeZr7F2UFhubaxt0s4_VNwYC5R8Q', projectId: 'mirjaswork', appId: '1:742199978686:web:6fc97d192fa99d8dd60cef' });
const db = getFirestore(app);
const canonical = value => {
  if (value === null || typeof value !== 'object') return value;
  if (typeof value.toJSON === 'function') return canonical(value.toJSON());
  if (Array.isArray(value)) return value.map(canonical);
  return Object.fromEntries(Object.keys(value).sort().map(key => [key, canonical(value[key])]));
};
const digest = value => createHash('sha256').update(JSON.stringify(canonical(value))).digest('hex');
const readCollection = async name => Object.fromEntries((await getDocs(collection(db, name))).docs.map(entry => [entry.id, entry.data()]));
const getState = async () => {
  const entries = await Promise.all(['stock', 'stock_vouchers', 'sales_orders'].map(async name => [name, await readCollection(name)]));
  return Object.fromEntries(entries);
};

async function main() {
  const mode = process.argv[2];
  if (mode === '--backup') {
    const state = await getState();
    const archiveId = new Date().toISOString().replace(/[:.]/g, '-');
    const folder = path.resolve('backups', `voucher-history-${archiveId}`);
    await mkdir(folder, { recursive: true });
    const backup = { schema: 'voucher-history-backup-v1', projectId: 'mirjaswork', createdAt: new Date().toISOString(), collections: canonical(state) };
    const output = path.join(folder, 'before.json');
    await writeFile(output, JSON.stringify(backup, null, 2), { flag: 'wx' });
    const verified = JSON.parse(await readFile(output, 'utf8'));
    if (digest(verified.collections) !== digest(state)) throw new Error('Backup verification failed');
    const selected = Object.values(state.stock_vouchers).filter(shouldArchiveStockVoucher);
    console.log(JSON.stringify({ backup: output, stockDocuments: Object.keys(state.stock).length, selected: Object.fromEntries(ARCHIVABLE_VOUCHER_TYPES.map(type => [type, selected.filter(v => v.type === type).length])), stockHash: digest(state.stock), backupVerified: true }));
    return;
  }
  if (mode !== '--apply' || !process.argv[3]) throw new Error('Use --backup, then --apply <verified-backup-path>');
  const backupFile = path.resolve(process.argv[3]);
  const backup = JSON.parse(await readFile(backupFile, 'utf8'));
  if (backup.schema !== 'voucher-history-backup-v1' || backup.projectId !== 'mirjaswork') throw new Error('Invalid backup');
  const before = backup.collections;
  const current = await getState();
  if (digest(before) !== digest(current)) throw new Error('Data changed since backup. No archive was applied; take a fresh backup.');
  const selected = Object.entries(before.stock_vouchers).filter(([, data]) => shouldArchiveStockVoucher(data));
  if (selected.length > 450) throw new Error('More than 450 vouchers; stop for a reviewed multi-batch archive.');
  const archivedAt = new Date().toISOString();
  const archiveId = path.basename(path.dirname(backupFile));
  console.log(JSON.stringify({ stage: 'preflight-verified', selected: selected.length }));
  // One atomic write batch avoids one read RPC per voucher. Each update touches
  // only the archive marker; all balance, item and ledger fields are preserved.
  if (selected.length) {
    const batch = writeBatch(db);
    for (const [id] of selected) batch.update(doc(db, 'stock_vouchers', id), { historyArchivedAt: archivedAt, historyArchiveId: archiveId });
    await batch.commit();
  }
  console.log(JSON.stringify({ stage: 'archive-committed', archiveId }));
  const after = await getState();
  const expectedVouchers = structuredClone(before.stock_vouchers);
  for (const [id] of selected) Object.assign(expectedVouchers[id], { historyArchivedAt: archivedAt, historyArchiveId: archiveId });
  const result = {
    archiveId, archivedAt, archived: selected.length,
    byType: Object.fromEntries(ARCHIVABLE_VOUCHER_TYPES.map(type => [type, selected.filter(([, v]) => v.type === type).length])),
    stockDocumentsBefore: Object.keys(before.stock).length, stockDocumentsAfter: Object.keys(after.stock).length,
    stockUnchanged: digest(before.stock) === digest(after.stock),
    salesOrdersUnchanged: digest(before.sales_orders) === digest(after.sales_orders),
    onlyArchiveMetadataChanged: digest(expectedVouchers) === digest(after.stock_vouchers),
    remainingVisible: Object.values(after.stock_vouchers).filter(shouldArchiveStockVoucher).length,
    stockHashBefore: digest(before.stock), stockHashAfter: digest(after.stock),
  };
  await writeFile(path.join(path.dirname(backupFile), 'verification.json'), JSON.stringify(result, null, 2), { flag: 'wx' });
  console.log(JSON.stringify(result));
  if (!result.stockUnchanged || !result.salesOrdersUnchanged || !result.onlyArchiveMetadataChanged) throw new Error('Post-archive comparison detected another change. Do not restore stock automatically; review verification report.');
}
try { await main(); } catch (error) { console.error(error.message); process.exitCode = 1; } finally { await terminate(db); }
