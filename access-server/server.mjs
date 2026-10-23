import { createServer } from 'node:http';
import { initializeApp, applicationDefault } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';
import { pathToFileURL } from 'node:url';
import { credentialId, verifyPassword, inScope, projectStock } from './security.mjs';
import { evaluateDraft, createAccessDraft, describeDraftChanges } from './shared/accessPolicy.js';

const projectId = process.env.ACCESS_PROJECT_ID || process.env.GCLOUD_PROJECT || process.env.GOOGLE_CLOUD_PROJECT;
if (!projectId) throw new Error('ACCESS_PROJECT_ID is required.');
initializeApp({ credential: applicationDefault(), projectId });
const db = getFirestore();
const auth = getAuth();
const fail = (status, message) => Object.assign(new Error(message), { status });
const reply = (res, status, value) => {
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' });
  res.end(JSON.stringify(value));
};
async function body(req) {
  if (req.rawBody) {
    if (req.rawBody.length > 100000) throw fail(413, 'الطلب كبير جدًا');
    try { return JSON.parse(req.rawBody.toString('utf8')); } catch { throw fail(400, 'طلب غير صالح'); }
  }
  let text = '';
  for await (const chunk of req) {
    text += chunk.toString();
    if (Buffer.byteLength(text) > 100000) throw fail(413, 'الطلب كبير جدًا');
  }
  try { return JSON.parse(text); } catch { throw fail(400, 'طلب غير صالح'); }
}
async function identity(req) {
  const token = /^Bearer (.+)$/.exec(req.headers.authorization || '')?.[1];
  if (!token) throw fail(401, 'يلزم تسجيل الدخول');
  let decoded;
  try { decoded = await auth.verifyIdToken(token, true); } catch { throw fail(401, 'انتهت الجلسة'); }
  const snapshot = await db.collection('access_identities').doc(decoded.uid).get();
  if (!snapshot.exists || snapshot.data().disabled !== false) throw fail(403, 'الحساب غير مفعّل');
  return { ...snapshot.data(), uid: decoded.uid };
}
async function login(req) {
  const input = await body(req);
  if (typeof input.employeeId !== 'string' || input.employeeId.length > 128) throw fail(401, 'بيانات الدخول غير صحيحة');
  const key = credentialId(input.employeeId);
  const rateRef = db.collection('access_login_limits').doc(key);
  // Transactional per-account rate limit is shared by all server instances.
  await db.runTransaction(async tx => {
    const snapshot = await tx.get(rateRef);
    const previous = snapshot.data();
    const now = Date.now();
    const current = previous?.until > now ? previous : { count: 0, until: now + 15 * 60000 };
    if (current.count >= 10) throw fail(429, 'محاولات كثيرة؛ حاول لاحقًا');
    tx.set(rateRef, { count: current.count + 1, until: current.until });
  });
  const snapshot = await db.collection('access_credentials').doc(key).get();
  const account = snapshot.data();
  const valid = await verifyPassword(input.password, account?.passwordHash);
  if (!valid || account?.disabled !== false || !account.uid) throw fail(401, 'بيانات الدخول غير صحيحة');
  const profile = await db.collection('access_identities').doc(account.uid).get();
  if (!profile.exists || profile.data().disabled !== false) throw fail(401, 'بيانات الدخول غير صحيحة');
  return { customToken: await auth.createCustomToken(account.uid) };
}
function validatePolicy(policy, userId) {
  const template = createAccessDraft({ id: userId }, false);
  if (policy?.version !== 1 || policy.userId !== userId || !policy.sections || Object.keys(policy.sections).length !== Object.keys(template.sections).length) throw fail(400, 'مسودة غير صالحة');
  for (const [key, sample] of Object.entries(template.sections)) {
    const section = policy.sections[key];
    if (!section || !['hidden', 'view', 'use', 'custom'].includes(section.mode) || !['self', 'team', 'department', 'all'].includes(section.scope)) throw fail(400, 'خيارات وصول غير صالحة');
    if (section.expiresAt && (!Number.isFinite(Date.parse(section.expiresAt)) || !section.expiresAt.endsWith('Z'))) throw fail(400, 'وقت انتهاء غير صالح');
    if (!Array.isArray(section.warehouses) || section.warehouses.some(w => !sample.warehouses.includes(w))) throw fail(400, 'مصنع غير صالح');
    for (const field of Object.keys(sample.fields)) if (typeof section.fields?.[field] !== 'boolean') throw fail(400, 'حقل غير صالح');
    for (const [screenId, actions] of Object.entries(sample.screens)) for (const action of Object.keys(actions)) {
      if (typeof section.screens?.[screenId]?.[action] !== 'boolean') throw fail(400, 'إجراء غير صالح');
    }
  }
}

export const accessHandler = async (req, res) => {
  try {
    if (process.env.ACCESS_API_ENABLED !== 'true') throw fail(503, 'خدمة صلاحيات المستخدمين قيد التجهيز');
    const path = new URL(req.url, 'http://localhost').pathname;
    if (req.method === 'POST' && path === '/login') return reply(res, 200, await login(req));
    const actor = await identity(req);
    if (req.method === 'GET' && path === '/me') return reply(res, 200, { employeeId: actor.employeeId, name: actor.name });
    const match = /^\/policies\/([a-zA-Z0-9_-]{1,128})$/.exec(path);
    if (match && actor.canManageAccess === true) {
      const ref = db.collection('access_policies').doc(match[1]);
      if (req.method === 'GET') return reply(res, 200, (await ref.get()).data() || null);
      if (req.method === 'PUT') {
        const { policy, expectedRevision } = await body(req);
        validatePolicy(policy, match[1]);
        if (policy.status !== 'draft') throw fail(400, 'حفظ المسودات فقط متاح خلال التجربة');
        const revision = await db.runTransaction(async tx => {
          const prior = (await tx.get(ref)).data();
          const revision = prior?.revision || 0;
          if (expectedRevision !== revision) throw fail(409, 'عُدّلت المسودة؛ أعد تحميلها');
          const next = { policy, revision: revision + 1, updatedAt: new Date().toISOString(), updatedBy: actor.uid };
          tx.set(ref, next);
          tx.create(db.collection('access_audit').doc(), { actorUid: actor.uid, employeeId: match[1], at: next.updatedAt, changes: describeDraftChanges(prior?.policy || null, policy), revision: next.revision });
          return next.revision;
        });
        return reply(res, 200, { revision });
      }
    }
    if (req.method === 'GET' && path === '/stock') {
      // Activation is intentionally unavailable over HTTP during parallel development.
      const stored = (await db.collection('access_policies').doc(actor.employeeId).get()).data();
      if (stored?.policy?.status !== 'active' || !evaluateDraft(stored.policy, 'inventory', 'stock_view', 'view')) throw fail(403, 'غير مسموح');
      const section = stored.policy.sections.inventory;
      const data = await db.collection('stock').limit(500).get();
      const records = data.docs.map(doc => ({ ...doc.data(), id: doc.id })).filter(record => inScope(section, actor, record)).map(record => projectStock(record, section.fields));
      return reply(res, 200, { records, truncated: data.size === 500 });
    }
    throw fail(403, 'المسار غير متاح في النظام التجريبي');
  } catch (error) { reply(res, error.status || 500, { error: error.status ? error.message : 'تعذر تنفيذ الطلب' }); }
};
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const server = createServer(accessHandler);
  server.requestTimeout = 15000;
  server.headersTimeout = 10000;
  server.listen(Number(process.env.PORT || 8080), '127.0.0.1');
}
