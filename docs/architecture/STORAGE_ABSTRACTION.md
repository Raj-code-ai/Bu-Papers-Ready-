# Storage Abstraction

## Goal

Business logic must upload, replace, delete, and fetch files **without** knowing whether the provider is Cloudinary, AWS S3, or Google Cloud Storage.

## Contract: `IStorageProvider`

```js
/**
 * @typedef {Object} StorageUploadResult
 * @property {string} providerKey   - Provider object/public id
 * @property {string} url           - Public or signed URL
 * @property {string} secureUrl     - HTTPS URL when available
 * @property {string} format        - e.g. pdf
 * @property {number} bytes         - File size
 * @property {string} resourceType  - raw / image / etc.
 * @property {Object} raw           - Provider-specific metadata (never leaked to clients)
 */

class IStorageProvider {
  async upload(fileBuffer, options) { throw new Error('Not implemented'); }
  async replace(providerKey, fileBuffer, options) { throw new Error('Not implemented'); }
  async delete(providerKey, options) { throw new Error('Not implemented'); }
  async getSignedUrl(providerKey, options) { throw new Error('Not implemented'); }
  async healthCheck() { throw new Error('Not implemented'); }
  async getUsageStats() { throw new Error('Not implemented'); }
}
```

## Factory

```
STORAGE_PROVIDER=cloudinary|s3|gcs
        ↓
storageFactory.create(config) → IStorageProvider instance
        ↓
PaperService / StorageMonitorService consume interface only
```

## Folder Layout

```
backend/src/storage/
├── interfaces/
│   └── IStorageProvider.js
├── providers/
│   ├── cloudinary.provider.js   # Phase 8 — active
│   ├── s3.provider.js           # stub adapter ready for future
│   └── gcs.provider.js          # stub adapter ready for future
├── storage.factory.js
└── storage.service.js           # domain wrapper: validation + provider calls
```

## Domain Wrapper Responsibilities (`StorageService`)

1. Enforce PDF-only MIME/extension checks
2. Enforce max file size from Storage Policy
3. Generate unique storage key / public_id
4. Compute SHA-256 hash for duplicate detection
5. Optional virus-scan hook before upload
6. Call provider `upload` / `replace` / `delete`
7. Return normalized metadata to PaperService

## Migration Path

Switching providers:
1. Super Admin sets `cloudProvider` in Storage Policy (and env `STORAGE_PROVIDER`)
2. New uploads go to the new provider
3. Existing papers retain `storage.provider` + `storage.providerKey` for dual-read support
4. Optional migration job can re-upload historical objects

Business services **do not change**.

## Policy Fields Controlled by Super Admin

| Field | Description |
|-------|-------------|
| maxFileSizeMb | Per-upload limit |
| adminQuotaMb | Per-admin quota |
| duplicateDetection | Hash-based block/warn |
| compression | Optional PDF compression flag |
| recycleBinRetentionDays | Soft-delete lifetime |
| monthlyBudgetUsd | Cost estimate ceiling |
| warningPercent / criticalPercent | Alert thresholds |
| autoCleanup | Enable scheduled purge |
| cloudProvider | cloudinary \| s3 \| gcs |
| notificationRules | Who gets which alert |

## Initial Provider: Cloudinary

- Resource type: `raw` for PDFs
- Folder: configurable (`CLOUDINARY_FOLDER`)
- Secure URLs preferred for student view/download flows
