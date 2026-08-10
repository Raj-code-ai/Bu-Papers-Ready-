const crypto = require('crypto');
const { v4: uuidv4 } = require('uuid');
const env = require('../config/env');
const AppError = require('../utils/AppError');
const { getStorageProvider } = require('./storage.factory');
const StoragePolicy = require('../models/StoragePolicy');
const logger = require('../config/logger');

async function getActiveStoragePolicy() {
  const policy = await StoragePolicy.findOne({ key: 'default' });
  if (policy) return policy;

  return {
    maxFileSizeMb: env.maxFileSizeMb,
    adminQuotaMb: env.adminStorageQuotaMb,
    duplicateDetection: env.duplicateDetectionEnabled,
    recycleBinRetentionDays: env.recycleBinRetentionDays,
    cloudProvider: env.storageProvider,
    largeUploadThresholdMb: 15,
    notificationRules: {},
  };
}

function assertPdfFile(file) {
  if (!file) {
    throw new AppError('PDF file is required', 400, 'VALIDATION_ERROR', [
      { field: 'file', msg: 'PDF file is required' },
    ]);
  }

  const mime = file.mimetype || '';
  const name = file.originalname || '';
  const isPdfMime = mime === 'application/pdf';
  const isPdfExt = name.toLowerCase().endsWith('.pdf');

  if (!isPdfMime && !isPdfExt) {
    throw new AppError('Only PDF files are allowed', 400, 'INVALID_FILE_TYPE', [
      { field: 'file', msg: 'Only PDF files are allowed' },
    ]);
  }

  // Basic magic-byte check for %PDF
  const header = file.buffer.slice(0, 4).toString('utf8');
  if (header !== '%PDF') {
    throw new AppError('Invalid PDF file content', 400, 'INVALID_FILE_CONTENT', [
      { field: 'file', msg: 'File content is not a valid PDF' },
    ]);
  }
}

function computeFileHash(buffer) {
  return crypto.createHash('sha256').update(buffer).digest('hex');
}

function generateUniqueFileName(originalName) {
  const safeBase = String(originalName || 'document')
    .replace(/\.pdf$/i, '')
    .replace(/[^a-zA-Z0-9-_]+/g, '-')
    .slice(0, 40);
  return `${Date.now()}-${uuidv4()}-${safeBase}.pdf`;
}

async function runVirusScanHook(fileBuffer) {
  if (!env.virusScanEnabled) {
    return { scanned: false, clean: true };
  }

  if (!env.virusScanEndpoint) {
    logger.warn('VIRUS_SCAN_ENABLED is true but VIRUS_SCAN_ENDPOINT is empty');
    return { scanned: false, clean: true };
  }

  const response = await fetch(env.virusScanEndpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/pdf' },
    body: fileBuffer,
  });

  if (!response.ok) {
    throw new AppError('Virus scan service failed', 502, 'VIRUS_SCAN_FAILED');
  }

  const result = await response.json();
  if (result.clean === false || result.infected === true) {
    throw new AppError('Upload rejected by virus scanner', 400, 'FILE_INFECTED');
  }

  return { scanned: true, clean: true, raw: result };
}

async function uploadPdf(file, options = {}) {
  assertPdfFile(file);

  const policy = await getActiveStoragePolicy();
  const maxBytes = (policy.maxFileSizeMb || env.maxFileSizeMb) * 1024 * 1024;

  if (file.size > maxBytes) {
    throw new AppError(
      `File exceeds maximum size of ${policy.maxFileSizeMb}MB`,
      413,
      'PAYLOAD_TOO_LARGE'
    );
  }

  await runVirusScanHook(file.buffer);

  const fileHash = computeFileHash(file.buffer);
  const fileName = generateUniqueFileName(file.originalname);
  const provider = await getStorageProvider();

  const uploaded = await provider.upload(file.buffer, {
    publicId: options.publicId || fileName.replace(/\.pdf$/i, ''),
    folder: options.folder,
    overwrite: Boolean(options.overwrite),
  });

  return {
    fileName,
    originalFileName: file.originalname,
    mimeType: 'application/pdf',
    fileSizeBytes: file.size,
    fileHash,
    storage: {
      provider: policy.cloudProvider || env.storageProvider,
      providerKey: uploaded.providerKey,
      url: uploaded.url,
      secureUrl: uploaded.secureUrl,
      format: uploaded.format,
      bytes: uploaded.bytes,
      resourceType: uploaded.resourceType,
      raw: uploaded.raw,
    },
    policy,
  };
}

async function replacePdf(providerKey, file, options = {}) {
  assertPdfFile(file);
  const policy = await getActiveStoragePolicy();
  const maxBytes = (policy.maxFileSizeMb || env.maxFileSizeMb) * 1024 * 1024;

  if (file.size > maxBytes) {
    throw new AppError(
      `File exceeds maximum size of ${policy.maxFileSizeMb}MB`,
      413,
      'PAYLOAD_TOO_LARGE'
    );
  }

  await runVirusScanHook(file.buffer);
  const provider = await getStorageProvider();
  const uploaded = await provider.replace(providerKey, file.buffer, options);
  const fileHash = computeFileHash(file.buffer);
  const fileName = generateUniqueFileName(file.originalname);

  return {
    fileName,
    originalFileName: file.originalname,
    mimeType: 'application/pdf',
    fileSizeBytes: file.size,
    fileHash,
    storage: {
      provider: policy.cloudProvider || env.storageProvider,
      providerKey: uploaded.providerKey,
      url: uploaded.url,
      secureUrl: uploaded.secureUrl,
      format: uploaded.format,
      bytes: uploaded.bytes,
      resourceType: uploaded.resourceType,
      raw: uploaded.raw,
    },
    policy,
  };
}

async function deleteStoredFile(providerKey) {
  const provider = await getStorageProvider();
  return provider.delete(providerKey);
}

module.exports = {
  getActiveStoragePolicy,
  assertPdfFile,
  computeFileHash,
  generateUniqueFileName,
  uploadPdf,
  replacePdf,
  deleteStoredFile,
  runVirusScanHook,
};
