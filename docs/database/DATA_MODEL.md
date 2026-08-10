# Data Model Blueprint

All collections are designed for MongoDB Atlas with Mongoose validation and compound indexes. Academic taxonomy is **fully dynamic** — no hardcoded Class/UG/PG values in application code.

## Entity Relationship (Logical)

```
User (admin|superadmin)
  └── uploads → Paper
  └── storageUsage

AcademicLevel (order, enabled)
  └── Programme / Degree
        └── Department
              └── Semester OR ClassNode
                    └── Subject
                          └── Paper

ResourceType (enabled, featureKey)
AcademicYear
PaperType (optional subtype)

Paper
  ├── refs: level, programme, department, semester/class, subject
  ├── resourceType, academicYear
  ├── storage metadata + fileHash
  ├── softDelete / recycleBin
  └── counters: views, downloads

AuditLog / LoginHistory / ActivityLog
StoragePolicy / SecurityPolicy / SystemConfig / FeatureToggle / WebsiteSettings
Notification / BackupRecord / AnalyticsSnapshot
```

## Collections

### users
| Field | Type | Notes |
|-------|------|-------|
| name | String | required |
| email | String | unique, indexed |
| passwordHash | String | bcrypt |
| role | String | enum admin\|superadmin |
| isActive | Boolean | disable without delete |
| storageUsedBytes | Number | denormalized |
| failedLoginAttempts | Number | |
| lockUntil | Date | nullable |
| twoFactorEnabled | Boolean | required for superadmin policy |
| twoFactorSecret | String | encrypted at rest |
| passwordChangedAt | Date | |
| lastLoginAt | Date | |
| createdBy | ObjectId | |
| timestamps | | |

Indexes: `{ email: 1 }`, `{ role: 1, isActive: 1 }`

### academic_levels
| Field | Type | Notes |
|-------|------|-------|
| name | String | e.g. Class 10, Undergraduate |
| slug | String | unique |
| description | String | |
| order | Number | Super Admin reorder |
| isEnabled | Boolean | |
| metadata | Object | flexible |

### programmes
Degree/programme under a level (BA, B.Sc, Diploma in X, etc.)

Indexes: `{ academicLevelId: 1, slug: 1 }` unique compound

### departments
Under programme. Indexes: `{ programmeId: 1, slug: 1 }`

### semesters
Optional path for UG/PG style programmes.

### class_nodes
Optional path for school classes (Class 1–12) or custom class labels.

> A subject may attach to either `semesterId` or `classNodeId` (xor validation in service).

### subjects
Indexes: `{ departmentId: 1, slug: 1 }`, text index on `name`

### resource_types
Previous Year Papers, Notes, Assignments, … — Super Admin extensible.

### academic_years
e.g. 2024-25 — dynamic list.

### papers
| Field | Type | Notes |
|-------|------|-------|
| title | String | |
| description | String | |
| academicLevelId | ObjectId | |
| programmeId | ObjectId | |
| departmentId | ObjectId | |
| semesterId | ObjectId | optional |
| classNodeId | ObjectId | optional |
| subjectId | ObjectId | |
| resourceTypeId | ObjectId | |
| academicYearId | ObjectId | |
| paperTypeId | ObjectId | optional |
| fileName | String | unique stored name |
| originalFileName | String | |
| mimeType | String | application/pdf |
| fileSizeBytes | Number | |
| fileHash | String | SHA-256, indexed |
| storage | Object | provider, providerKey, url, secureUrl |
| uploadedBy | ObjectId | |
| viewCount | Number | |
| downloadCount | Number | |
| isDuplicateSuspect | Boolean | |
| isDeleted | Boolean | soft delete |
| deletedAt | Date | |
| deletedBy | ObjectId | |
| permanentlyDeletedAt | Date | |
| status | String | published\|draft\|archived |
| timestamps | | |

Indexes:
- `{ fileHash: 1 }`
- `{ subjectId: 1, academicYearId: 1, resourceTypeId: 1 }`
- `{ isDeleted: 1, deletedAt: 1 }`
- `{ createdAt: -1 }`
- text: `title description originalFileName`
- `{ viewCount: -1 }`, `{ downloadCount: -1 }`

### audit_logs
action, actorId, actorRole, entityType, entityId, ip, userAgent, before, after, createdAt

### login_history
userId, success, ip, userAgent, reason, createdAt

### storage_policies / security_policies / system_configs / feature_toggles / website_settings
Singleton or keyed documents managed by Super Admin.

### notifications
type, severity, message, meta, isRead, audience, createdAt

### backup_records
type (daily|weekly|monthly|manual), path, size, checksum, verified, status, createdAt

### analytics_events
Optional fine-grained events for views/downloads (paperId, type, ipHash, createdAt) with TTL or rollup jobs.

## Soft Delete & Recycle Bin

1. Delete sets `isDeleted=true`, `deletedAt=now`
2. Student queries always filter `isDeleted: false`
3. Restore clears delete flags
4. Permanent delete removes cloud object + DB doc
5. Cron cleans based on `recycleBinRetentionDays`

## Seed Strategy (not hardcoded business values)

Initial seed may create **example** academic levels (Class 1–12, UG, PG, Diploma, Certificate, Competitive Exams) **only as editable DB records**. Super Admin can rename, disable, reorder, or delete them. Application code never switches on fixed level names.
