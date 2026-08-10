/**
 * Storage provider contract.
 * Implementations: Cloudinary (active), S3 / GCS (ready for future wiring).
 */
class IStorageProvider {
  async upload(_fileBuffer, _options = {}) {
    throw new Error('upload() not implemented');
  }

  async replace(_providerKey, _fileBuffer, _options = {}) {
    throw new Error('replace() not implemented');
  }

  async delete(_providerKey, _options = {}) {
    throw new Error('delete() not implemented');
  }

  async getSignedUrl(_providerKey, _options = {}) {
    throw new Error('getSignedUrl() not implemented');
  }

  async healthCheck() {
    throw new Error('healthCheck() not implemented');
  }

  async getUsageStats() {
    throw new Error('getUsageStats() not implemented');
  }
}

module.exports = IStorageProvider;
