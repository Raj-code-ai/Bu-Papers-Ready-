const env = require('../config/env');
const AppError = require('../utils/AppError');
const CloudinaryStorageProvider = require('./providers/cloudinary.provider');
const S3StorageProvider = require('./providers/s3.provider');
const GcsStorageProvider = require('./providers/gcs.provider');
const StoragePolicy = require('../models/StoragePolicy');

let cachedProvider = null;
let cachedProviderName = null;

async function resolveProviderName() {
  try {
    const policy = await StoragePolicy.findOne({ key: 'default' }).lean();
    if (policy?.cloudProvider) {
      return policy.cloudProvider;
    }
  } catch (_) {
    // DB may be unavailable during early boot
  }
  return env.storageProvider || 'cloudinary';
}

function createProvider(name) {
  switch (name) {
    case 'cloudinary':
      return new CloudinaryStorageProvider();
    case 's3':
      return new S3StorageProvider();
    case 'gcs':
      return new GcsStorageProvider();
    default:
      throw new AppError(`Unsupported storage provider: ${name}`, 500, 'STORAGE_PROVIDER_INVALID');
  }
}

async function getStorageProvider(forceReload = false) {
  const name = await resolveProviderName();
  if (!forceReload && cachedProvider && cachedProviderName === name) {
    return cachedProvider;
  }
  cachedProvider = createProvider(name);
  cachedProviderName = name;
  return cachedProvider;
}

function resetStorageProviderCache() {
  cachedProvider = null;
  cachedProviderName = null;
}

module.exports = {
  getStorageProvider,
  resetStorageProviderCache,
  createProvider,
};
