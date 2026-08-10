# Phase 6 — Admin APIs

## Deliverables

Admin routes under `/api/v1/admin` (JWT + admin/superadmin):

| Method | Path | Feature |
|--------|------|---------|
| GET | `/admin/dashboard` | Own upload/view/download summary |
| GET | `/admin/papers` | List own papers |
| POST | `/admin/papers/upload` | Upload PDF + metadata |
| POST | `/admin/papers/bulk-upload` | Bulk PDF upload |
| PATCH | `/admin/papers/:id` | Edit metadata |
| PUT | `/admin/papers/:id/replace` | Replace PDF |
| DELETE | `/admin/papers/:id` | Soft delete |
| GET | `/admin/recycle-bin` | Recycle bin |
| POST | `/admin/recycle-bin/:id/restore` | Restore |
| DELETE | `/admin/recycle-bin/:id` | Permanent delete |
| GET | `/admin/uploads/history` | Upload history |
| GET | `/admin/storage` | Storage dashboard |
| GET | `/admin/duplicates` | Duplicate detection list |
| GET | `/admin/analytics` | Own analytics |

Also delivered with this phase (needed for real uploads):
- Storage abstraction (`IStorageProvider`)
- Cloudinary provider + S3/GCS adapter shells
- Storage factory + PDF validation / hash / virus-scan hook
- Multer PDF upload middleware

## Notes

- Admins cannot create other admins or change website settings.
- Password change remains at `/api/v1/auth/change-password`.
- Cloudinary credentials must be set before uploads succeed.

## Transfer Status

Still **not** copying into `BU papers( Backend)`.

## Next

Phase 7 — Super Admin APIs
