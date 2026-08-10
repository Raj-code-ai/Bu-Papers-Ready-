const { body, param, query, validationResult } = require('express-validator');
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

const idParam = [param('id').isMongoId().withMessage('id must be a valid Mongo id'), validate];

const uploadValidators = [
  body('title').trim().notEmpty().withMessage('title is required').isLength({ max: 250 }),
  body('description').optional().isString().isLength({ max: 5000 }),
  body('academicLevelId').isMongoId().withMessage('academicLevelId is required'),
  body('programmeId').optional({ nullable: true }).isMongoId(),
  body('departmentId').optional({ nullable: true }).isMongoId(),
  body('subjectId').isMongoId().withMessage('subjectId is required'),
  body('resourceTypeId').isMongoId().withMessage('resourceTypeId is required'),
  body('academicYearId').optional({ nullable: true }).isMongoId(),
  body('semesterId').optional({ nullable: true }).isMongoId(),
  body('classNodeId').optional({ nullable: true }).isMongoId(),
  body('paperTypeId').optional({ nullable: true }).isMongoId(),
  body('status').optional().isIn(['published', 'draft', 'archived']),
  validate,
];

const bulkUploadValidators = [
  body('academicLevelId').isMongoId(),
  body('programmeId').optional({ nullable: true }).isMongoId(),
  body('departmentId').optional({ nullable: true }).isMongoId(),
  body('subjectId').isMongoId(),
  body('resourceTypeId').isMongoId(),
  body('academicYearId').optional({ nullable: true }).isMongoId(),
  body('semesterId').optional({ nullable: true }).isMongoId(),
  body('classNodeId').optional({ nullable: true }).isMongoId(),
  body('titlePrefix').optional().isString().isLength({ max: 120 }),
  body('status').optional().isIn(['published', 'draft', 'archived']),
  validate,
];

const updateValidators = [
  body('title').optional().trim().notEmpty().isLength({ max: 250 }),
  body('description').optional().isString().isLength({ max: 5000 }),
  body('academicLevelId').optional().isMongoId(),
  body('programmeId').optional().isMongoId(),
  body('departmentId').optional().isMongoId(),
  body('subjectId').optional().isMongoId(),
  body('resourceTypeId').optional().isMongoId(),
  body('academicYearId').optional().isMongoId(),
  body('semesterId').optional({ nullable: true }).isMongoId(),
  body('classNodeId').optional({ nullable: true }).isMongoId(),
  body('paperTypeId').optional({ nullable: true }).isMongoId(),
  body('status').optional().isIn(['published', 'draft', 'archived']),
  validate,
];

const listValidators = [
  query('page').optional().isInt({ min: 1 }).toInt(),
  query('limit').optional().isInt({ min: 1, max: 100 }).toInt(),
  query('q').optional().isString().isLength({ max: 200 }),
  query('status').optional().isIn(['published', 'draft', 'archived']),
  query('deleted').optional().isIn(['true', 'false']),
  validate,
];

module.exports = {
  idParam,
  uploadValidators,
  bulkUploadValidators,
  updateValidators,
  listValidators,
};
