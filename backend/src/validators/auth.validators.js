const { body, validationResult } = require('express-validator');
const AppError = require('../utils/AppError');

function validate(req, res, next) {
  const result = validationResult(req);
  if (!result.isEmpty()) {
    return next(
      new AppError(
        'Validation failed',
        400,
        'VALIDATION_ERROR',
        result.array().map((item) => ({
          field: item.path,
          msg: item.msg,
        }))
      )
    );
  }
  return next();
}

const loginValidators = [
  body('email').isEmail().withMessage('Valid email is required').normalizeEmail(),
  body('password').notEmpty().withMessage('Password is required'),
  body('twoFactorCode')
    .optional({ nullable: true })
    .isString()
    .isLength({ min: 6, max: 8 })
    .withMessage('twoFactorCode must be 6-8 characters'),
  validate,
];

const refreshValidators = [
  body('refreshToken').notEmpty().withMessage('refreshToken is required'),
  validate,
];

const changePasswordValidators = [
  body('currentPassword').notEmpty().withMessage('currentPassword is required'),
  body('newPassword')
    .isLength({ min: 10 })
    .withMessage('newPassword must be at least 10 characters'),
  validate,
];

const forgotPasswordValidators = [
  body('email').isEmail().withMessage('Valid email is required').normalizeEmail(),
  validate,
];

const resetPasswordValidators = [
  body('token').notEmpty().withMessage('token is required'),
  body('newPassword')
    .isLength({ min: 10 })
    .withMessage('newPassword must be at least 10 characters'),
  validate,
];

const twoFactorVerifyValidators = [
  body('token')
    .notEmpty()
    .withMessage('token is required')
    .isLength({ min: 6, max: 8 })
    .withMessage('token must be 6-8 characters'),
  validate,
];

module.exports = {
  validate,
  loginValidators,
  refreshValidators,
  changePasswordValidators,
  forgotPasswordValidators,
  resetPasswordValidators,
  twoFactorVerifyValidators,
};
