const { isAllowedOrigin, normalizeOrigin } = require('../../src/config/cors');

describe('cors origin matching', () => {
  test('normalizes trailing slashes', () => {
    expect(normalizeOrigin('https://bu-papers-ready-jlgx.vercel.app/')).toBe(
      'https://bu-papers-ready-jlgx.vercel.app'
    );
  });

  test('allows exact frontend origin', () => {
    const allowed = ['https://bu-papers-ready-jlgx.vercel.app', 'https://*.vercel.app'];
    expect(isAllowedOrigin('https://bu-papers-ready-jlgx.vercel.app', allowed)).toBe(true);
  });

  test('allows vercel preview hosts via wildcard', () => {
    const allowed = ['https://*.vercel.app'];
    expect(
      isAllowedOrigin('https://bu-papers-ready-jlgx-git-main-cse-bu.vercel.app', allowed)
    ).toBe(true);
  });

  test('blocks unknown origins', () => {
    const allowed = ['https://bu-papers-ready-jlgx.vercel.app'];
    expect(isAllowedOrigin('https://evil.example.com', allowed)).toBe(false);
  });
});
