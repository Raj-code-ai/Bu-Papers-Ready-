const memoryCache = require('../../src/utils/memoryCache');
const { validatePasswordStrength } = require('../../src/utils/password');
const { slugify } = require('../../src/utils/slugify');
const { parsePagination, buildMeta } = require('../../src/utils/pagination');

describe('utils', () => {
  test('rejects weak passwords', () => {
    const errors = validatePasswordStrength('short');
    expect(errors.length).toBeGreaterThan(0);
  });

  test('accepts strong passwords', () => {
    const errors = validatePasswordStrength('ChangeMe!SuperAdmin1');
    expect(errors).toHaveLength(0);
  });

  test('slugify normalizes names', () => {
    expect(slugify('Class 10 Science')).toBe('class-10-science');
  });

  test('pagination meta calculates pages', () => {
    expect(buildMeta({ page: 1, limit: 20, total: 45 })).toEqual(
      expect.objectContaining({ totalPages: 3, hasNextPage: true })
    );
  });

  test('parsePagination clamps limit', () => {
    const result = parsePagination({ page: '2', limit: '999' }, { page: 1, limit: 20, maxLimit: 100 });
    expect(result.limit).toBe(100);
    expect(result.page).toBe(2);
  });

  test('memory cache invalidates public paper reads without dropping unrelated keys', () => {
    memoryCache.clear();
    memoryCache.set('public-paper:abc', { title: 'A' }, 10_000);
    memoryCache.set('public-papers:{"page":1}', { items: [] }, 10_000);
    memoryCache.set('feature-keys', ['notes'], 10_000);
    memoryCache.invalidatePublicPaperReads();
    expect(memoryCache.get('public-paper:abc')).toBeUndefined();
    expect(memoryCache.get('public-papers:{"page":1}')).toBeUndefined();
    expect(memoryCache.get('feature-keys')).toEqual(['notes']);
    memoryCache.clear();
  });
});
