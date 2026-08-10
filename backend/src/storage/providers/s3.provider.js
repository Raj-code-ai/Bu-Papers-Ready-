const IStorageProvider = require('../interfaces/IStorageProvider');
const AppError = require('../../utils/AppError');

/**
 * Future AWS S3 adapter shell.
 * Business services never import this directly — use storage.factory.
 */
class S3StorageProvider extends IStorageProvider {
  constructor() {
    super();
    this.configured = false;
  }

  async upload() {
    throw new AppError('AWS S3 provider is not enabled yet. Switch STORAGE_PROVIDER after configuring S3.', 501, 'STORAGE_PROVIDER_UNAVAILABLE');
  }

  async replace() {
    return this.upload();
  }

  async delete() {
    throw new AppError('AWS S3 provider is not enabled yet.', 501, 'STORAGE_PROVIDER_UNAVAILABLE');
  }

  async getSignedUrl() {
    throw new AppError('AWS S3 provider is not enabled yet.', 501, 'STORAGE_PROVIDER_UNAVAILABLE');
  }

  async healthCheck() {
    return { ok: false, provider: 's3', message: 'Adapter ready but not configured' };
  }

  async getUsageStats() {
    return { provider: 's3', storageUsedBytes: 0, bandwidthUsedBytes: 0, resources: 0 };
  }
}

module.exports = S3StorageProvider;
