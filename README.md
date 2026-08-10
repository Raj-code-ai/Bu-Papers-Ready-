# BU Papers 2.0

Single-institution academic question-paper platform (white-label). Students browse and download without accounts. Staff roles: **Admin** and **Super Admin** only. One `/login`. No public registration. No multi-college product UI.

## Ports

| Service | Port | URL |
|---------|------|-----|
| Backend API | **3008** | http://localhost:3008 |
| Frontend | **3011** | http://localhost:3011 |
| Swagger (dev) | 3008 | http://localhost:3008/api/docs |

## Stack

Express + Mongoose, JWT/bcrypt/2FA, audit/login history, storage factory (Cloudinary/S3/GCS), backups, Helmet/CORS/CSRF/rate-limit, React/Vite/Tailwind.

## Academic taxonomy (level-aware)

```
School bands (Class 1–5 / 6–10 / 11–12)
  → optional Stream (11–12)
  → Class
  → Subject
  (department NOT required)

Undergraduate / Postgraduate
  → Background / Programme
  → Department
  → Semester (UG 1–8, PG 1–4)
  → Subject
```

Super Admin enables/disables and CRUD’s every node. Seed is editable defaults only.

## Quick start

```bash
# Backend
cd backend
cp ../.env.example .env   # set MongoDB + JWT secrets
npm install
npm run seed:superadmin
npm run seed:admin
npm run seed:defaults          # taxonomy + policies
# Optional remapping of legacy Class 1–12 papers:
npm run migrate:taxonomy-v2
npm run dev                    # :3008

# Frontend
cd frontend
npm install
npm run dev                    # :3011
```

### Dev credentials (non-production)

| Role | Email | Password |
|------|-------|----------|
| Super Admin | `superadmin@arms.local` | `ChangeMe!SuperAdmin1` (+ OTP `123456` when 2FA required in non-prod) |
| Admin | `admin@arms.local` | `ChangeMe!Admin1` |

Change these in production. Production rejects insecure default JWT/CSRF secrets.

## Scripts

| Command | Where | Purpose |
|---------|-------|---------|
| `npm run dev` | backend / frontend | Local servers |
| `npm test` | backend | Jest unit + health |
| `npm run build` | frontend | Production Vite build |
| `npm run seed:defaults` | backend | Taxonomy + policies |
| `npm run migrate:taxonomy-v2` | backend | Safe remap to bands/UG/PG |

## Public site

Home · Question Papers (cascading filters) · About · Developers · Contact · Login

## Consoles

- **Admin:** upload (cascading by level), manage papers, drafts, publish, recycle bin, storage
- **Super Admin:** academic structure, admins, institution branding, developers, storage/security policies, features, audit logs, login history, backups, health, maintenance

## Docs

- [Final platform audit](docs/FINAL_PLATFORM_AUDIT.md)

## License

Proprietary — for institutional deployment.
