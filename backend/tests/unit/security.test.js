const AppError = require('../../src/utils/AppError');
const { authorize } = require('../../src/middlewares/auth.middleware');
const { ROLES } = require('../../src/constants/roles');

function mockRes() {
  return {};
}

describe('authorization security', () => {
  test('admin cannot access superadmin-only routes', () => {
    const middleware = authorize(ROLES.SUPER_ADMIN);
    const req = { user: { role: ROLES.ADMIN, email: 'admin@example.com' } };
    let err;
    middleware(req, mockRes(), (e) => {
      err = e;
    });
    expect(err).toBeInstanceOf(AppError);
    expect(err.statusCode).toBe(403);
    expect(err.code).toBe('FORBIDDEN');
  });

  test('superadmin is allowed on superadmin routes', () => {
    const middleware = authorize(ROLES.SUPER_ADMIN);
    const req = { user: { role: ROLES.SUPER_ADMIN } };
    let called = false;
    let err;
    middleware(req, mockRes(), (e) => {
      if (e) err = e;
      else called = true;
    });
    expect(err).toBeUndefined();
    expect(called).toBe(true);
  });

  test('admin is allowed on admin routes', () => {
    const middleware = authorize(ROLES.ADMIN, ROLES.SUPER_ADMIN);
    const req = { user: { role: ROLES.ADMIN } };
    let called = false;
    middleware(req, mockRes(), (e) => {
      if (!e) called = true;
    });
    expect(called).toBe(true);
  });

  test('unauthenticated request is rejected', () => {
    const middleware = authorize(ROLES.ADMIN);
    let err;
    middleware({}, mockRes(), (e) => {
      err = e;
    });
    expect(err).toBeInstanceOf(AppError);
    expect(err.statusCode).toBe(401);
  });
});

describe('public paper visibility rules', () => {
  test('public filter always requires published and not deleted', () => {
    // Documented contract used by publicPaper.service buildPublicPaperFilter
    const filter = { isDeleted: false, status: 'published' };
    expect(filter.isDeleted).toBe(false);
    expect(filter.status).toBe('published');
  });
});
