/**
 * Tiny in-process TTL cache for hot public reads.
 * Survives only while the Render instance is warm.
 */
const store = new Map();

function get(key) {
  const entry = store.get(key);
  if (!entry) return undefined;
  if (Date.now() > entry.expiresAt) {
    store.delete(key);
    return undefined;
  }
  return entry.value;
}

function set(key, value, ttlMs = 30000) {
  store.set(key, { value, expiresAt: Date.now() + ttlMs });
  return value;
}

function del(key) {
  store.delete(key);
}

function delByPrefix(prefix) {
  for (const key of store.keys()) {
    if (key.startsWith(prefix)) store.delete(key);
  }
}

function clear() {
  store.clear();
}

function invalidatePublicPaperReads() {
  delByPrefix('public-paper');
  delByPrefix('public-papers:');
  delByPrefix('public-home:');
  delByPrefix('public-stats');
  delByPrefix('public-latest:');
  delByPrefix('public-popular:');
}

module.exports = { get, set, del, delByPrefix, clear, invalidatePublicPaperReads };
