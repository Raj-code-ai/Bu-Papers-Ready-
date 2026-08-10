const { Readable } = require('stream');
const { v2: cloudinary } = require('cloudinary');
const IStorageProvider = require('../interfaces/IStorageProvider');
const env = require('../../config/env');
const AppError = require('../../utils/AppError');
const logger = require('../../config/logger');

class CloudinaryStorageProvider extends IStorageProvider {
  constructor(config = env.cloudinary) {
    super();
    this.folder = config.folder || 'arms';
    this.configured = Boolean(config.cloudName && config.apiKey && config.apiSecret);

    if (this.configured) {
      cloudinary.config({
        cloud_name: config.cloudName,
        api_key: config.apiKey,
        api_secret: config.apiSecret,
        secure: true,
      });
    }
  }

  assertConfigured() {
    if (!this.configured) {
      throw new AppError(
        'Cloudinary is not configured. Set CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, and CLOUDINARY_API_SECRET.',
        503,
        'STORAGE_NOT_CONFIGURED'
      );
    }
  }

  upload(fileBuffer, options = {}) {
    this.assertConfigured();

    return new Promise((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        {
          resource_type: 'raw',
          folder: options.folder || this.folder,
          public_id: options.publicId,
          overwrite: Boolean(options.overwrite),
          format: 'pdf',
        },
        (error, result) => {
          if (error) {
            logger.error('Cloudinary upload failed', { error: error.message });
            return reject(
              new AppError('Failed to upload file to cloud storage', 502, 'STORAGE_UPLOAD_FAILED', [
                { field: 'file', msg: error.message },
              ])
            );
          }

          return resolve({
            providerKey: result.public_id,
            url: result.url,
            secureUrl: result.secure_url,
            format: result.format || 'pdf',
            bytes: result.bytes,
            resourceType: result.resource_type || 'raw',
            raw: result,
          });
        }
      );

      Readable.from(fileBuffer).pipe(uploadStream);
    });
  }

  async replace(providerKey, fileBuffer, options = {}) {
    return this.upload(fileBuffer, {
      ...options,
      publicId: providerKey,
      overwrite: true,
    });
  }

  async delete(providerKey) {
    this.assertConfigured();
    try {
      const result = await cloudinary.uploader.destroy(providerKey, {
        resource_type: 'raw',
        invalidate: true,
      });
      return { deleted: result.result === 'ok' || result.result === 'not found', raw: result };
    } catch (error) {
      logger.error('Cloudinary delete failed', { error: error.message, providerKey });
      throw new AppError('Failed to delete file from cloud storage', 502, 'STORAGE_DELETE_FAILED');
    }
  }

  async getSignedUrl(providerKey) {
    this.assertConfigured();
    const url = cloudinary.url(providerKey, {
      resource_type: 'raw',
      secure: true,
      sign_url: true,
    });
    return { url };
  }

  async healthCheck() {
    if (!this.configured) {
      return { ok: false, provider: 'cloudinary', message: 'Not configured' };
    }

    try {
      const result = await cloudinary.api.ping();
      return { ok: result.status === 'ok', provider: 'cloudinary', raw: result };
    } catch (error) {
      return { ok: false, provider: 'cloudinary', message: error.message };
    }
  }

  async getUsageStats() {
    this.assertConfigured();
    try {
      const usage = await cloudinary.api.usage();
      return {
        provider: 'cloudinary',
        storageUsedBytes: usage.storage?.usage || 0,
        bandwidthUsedBytes: usage.bandwidth?.usage || 0,
        resources: usage.resources || 0,
        raw: usage,
      };
    } catch (error) {
      logger.warn('Cloudinary usage stats unavailable', { error: error.message });
      return {
        provider: 'cloudinary',
        storageUsedBytes: 0,
        bandwidthUsedBytes: 0,
        resources: 0,
        error: error.message,
      };
    }
  }
}

module.exports = CloudinaryStorageProvider;
