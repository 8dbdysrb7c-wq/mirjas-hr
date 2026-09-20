export function normalizeEmployeeId(value) {
  const id = String(value ?? '').trim().toLowerCase();
  if (!id || id.length > 128) throw new Error('رقم الموظف غير صالح');
  return id;
}

// This is an internal login alias, never a contact address or password secret.
export async function employeeLoginKey(value) {
  const data = new TextEncoder().encode(normalizeEmployeeId(value));
  const digest = await globalThis.crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(digest), byte => byte.toString(16).padStart(2, '0')).join('');
}

export function removePasswordFields(profile) {
  const { password, passwordHash, passwordSalt, ...safe } = profile;
  return safe;
}

export const DIRECTORY_FIELDS = ['id', 'name', 'department', 'jobTitle', 'level', 'avatar', 'employmentStatus', 'isActive', 'status'];
export function directoryProfile(profile) {
  return Object.fromEntries(DIRECTORY_FIELDS.filter(key => profile[key] !== undefined).map(key => [key, profile[key]]));
}
