class BaseRepository {
  constructor(model) {
    this.model = model;
  }

  create(data, options = {}) {
    return this.model.create([data], options).then((docs) => docs[0]);
  }

  findById(id, projection = null, options = {}) {
    return this.model.findById(id, projection, options);
  }

  findOne(filter, projection = null, options = {}) {
    return this.model.findOne(filter, projection, options);
  }

  findMany(filter = {}, { projection = null, sort = { createdAt: -1 }, skip = 0, limit = 20 } = {}) {
    return this.model.find(filter, projection).sort(sort).skip(skip).limit(limit);
  }

  count(filter = {}) {
    return this.model.countDocuments(filter);
  }

  updateById(id, update, options = { new: true, runValidators: true }) {
    return this.model.findByIdAndUpdate(id, update, options);
  }

  deleteById(id) {
    return this.model.findByIdAndDelete(id);
  }

  async paginate(filter = {}, { page = 1, limit = 20, sort = { createdAt: -1 }, projection = null } = {}) {
    const skip = (page - 1) * limit;
    const [items, total] = await Promise.all([
      this.findMany(filter, { projection, sort, skip, limit }),
      this.count(filter),
    ]);

    return {
      items,
      total,
      page,
      limit,
      totalPages: Math.max(1, Math.ceil(total / limit) || 1),
    };
  }
}

module.exports = BaseRepository;
