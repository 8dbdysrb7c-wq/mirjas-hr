import { freeAuthAdmin } from './free_auth_admin.mjs';
process.on('uncaughtException', error => { console.error(String(error.message).slice(0, 600)); process.exit(1); });
const { db, auth, client } = await freeAuthAdmin();
const snapshot = await db.collection('employees').get();
const users = snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id }));
const ids = users.map(u => String(u.id).trim().toLowerCase());
const config = (await client.get('/admin/v2/projects/mirjaswork/config')).body;
const authUsers = await auth.listUsers(1000);
const collections = await db.listCollections();
const stock = await db.collection('stock').limit(50).get();
console.log(JSON.stringify({
  employees: users.length,
  accountsWithPassword: users.filter(u => typeof u.password === 'string' && u.password.length > 0).length,
  duplicateNormalizedIds: ids.length - new Set(ids).size,
  emailPasswordEnabled: config.signIn?.email?.enabled === true,
  existingAuthAccounts: authUsers.users.length,
  authHasMore: Boolean(authUsers.pageToken),
  collections: collections.map(c => c.id),
  stockFieldNames: [...new Set(stock.docs.flatMap(doc => Object.keys(doc.data())))],
}, null, 2));
await db.terminate();
