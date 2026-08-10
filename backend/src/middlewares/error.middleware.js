const logger = require('../config/logger');
const env = require('../config/env');
const { fail } = require('../utils/apiResponse');

function normalizeMongooseValidation(err) {
  const errors = Object.values(err.errors || {}).map((item) => ({
    field: item.path,
    msg: item.message,
  }));

  return {
    statusCode: 400,
    code: 'VALIDATION_ERROR',
    message: 'Validation failed',
    errors,
  };
}

function normalizeDuplicateKey(err) {
  const fields = Object.keys(err.keyPattern || {});
  return {
    statusCode: 409,
    code: 'CONFLICT',
    message: `Duplicate value for: ${fields.join(', ') || 'unique field'}`,
    errors: fields.map((field) => ({ field, msg: 'Already exists' })),
  };
}

function errorMiddleware(err, req, res, next) {
  if (res.headersSent) {
    return next(err);
  }

  let statusCode = err.statusCode || 500;
  let code = err.code || 'INTERNAL_ERROR';
  let message = err.message || 'Internal server error';
  let errors = err.details || undefined;

  if (err.name === 'ValidationError') {
    ({ statusCode, code, message, errors } = normalizeMongooseValidation(err));
  } else if (err.code === 11000) {
    ({ statusCode, code, message, errors } = normalizeDuplicateKey(err));
  } else if (err.name === 'CastError') {
    statusCode = 400;
    code = 'INVALID_ID';
    message = `Invalid ${err.path || 'id'}`;
  } else if (err.name === 'MulterError') {
    statusCode = err.code === 'LIMIT_FILE_SIZE' ? 413 : 400;
    code = err.code === 'LIMIT_FILE_SIZE' ? 'PAYLOAD_TOO_LARGE' : 'UPLOAD_ERROR';
    message = err.message;
  } else if (err.type === 'entity.too.large') {
    statusCode = 413;
    code = 'PAYLOAD_TOO_LARGE';
    message = 'Request entity too large';
  }

  const logPayload = {
    requestId: req.requestId,
    method: req.method,
    path: req.originalUrl,
    statusCode,
    code,
    stack: err.stack,
  };

  if (statusCode >= 500) {
    logger.error(message, logPayload);
  } else {
    logger.warn(message, logPayload);
  }

  const clientMessage =
    statusCode >= 500 && env.isProduction ? 'Internal server error' : message;

  return fail(res, clientMessage, statusCode, code, errors);
}

module.exports = errorMiddleware;
