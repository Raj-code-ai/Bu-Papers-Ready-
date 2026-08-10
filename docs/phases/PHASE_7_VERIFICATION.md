# Phase 7 — Super Admin APIs

## Deliverables

All under `/api/v1/superadmin` (JWT + superadmin + 2FA gate):

- Dashboard
- Admin lifecycle: create / edit / enable / disable / delete / reset password
- Login history + audit logs
- Dynamic taxonomy CRUD + reorder (`levels`, `programmes`, `departments`, `semesters`, `classes`, `subjects`, `resource-types`, `academic-years`, `paper-types`)
- Website / storage / security / system / email settings
- Feature toggles
- Storage / system / cloud health dashboards
- Backup create / list / verify / restore / download

## Phase 8 note

Cloud storage abstraction was implemented with Admin uploads (Cloudinary + S3/GCS shells) and is marked complete.

## Transfer Status

Still **not** copying into `BU papers( Backend)`.

## Next

Phase 9 — Analytics (expanded reports)
