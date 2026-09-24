import { randomBytes, pbkdf2Sync } from 'node:crypto';
import { freeAuthAdmin } from './free_auth_admin.mjs';
import { employeeLoginKey, normalizeEmployeeId } from '../src/utils/freeAuthIdentity.js';

process.on('uncaughtException', error => { console.error(String(error.message).slice(0, 600)); process.exit(1); });
if (!process.argv.includes('--prepare')) throw new Error('Run the read-only audit first. --prepare explicitly provisions the free Auth accounts.');
const { db, auth, client } = await freeAuthAdmin();
try {
  const docs = (await db.collection('employees').get()).docs;
  const employees = docs.map(doc => ({ ...doc.data(), id: doc.id }));
  if (new Set(employees.map(e => normalizeEmployeeId(e.id))).size !== employees.length) throw new Error('Duplicate normalized IDs must be resolved before import');
  const accounts = [];
  for (const employee of employees) {
    const key = await employeeLoginKey(employee.id);
    const uid = `employee_${key.slice(0, 48)}`;
    let existing;
    try { existing = await auth.getUser(uid); }
    catch (error) { if (error.code !== 'auth/user-not-found') throw error; }
    if (!existing && (typeof employee.password !== 'string' || !employee.password)) throw new Error('A legacy account has no usable password; no accounts were imported');
    const email = `${key.slice(0, 48)}@accounts.mirjaswork.web.app`;
    if (existing && existing.email !== email) throw new Error('Existing Firebase account collision; import stopped');
    accounts.push({ employee, key, uid, email, exists: Boolean(existing) });
  }
  const config = (await client.get('/admin/v2/projects/mirjaswork/config')).body;
  if (config.signIn?.email?.enabled !== true) {
    await client.patch('/admin/v2/projects/mirjaswork/config', { signIn: { email: { enabled: true, passwordRequired: true } } }, { queryParams: { updateMask: 'signIn.email.enabled,signIn.email.passwordRequired' } });
  }
  const pending = accounts.filter(account => !account.exists).map(({ uid, email, employee }) => {
    const salt = randomBytes(16);
    return { uid, email, displayName: employee.name || employee.id, passwordSalt: salt, passwordHash: pbkdf2Sync(employee.password, salt, 100000, 32, 'sha256'), disabled: employee.isActive === false };
  });
  for (let offset = 0; offset < pending.length; offset += 100) {
    const result = await auth.importUsers(pending.slice(offset, offset + 100), { hash: { algorithm: 'PBKDF2_SHA256', rounds: 100000 } });
    if (result.failureCount) throw new Error(`Firebase import rejected ${result.failureCount} accounts; original accounts are unchanged`);
  }
  // No profile or login data is written until the protected-rules checkpoint.
  // Auth preparation is reversible and does not remove the legacy passwords.
  console.log(JSON.stringify({ preparedAuthAccounts: pending.length, existingAuthAccounts: accounts.length - pending.length, legacyLoginUnchanged: true, next: 'verify imported credentials and protected Firestore rules before linking accounts or deleting passwords' }));
} finally { await db.terminate(); }
