# Phase 4 — Database

## Deliverables

### Academic taxonomy models
- AcademicLevel, Programme, Department, Semester, ClassNode, Subject
- ResourceType, AcademicYear, PaperType

### Resource model
- Paper (PDF metadata, storage object, soft delete, counters, indexes)

### System models
- StoragePolicy, SecurityPolicy, FeatureToggle, SystemConfig
- WebsiteSettings, EmailSettings, Notification, BackupRecord, AnalyticsEvent

### Infrastructure
- `models/index.js` barrel export
- `BaseRepository` + `PaperRepository`
- `slugify` utility
- `seed.service.js` — editable defaults (Class 1–12, UG/PG/Diploma/Certificate/Competitive Exams, resource types, policies)
- `scripts/seedDefaults.js`
- Auto-seed on successful MongoDB connect

## Important

Seeded academic levels/resource types are **database records only**. Super Admin can create/edit/delete/reorder/disable all of them. Application logic never hardcodes level names.

## Verify

```bash
# Set MONGODB_URI in backend/.env first
node scripts/seedDefaults.js
```

## Transfer Status

Still **not** copying into `BU papers( Backend)`.

## Next

Phase 5 — Student APIs
