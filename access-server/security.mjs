import { randomBytes, scrypt as scryptCallback, timingSafeEqual, createHash } from 'node:crypto';
import { promisify } from 'node:util';
const scrypt = promisify(scryptCallback);
export const credentialId = id => createHash('sha256').update(String(id).trim().toLowerCase()).digest('hex');
export async function hashPassword(password) {
  if (typeof password !== 'string' || password.length < 8 || password.length > 256) throw new Error('Password must contain 8–256 characters');
  const salt = randomBytes(16).toString('hex');
  const derived = await scrypt(password, salt, 64);
  return `scrypt:${salt}:${derived.toString('hex')}`;
}
export async function verifyPassword(password, stored) {
  const valid = typeof password === 'string' && password.length <= 256 && /^scrypt:[a-f0-9]{32}:[a-f0-9]{128}$/.test(stored || '');
  const [, salt, expected] = valid ? stored.split(':') : ['scrypt', '0'.repeat(32), '0'.repeat(128)];
  const actual = await scrypt(valid ? password : '', salt, 64);
  return timingSafeEqual(actual, Buffer.from(expected, 'hex')) && valid;
}
export function inScope(section, identity, record) {
  if (section.warehouses && !section.warehouses.includes(record.warehouse)) return false;
  if (section.scope === 'all') return true;
  if (section.scope === 'self') return Boolean(identity.employeeId) && record.ownerId === identity.employeeId;
  if (section.scope === 'team') return Boolean(identity.teamId) && record.teamId === identity.teamId;
  if (section.scope === 'department') return Boolean(identity.departmentId) && record.departmentId === identity.departmentId;
  return false;
}
// Explicit allowlist: unknown or nested fields never leave the server.
export function projectStock(record, fields) {
  const result = {};
  for (const key of ['id', 'itemNumber', 'itemCode', 'name', 'category', 'warehouse', 'location', 'spec', 'unit']) {
    if (['string', 'number'].includes(typeof record[key])) result[key] = record[key];
  }
  for (const [permission, key] of Object.entries({ quantity: 'quantity', reserved: 'reservedQuantity', available: 'availableQuantity', minimum: 'minLimit', cost: 'cost', purchasePrice: 'purchasePrice', salePrice: 'salePrice', margin: 'margin' })) {
    if (fields?.[permission] === true && typeof record[key] === 'number' && Number.isFinite(record[key])) result[key] = record[key];
  }
  return result;
}
