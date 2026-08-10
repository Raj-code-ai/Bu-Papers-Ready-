# Phase 3 — Authentication

## Deliverables

- User model (admin/superadmin) with lockout, 2FA secrets, refresh sessions
- LoginHistory + AuditLog + PasswordResetToken models
- JWT access/refresh token utilities
- Password strength enforcement
- Auth service: login, refresh, logout, change/forgot/reset password, 2FA setup/verify
- Auth middleware: authenticate, authorize, requireTwoFactorCompleted
- express-validator chains for auth payloads
- Auth routes under `/api/v1/auth`
- Bootstrap Super Admin on DB connect + seed script
- Auth rate limiting
- Cookie support for tokens

## Auth Endpoints

| Method | Path | Auth |
|--------|------|------|
| POST | `/api/v1/auth/login` | Public |
| POST | `/api/v1/auth/refresh` | Public |
| POST | `/api/v1/auth/forgot-password` | Public |
| POST | `/api/v1/auth/reset-password` | Public |
| POST | `/api/v1/auth/logout` | JWT |
| GET | `/api/v1/auth/me` | JWT |
| POST | `/api/v1/auth/change-password` | JWT |
| POST | `/api/v1/auth/2fa/setup` | JWT (Super Admin) |
| POST | `/api/v1/auth/2fa/verify` | JWT (Super Admin) |

## Bootstrap Super Admin (after MongoDB URI is set)

```
BOOTSTRAP_SUPERADMIN_EMAIL=superadmin@arms.local
BOOTSTRAP_SUPERADMIN_PASSWORD=ChangeMe!SuperAdmin1
```

Then enable 2FA via `/auth/2fa/setup` + `/auth/2fa/verify`.

## Verify

1. Set `MONGODB_URI` in `backend/.env`
2. Restart backend
3. `POST /api/v1/auth/login` with bootstrap credentials
4. Confirm Swagger lists Auth endpoints

## Transfer Status

Still **not** copying into `BU papers( Backend)`.

## Next

Phase 4 — Database (full academic taxonomy + paper models)
