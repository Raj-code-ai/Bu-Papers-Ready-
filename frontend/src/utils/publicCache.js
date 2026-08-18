const HOME_CACHE_KEY = 'arms_public_home_v1';
const TAXONOMY_CACHE_KEY = 'arms_public_taxonomy_v1';
const PAPERS_CACHE_PREFIX = 'arms_public_papers_v1:';

function readJson(key) {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function writeJson(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // ignore quota / private mode
  }
}

export function readHomeCache() {
  return readJson(HOME_CACHE_KEY);
}

export function writeHomeCache(data) {
  writeJson(HOME_CACHE_KEY, data);
}

export function readTaxonomyCache() {
  return readJson(TAXONOMY_CACHE_KEY);
}

export function writeTaxonomyCache(data) {
  writeJson(TAXONOMY_CACHE_KEY, data);
}

export function papersCacheKey(params) {
  const normalized = Object.keys(params || {})
    .sort()
    .reduce((acc, key) => {
      acc[key] = params[key];
      return acc;
    }, {});
  return `${PAPERS_CACHE_PREFIX}${JSON.stringify(normalized)}`;
}

export function readPapersCache(params) {
  return readJson(papersCacheKey(params));
}

export function writePapersCache(params, data) {
  writeJson(papersCacheKey(params), data);
}
