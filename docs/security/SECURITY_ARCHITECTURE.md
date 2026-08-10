# Security Architecture

## Controls Checklist

| Control | Implementation Plan |
|---------|---------------------|
| JWT | Access + refresh tokens; short-lived access |
| bcrypt | Configurable salt rounds (default 12) |
| Helmet | Secure HTTP headers |
| Rate limiting | Global + auth + upload buckets |
| CSRF | Token for cookie-based mutating flows where applicable |
| CORS | Allowlist `FRONTEND_URL` (http://localhost:3011) |
| XSS | Helmet CSP + input sanitization + React escaping |
| Mongo injection | `express-mongo-sanitize` |
| Env secrets | `.env` never committed; `.env.example` only |
| HTTPS ready | `COOKIE_SECURE`, reverse proxy trust |
| Session timeout | Configurable idle/absolute timeout |
| Account lock | Max attempts + lock duration |
| 2FA | Mandatory path for Super Admin |
| Audit logs | All mutating & security events |
| Activity / login history | Persisted with IP + user agent |
| Password reset tokens | Hashed tokens, expiry, single use |
| RBAC | Middleware + service ownership checks |

## Authentication Flow

```
Login → validate credentials → check lock/active
     → (superadmin) verify 2FA if enabled
     → issue access + refresh tokens
     → write login_history + audit_log
```

## Password Policy (configurable via SecurityPolicy)

- Minimum length
- Complexity rules
- Disallow reuse of last N passwords (optional)
- Force reset on Super Admin reset

## File Security

1. PDF MIME + magic-byte validation
2. Max size from StoragePolicy
3. Unique generated file names
4. SHA-256 duplicate detection
5. Virus scan hook (optional endpoint)
6. Signed/secure URLs for view/download when provider supports

## Threat Mitigations

| Threat | Mitigation |
|--------|------------|
| Brute force login | Rate limit + account lock + alerts |
| Privilege escalation | Strict role checks; admins cannot create admins |
| Mass upload abuse | Upload rate limit + quota |
| Deleted data recovery window | Soft delete + retention |
| Secret leakage | Env isolation; no secrets in logs |
| Dependency risk | Lockfiles; audit in CI (Phase 13+) |

## Security Headers (Helmet defaults + CSP tuned for SPA)

Applied at Express app bootstrap in Phase 11 (foundational pieces start in Phase 2/3).
