const IStorageProvider = require('../interfaces/IStorageProvider');
const AppError = require('../../utils/AppError');

/**
 * Future Google Cloud Storage adapter shell.
 */
class GcsStorageProvider extends IStorageProvider {
  constructor() {
    super();
    this.configured = false;
  }

  async upload() {
    throw new AppError('GCS provider is not enabled yet. Switch STORAGE_PROVIDER after configuring GCS.', 501, 'STORAGE_PROVIDER_UNAVAILABLE');
  }

  async replace() {
    return this.upload();
  }

  async delete() {
    throw new AppError('GCS provider is not enabled yet.', 501, 'STORAGE_PROVIDER_UNAVAILABLE');
  }

  async getSignedUrl() {
    throw new AppError('GCS provider is not enabled yet.', 501, 'STORAGE_PROVIDER_UNAVAILABLE');
  }

  async healthCheck() {
    return { ok: false, provider: 'gcs', message: 'Adapter ready but not configured' };
  }

  async getUsageStats() {
    return { provider: 'gcs', storageUsedBytes: 0, bandwidthUsedBytes: 0, resources: 0 };
  }
}

module.exports = GcsStorageProvider;
