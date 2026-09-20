export const hasDraftItems = draft => Array.isArray(draft?.formData?.items)
  && draft.formData.items.some(item => String(item?.productName || '').trim().length > 0);

export function mergeDrafts(...groups) {
  const byId = new Map();
  for (const draft of groups.flat()) {
    if (!draft?.id) continue;
    const previous = byId.get(draft.id);
    if (!previous || String(draft.updatedAt || '') >= String(previous.updatedAt || '')) byId.set(draft.id, draft);
  }
  return [...byId.values()].filter(hasDraftItems).sort((a, b) => String(b.updatedAt || '').localeCompare(String(a.updatedAt || '')));
}

export function readLocalDrafts(storage, key) {
  const raw = storage.getItem(key);
  if (!raw) return [];
  const saved = JSON.parse(raw);
  return mergeDrafts(Array.isArray(saved) ? saved : saved ? [saved] : []);
}

export function writeLocalDraft(storage, key, draft) {
  storage.setItem(key, JSON.stringify(mergeDrafts(readLocalDrafts(storage, key), [draft])));
}

export function removeLocalDraft(storage, key, id) {
  storage.setItem(key, JSON.stringify(readLocalDrafts(storage, key).filter(draft => draft.id !== id)));
}
