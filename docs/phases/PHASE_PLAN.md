# Phase Plan

Build order is mandatory. Each phase ends with verify → fix → optimize → continue.

## Phase 1 — Project Architecture ✅ (current)

Deliverables:
- Monorepo folder structure
- Architecture docs (overview, clean architecture, storage, roles, tech stack)
- Data model blueprint
- API design map
- Security architecture
- Env contract (`.env.example`) with ports **3011** / **3008**
- README + phase plan
- `.gitignore`

Exit criteria:
- Docs complete and consistent
- No files written into `BU papers( Backend)` (transfer deferred until user request)

## Phase 2 — Backend Foundation

Express app factory, config loader, Winston/Morgan, Helmet/CORS skeleton, error handler, health route, Swagger skeleton, folder wiring, `package.json`.

## Phase 3 — Authentication

User model basics, JWT issue/verify, login/logout/refresh, bcrypt, lockout, password reset tokens, change password, Super Admin 2FA scaffolding, auth routes + validators.

## Phase 4 — Database

All Mongoose models, indexes, repositories, seed script for editable taxonomy defaults, connection resilience.

## Phase 5 — Student APIs

Public browse/search/filter/view/download/stats/latest/popular/taxonomy endpoints.

## Phase 6 — Admin APIs

Upload, bulk upload, replace, metadata edit, soft delete, recycle bin, history, storage dashboard, duplicates, own analytics.

## Phase 7 — Super Admin APIs

Admin management, taxonomy CRUD/reorder, policies, toggles, website, backups, health dashboards, audit/login history.

## Phase 8 — Cloud Storage

`IStorageProvider`, Cloudinary provider, factory, file validation, hash/duplicates, virus-scan hook, S3/GCS adapter shells.

## Phase 9 — Analytics

Counters, aggregations, admin/superadmin reports, popular/latest queries.

## Phase 10 — Monitoring

System/cloud/storage health collectors, notifications for failures, active session/upload metrics.

## Phase 11 — Security Hardening

CSRF, mongo sanitize, XSS guards, rate limit tuning, HTTPS readiness, audit completeness, security policy enforcement.

## Phase 12 — Frontend

React + Vite + Tailwind on **port 3011**, student UI, admin UI, super admin UI, dark mode ready, skeletons, empty/error states.

## Phase 13 — Testing

Unit + integration tests for auth, papers, storage policy, RBAC.

## Phase 14 — Docker

Dockerfiles, Compose, nginx, env wiring.

## Phase 15 — Deployment

Production docs, backup/restore runbooks, checklist for institutional go-live.

## Transfer Gate

When the user says to transfer, copy/sync the completed project into:

`C:\Users\islam\OneDrive\Desktop\My Full-stacks\BU papers( Backend)`

until then, all work stays in:

`C:\Users\islam\OneDrive\Desktop\My Full-stacks\academic-resource-management-system`
