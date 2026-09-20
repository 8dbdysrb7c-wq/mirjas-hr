import { initializeApp, deleteApp } from 'firebase/app';
import { getAuth, signInWithEmailAndPassword, signOut, onAuthStateChanged, createUserWithEmailAndPassword, updatePassword } from 'firebase/auth';
import { doc, getDoc, onSnapshot, writeBatch, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase';
import { employeeLoginKey, removePasswordFields, directoryProfile } from '../utils/freeAuthIdentity';

// Enabled only in the validated cutover build after account import and rules tests.
export const FREE_AUTH_ENABLED = import.meta.env.VITE_FREE_AUTH_ENABLED === 'true';
export const firebaseAuth = FREE_AUTH_ENABLED ? getAuth(db.app) : null;
let trustedProfile = null;
export const getTrustedProfile = () => trustedProfile;

async function loadProfile(authUser) {
  const account = await getDoc(doc(db, 'access_accounts', authUser.uid));
  if (!account.exists() || account.data().enabled !== true) throw new Error('الحساب غير مفعّل');
  const identity = account.data();
  const profile = await getDoc(doc(db, 'employees', identity.employeeId));
  if (!profile.exists() || profile.data().authUid !== authUser.uid || profile.data().isActive === false) throw new Error('الحساب غير مفعّل');
  return { ...removePasswordFields(profile.data()), id: identity.employeeId, authUid: authUser.uid, accessAdmin: identity.isAdmin === true };
}

export async function loginEmployee(employeeId, password) {
  const loginKey = await employeeLoginKey(employeeId);
  const mapping = await getDoc(doc(db, 'access_logins', loginKey));
  if (!mapping.exists()) throw new Error('رقم الموظف أو كلمة المرور غير صحيحة');
  try {
    const result = await signInWithEmailAndPassword(firebaseAuth, mapping.data().email, password);
    trustedProfile = await loadProfile(result.user);
    return trustedProfile;
  } catch {
    await signOut(firebaseAuth);
    trustedProfile = null;
    throw new Error('رقم الموظف أو كلمة المرور غير صحيحة أو الحساب غير مفعّل');
  }
}

export function observeEmployeeSession(callback) {
  let stopAccount = () => {};
  let stopProfile = () => {};
  let generation = 0;
  const stopAuth = onAuthStateChanged(firebaseAuth, async authUser => {
    const current = ++generation;
    stopAccount(); stopProfile(); trustedProfile = null;
    if (!authUser) { callback(null); return; }
    try {
      const loaded = await loadProfile(authUser);
      if (generation !== current) return;
      trustedProfile = loaded; callback(loaded);
      stopAccount = onSnapshot(doc(db, 'access_accounts', authUser.uid), snapshot => {
        if (!snapshot.exists() || snapshot.data().enabled !== true) logoutEmployee();
      }, () => logoutEmployee());
      stopProfile = onSnapshot(doc(db, 'employees', loaded.id), snapshot => {
        if (!snapshot.exists() || snapshot.data().authUid !== authUser.uid || snapshot.data().isActive === false) { logoutEmployee(); return; }
        trustedProfile = { ...removePasswordFields(snapshot.data()), id: loaded.id, authUid: authUser.uid, accessAdmin: loaded.accessAdmin };
        callback(trustedProfile);
      }, () => logoutEmployee());
    } catch { if (generation === current) { await signOut(firebaseAuth); callback(null); } }
  });
  return () => { generation++; stopAuth(); stopAccount(); stopProfile(); };
}

export async function logoutEmployee() {
  trustedProfile = null;
  localStorage.removeItem('currentUser');
  await signOut(firebaseAuth);
}

// Free account administration uses a secondary Auth instance; the admin's own
// login remains intact. Firestore rules alone decide whether it can be linked.
export async function provisionEmployeeAccount(employee, password) {
  if (!trustedProfile?.accessAdmin) throw new Error('يلزم حساب مدير لإدارة الدخول');
  if (typeof password !== 'string' || password.length < 6) throw new Error('كلمة المرور الجديدة يجب أن تكون 6 أحرف على الأقل');
  if (employee.id === trustedProfile.id) {
    await updatePassword(firebaseAuth.currentUser, password);
    return { authUid: firebaseAuth.currentUser.uid };
  }
  const loginKey = await employeeLoginKey(employee.id);
  const secondary = initializeApp(db.app.options, `employee-provision-${crypto.randomUUID()}`);
  const secondaryAuth = getAuth(secondary);
  try {
    const email = `${loginKey.slice(0, 40)}.${crypto.randomUUID().slice(0, 8)}@accounts.mirjaswork.web.app`;
    const { user } = await createUserWithEmailAndPassword(secondaryAuth, email, password);
    const existing = await getDoc(doc(db, 'employees', employee.id));
    const before = existing.data();
    const oldAccount = before?.authUid ? (await getDoc(doc(db, 'access_accounts', before.authUid))).data() : null;
    const profile = { ...removePasswordFields(employee), authUid: user.uid };
    const batch = writeBatch(db);
    batch.set(doc(db, 'employees', employee.id), profile);
    batch.set(doc(db, 'employee_directory', employee.id), directoryProfile(profile));
    batch.set(doc(db, 'access_logins', loginKey), { email });
    batch.set(doc(db, 'access_accounts', user.uid), { employeeId: employee.id, enabled: true, isAdmin: oldAccount?.isAdmin === true });
    if (before?.authUid) batch.update(doc(db, 'access_accounts', before.authUid), { enabled: false });
    batch.set(doc(db, 'access_account_audit', crypto.randomUUID()), { employeeId: employee.id, actorUid: firebaseAuth.currentUser.uid, action: before ? 'replace-login' : 'create-login', at: serverTimestamp() });
    try { await batch.commit(); } catch (error) { await user.delete().catch(() => {}); throw error; }
    return { authUid: user.uid };
  } finally { await signOut(secondaryAuth); await deleteApp(secondary); }
}
