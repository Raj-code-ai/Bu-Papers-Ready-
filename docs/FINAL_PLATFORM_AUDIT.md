# BU Papers 2.0 — Final Platform Audit

Date: 2026-08-09  
Project path: `BU papers( Backend)`  
Scope: Single-institution academic question-paper platform (Phases 1–10 of platform plan).

---

## 1. Architecture

- Express + MongoDB + React/Vite monorepo retained.
- Public branding via `WebsiteSettings` + `GET /api/v1/public/site-config`.
- Roles: `admin` | `superadmin` only. No student accounts. No multi-college UI.
- Ports: backend **3008**, frontend **3011**.

## 2. Taxonomy refactor (Phase 2)

**Problem fixed:** Old chain forced `Level → Programme → Department → Semester/Class → Subject`, which blocked Class 1–10 school papers without departments.

**Current model:**

| Kind | Flow | Department |
|------|------|------------|
| `school_band` | Level → (Stream for 11–12) → Class → Subject | Optional / not required |
| `ug` / `pg` | Level → Background → Department → Semester → Subject | Expected |
| `other` | Diploma / Certificate / Competitive | Flexible |

- `AcademicLevel.kind`: `school_band | ug | pg | other`
- `Programme.kind`: `stream | background | degree | other`
- `departmentId` optional on ClassNode, Semester (with alternate parents), Subject, Paper
- `programmeId` / `departmentId` optional on Paper for school flows
- `assertTaxonomyRefs` is level-aware; disabled taxonomy rejected server-side
- Taxonomy delete blocked when papers still reference the node (disable instead)
- Seed: Class 1–5 / 6–10 / 11–12 bands, streams, UG/PG backgrounds, CSE-only engineering dept, UG semesters 1–8, PG 1–4
- Migration: `npm run migrate:taxonomy-v2` remaps legacy Class 1–12 / UG / PG papers; never deletes papers

## 3. Authentication

- Single `/login`; Super Admin 2FA retained.
- Seeds: `seed:superadmin`, `seed:admin`.
- Production rejects insecure default secrets (`env.js`).

## 4. Branding / public pages (Phases 3–4)

- ARMS hardcoding removed from Login + InstitutionContext fallback.
- About prefers `aboutText` from WebsiteSettings.
- Developers: DB-managed profiles; Raj default has **no semester**.
- Contact: institution vs developer sections, consistent page header.

## 5. Cascading public browse + Admin upload (Phases 5–6)

- `BrowsePage` / `AdminUploadPage` cascade by level kind via `taxonomyCascade.js`.
- Public taxonomy includes `paperTypes` + `tree` bundle and `kind` fields.
- Admin validators allow nullable `programmeId` / `departmentId`.

## 6. Super Admin control panel (Phases 7–8)

Nav + pages wired to existing APIs:

| Section | Route |
|---------|-------|
| Overview | `/superadmin` |
| Academic Structure | `/superadmin/academic` |
| Admins | `/superadmin/admins` |
| Institution / Developers | `/superadmin/institution`, `/developers` |
| Storage / Security / Features | `/storage-policy`, `/security`, `/features` |
| Audit / Login History | `/audit-logs`, `/login-history` |
| Backups / Health | `/backups`, `/health` |
| Maintenance | `/system` |

## 7. Security audit (Phase 9)

| Check | Status |
|-------|--------|
| Admin cannot hit `/superadmin/*` (backend `authorize(SUPER_ADMIN)` + frontend ProtectedRoute) | Pass |
| Public download/view only `status=published` && `!isDeleted` | Pass |
| Disabled taxonomy rejected in `assertTaxonomyRefs` | Pass |
| Taxonomy delete blocked when papers reference node | Pass |
| Production secret rejection | Pass |
| Unit tests for authorize role gates | Added (`tests/unit/security.test.js`) |

## 8. Storage / backups / policies

- Storage abstraction + admin quota unchanged in contract.
- Super Admin UI for storage policy, security policy, features, backups, health.

## 9. Tests & verification (Phase 10)

| Command | Purpose |
|---------|---------|
| `cd backend && npm test` | Utils + security + health |
| `cd frontend && npm run build` | Production build |
| `npm run migrate:taxonomy-v2` | Safe taxonomy remapping |
| Manual matrix | Class band / UG / PG upload + browse |

## 10. Manual Class / UG / PG matrix

| Flow | Expected |
|------|----------|
| Class 1–10 browse/upload | Level → Class → Subject (no department) |
| Class 11–12 | Level → Stream → Class → Subject |
| Undergraduate | Level → Background → Dept → Sem 1–8 → Subject |
| Postgraduate | Level → Background → Dept → Sem 1–4 → Subject |
| Disable a level | Hidden from public taxonomy; upload rejects |

## 11. Residual risks

- Legacy papers pointing at disabled Class 1–12 AcademicLevels should be remapped with `migrate:taxonomy-v2`.
- Only one backend process on 3008 (kill stale Node if `EADDRINUSE`).
- Do not commit real `.env` secrets.

## 12. Phase gate

Phases 2–10 implemented against the Phase 1 architecture audit plan. Plan file itself was not modified.
