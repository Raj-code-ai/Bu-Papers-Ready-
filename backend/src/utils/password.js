const AppError = require('./AppError');

const PASSWORD_RULES = {
  minLength: 10,
  requireUppercase: true,
  requireLowercase: true,
  requireNumber: true,
  requireSpecial: true,
};

function validatePasswordStrength(password) {
  const errors = [];

  if (typeof password !== 'string' || password.length < PASSWORD_RULES.minLength) {
    errors.push(`Password must be at least ${PASSWORD_RULES.minLength} characters`);
  }
  if (PASSWORD_RULES.requireUppercase && !/[A-Z]/.test(password || '')) {
    errors.push('Password must include an uppercase letter');
  }
  if (PASSWORD_RULES.requireLowercase && !/[a-z]/.test(password || '')) {
    errors.push('Password must include a lowercase letter');
  }
  if (PASSWORD_RULES.requireNumber && !/[0-9]/.test(password || '')) {
    errors.push('Password must include a number');
  }
  if (PASSWORD_RULES.requireSpecial && !/[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/.test(password || '')) {
    errors.push('Password must include a special character');
  }

  return errors;
}

function assertPasswordStrength(password) {
  const errors = validatePasswordStrength(password);
  if (errors.length) {
    throw new AppError('Password does not meet security requirements', 400, 'WEAK_PASSWORD', errors.map((msg) => ({
      field: 'password',
      msg,
    })));
  }
}

module.exports = {
  PASSWORD_RULES,
  validatePasswordStrength,
  assertPasswordStrength,
};
