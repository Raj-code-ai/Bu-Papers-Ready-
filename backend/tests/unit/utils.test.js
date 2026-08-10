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
});
