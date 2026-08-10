const ROLES = Object.freeze({
  STUDENT: 'student',
  ADMIN: 'admin',
  SUPER_ADMIN: 'superadmin',
});

const AUTHENTICATED_ROLES = Object.freeze([ROLES.ADMIN, ROLES.SUPER_ADMIN]);

module.exports = {
  ROLES,
  AUTHENTICATED_ROLES,
};
