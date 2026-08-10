function success(res, data = null, message = 'OK', statusCode = 200, meta = undefined) {
  const payload = {
    success: true,
    message,
    data,
  };

  if (meta !== undefined) {
    payload.meta = meta;
  }

  return res.status(statusCode).json(payload);
}

function created(res, data = null, message = 'Created') {
  return success(res, data, message, 201);
}

function noContent(res) {
  return res.status(204).send();
}

function fail(res, message, statusCode = 400, code = 'BAD_REQUEST', errors = undefined) {
  const payload = {
    success: false,
    message,
    code,
  };

  if (errors !== undefined) {
    payload.errors = errors;
  }

  return res.status(statusCode).json(payload);
}

module.exports = {
  success,
  created,
  noContent,
  fail,
};
