// Share only dashboard summaries within this browser session; never cache writes.
const entries = new Map();
export function readSummary(key, load, { force = false, ttl = 15 * 60 * 1000, now = Date.now } = {}) {
  const previous = entries.get(key);
  if (previous?.pending) return previous.pending;
  if (!force && previous && now() - previous.time < ttl) return Promise.resolve(previous.value);
  const entry = { pending: null };
  entry.pending = Promise.resolve().then(load).then(value => {
    entries.set(key, { value, time: now() });
    return value;
  }, error => {
    entries.delete(key);
    throw error;
  });
  entries.set(key, entry);
  return entry.pending;
}
