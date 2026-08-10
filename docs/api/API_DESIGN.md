# API Design

Base URL: `http://localhost:3008/api/v1`  
Swagger UI: `http://localhost:3008/api/docs`  
Frontend: `http://localhost:3011`

## Conventions

### Response Envelope

Success:
```json
{
  "success": true,
  "message": "OK",
  "data": {},
  "meta": { "page": 1, "limit": 20, "total": 100, "totalPages": 5 }
}
```

Error:
```json
{
  "success": false,
  "message": "Validation failed",
  "code": "VALIDATION_ERROR",
  "errors": [{ "field": "email", "msg": "Invalid email" }]
}
```

### Pagination / Sorting / Filtering

Query params: `page`, `limit`, `sortBy`, `sortOrder`, plus resource-specific filters.

## Public — Student

| Method | Path | Description |
|--------|------|-------------|
| GET | `/public/papers` | Browse/search/filter papers |
| GET | `/public/papers/:id` | Paper detail (+ increment view) |
| GET | `/public/papers/:id/view` | Stream/view PDF URL |
| GET | `/public/papers/:id/download` | Download PDF (+ increment download) |
| GET | `/public/stats` | Total papers/downloads/views |
| GET | `/public/papers/latest` | Latest uploads |
| GET | `/public/papers/popular` | Popular papers |
| GET | `/public/taxonomy/*` | Enabled levels/programmes/… for filters |
| GET | `/public/health` | Public liveness (optional limited) |

Filters: academicLevelId, programmeId, departmentId, semesterId, classNodeId, subjectId, academicYearId, resourceTypeId, q

## Auth

| Method | Path | Description |
|--------|------|-------------|
| POST | `/auth/login` | Admin / Super Admin login |
| POST | `/auth/logout` | Invalidate refresh/session |
| POST | `/auth/refresh` | Refresh access token |
| POST | `/auth/forgot-password` | Request reset token |
| POST | `/auth/reset-password` | Reset with token |
| POST | `/auth/change-password` | Authenticated password change |
| POST | `/auth/2fa/setup` | Super Admin 2FA setup |
| POST | `/auth/2fa/verify` | Verify 2FA |

## Admin

Prefix: `/admin` — requires `role=admin` or `superadmin`

| Area | Endpoints |
|------|-----------|
| Dashboard | `GET /admin/dashboard` |
| Papers | CRUD soft-delete, replace PDF, bulk upload |
| Recycle Bin | list, restore, permanent delete |
| Upload History | `GET /admin/uploads/history` |
| Storage | `GET /admin/storage` |
| Duplicates | `GET /admin/duplicates` |
| Analytics | `GET /admin/analytics` |

## Super Admin

Prefix: `/superadmin` — requires `role=superadmin`

| Area | Endpoints |
|------|-----------|
| Admins | create/edit/delete/enable/disable/reset-password |
| Login History | `GET /superadmin/login-history` |
| Audit Logs | `GET /superadmin/audit-logs` |
| Academic taxonomy | full CRUD + reorder + enable/disable |
| Resource types / years / paper types | CRUD |
| Website / security / storage / email / system config | GET/PUT |
| Feature toggles | GET/PUT |
| Maintenance mode | GET/PUT |
| Storage / cloud / system health | GET dashboards |
| Backups | create, list, verify, restore, download |
| Analytics reports | monthly/yearly/storage/admin |

## Status Codes

200, 201, 204, 400, 401, 403, 404, 409, 413, 429, 500, 503

## Versioning

All routes under `/api/v1`. Breaking changes require `/api/v2`.
