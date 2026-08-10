function parsePagination(query, defaults = { page: 1, limit: 20, maxLimit: 100 }) {
  const page = Math.max(1, parseInt(query.page, 10) || defaults.page);
  const rawLimit = parseInt(query.limit, 10) || defaults.limit;
  const limit = Math.min(Math.max(1, rawLimit), defaults.maxLimit);
  const skip = (page - 1) * limit;

  return { page, limit, skip };
}

function buildMeta({ page, limit, total }) {
  const totalPages = Math.max(1, Math.ceil(total / limit) || 1);
  return {
    page,
    limit,
    total,
    totalPages,
    hasNextPage: page < totalPages,
    hasPrevPage: page > 1,
  };
}

function parseSort(query, allowedFields = ['createdAt'], defaultSort = { createdAt: -1 }) {
  const sortBy = allowedFields.includes(query.sortBy) ? query.sortBy : Object.keys(defaultSort)[0];
  const sortOrder = String(query.sortOrder || '').toLowerCase() === 'asc' ? 1 : -1;
  return { [sortBy]: sortOrder };
}

module.exports = {
  parsePagination,
  buildMeta,
  parseSort,
};
