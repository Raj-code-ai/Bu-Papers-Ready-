# Clean Architecture

## Layers (Backend)

```
┌────────────────────────────────────────────┐
│ Presentation                               │
│ routes → controllers → validators          │
├────────────────────────────────────────────┤
│ Application / Domain Services              │
│ services/, analytics/, notifications/      │
├────────────────────────────────────────────┤
│ Infrastructure                             │
│ repositories/, models/, storage/, backup/  │
│ config/, jobs/, monitoring/, security/     │
└────────────────────────────────────────────┘
```

Dependencies point **inward**: Presentation → Services → Repositories/Infrastructure.

## SOLID Mapping

| Principle | Application in ARMS |
|-----------|---------------------|
| S — Single Responsibility | One service per domain capability (PaperService, AuthService, StoragePolicyService) |
| O — Open/Closed | New storage providers implement `IStorageProvider` without changing PaperService |
| L — Liskov | Any storage provider can replace Cloudinary with identical method contracts |
| I — Interface Segregation | Separate read vs write analytics interfaces where useful |
| D — Dependency Inversion | Services depend on storage interface, not Cloudinary SDK |

## MVC + Service + Repository

```
Route  →  Controller  →  Service  →  Repository  →  Model
                │              │
                │              └─→ StorageProvider / EmailProvider
                └─→ ResponseFormatter / AuditLogger
```

### Controller responsibilities
- Parse request
- Call service
- Map result to HTTP status + payload
- Never contain business rules

### Service responsibilities
- Enforce domain rules (quota, soft delete, RBAC-aware operations)
- Orchestrate repositories and providers
- Emit audit events

### Repository responsibilities
- CRUD and query building
- Pagination, sorting, projection
- Index-aware query helpers

## Error Handling Strategy

```
throw AppError(message, statusCode, code, details)
        ↓
asyncHandler wraps controllers
        ↓
global error middleware
        ↓
Winston error log + sanitized client response
```

Error categories:
- `VALIDATION_ERROR` (400)
- `UNAUTHORIZED` (401)
- `FORBIDDEN` (403)
- `NOT_FOUND` (404)
- `CONFLICT` (409) — duplicates
- `PAYLOAD_TOO_LARGE` (413)
- `TOO_MANY_REQUESTS` (429)
- `INTERNAL_ERROR` (500)
- `SERVICE_UNAVAILABLE` (503) — maintenance / cloud down

## Shared Cross-Cutting Concerns

| Concern | Location |
|---------|----------|
| Logging | `utils/logger.js` (Winston) + Morgan middleware |
| Audit | `services/auditLog.service.js` |
| Pagination | `utils/pagination.js` |
| File hash | `utils/fileHash.js` |
| Response envelope | `utils/apiResponse.js` |

## Frontend Architecture (preview)

```
Pages → Feature Components → Hooks → API Services (Axios) → Backend
                 ↓
              Store (auth/session/theme)
```

Dark-mode-ready theme tokens live in CSS variables; components consume tokens, not hardcoded colors for theme-critical surfaces.
