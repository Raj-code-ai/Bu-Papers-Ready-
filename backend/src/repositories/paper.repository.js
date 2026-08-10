const BaseRepository = require('./BaseRepository');
const Paper = require('../models/Paper');

class PaperRepository extends BaseRepository {
  constructor() {
    super(Paper);
  }

  findPublic(filter, options) {
    return this.paginate(
      {
        ...filter,
        isDeleted: false,
        status: 'published',
      },
      options
    );
  }

  findByHash(fileHash) {
    return this.findOne({ fileHash, isDeleted: false });
  }

  softDelete(id, deletedBy) {
    return this.updateById(id, {
      isDeleted: true,
      deletedAt: new Date(),
      deletedBy,
    });
  }

  restore(id) {
    return this.updateById(id, {
      isDeleted: false,
      deletedAt: null,
      deletedBy: null,
    });
  }
}

module.exports = new PaperRepository();
