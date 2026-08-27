const { param, query, validationResult } = require('express-validator');
const AppError = require('../utils/AppError');

function validate(req, res, next) {
  const result = validationResult(req);
  if (!result.isEmpty()) {
    return next(
      new AppError(
        'Validation failed',
        400,
        'VALIDATION_ERROR',
        result.array().map((item) => ({ field: item.path, msg: item.msg }))
      )
    );
  }
  return next();
}

const mongoId = (field) =>
  param(field).isMongoId().withMessage(`${field} must be a valid id`);

const listPapersValidators = [
  query('page').optional().isInt({ min: 1 }).toInt(),
  query('limit').optional().isInt({ min: 1, max: 100 }).toInt(),
  query('sortBy').optional().isString(),
  query('sortOrder').optional().isIn(['asc', 'desc']),
  query('q').optional().isString().isLength({ max: 200 }),
  query('academicLevelId').optional().isMongoId(),
  query('programmeId').optional().isMongoId(),
  query('departmentId').optional().isMongoId(),
  query('semesterId').optional().isMongoId(),
  query('classNodeId').optional().isMongoId(),
  query('subjectId').optional().isMongoId(),
  query('academicYearId').optional().isMongoId(),
  query('resourceTypeId').optional().isMongoId(),
  query('paperTypeId').optional().isMongoId(),
  validate,
];

const idValidators = [mongoId('id'), validate];

const limitValidators = [
  query('limit').optional().isInt({ min: 1, max: 50 }).toInt(),
  validate,
];

module.exports = {
  listPapersValidators,
  idValidators,
  limitValidators,
};
