# Deployment Guide

## Local development

```bash
# Backend (port 3008)
cd backend
cp ../.env.example .env   # then set MONGODB_URI + Cloudinary keys
npm install
npm run dev

# Frontend (port 3011)
cd frontend
npm install
npm run dev
```

- Student UI: http://localhost:3011
- API: http://localhost:3008/api/v1
- Swagger: http://localhost:3008/api/docs

Bootstrap Super Admin (created on DB connect):
- Email: `superadmin@arms.local`
- Password: `ChangeMe!SuperAdmin1`
- Enable 2FA immediately after first login.

## Docker

```bash
cd docker
docker compose up --build
```

## Production checklist

1. Set strong JWT / CSRF secrets
2. Set `COOKIE_SECURE=true` behind HTTPS
3. Configure MongoDB Atlas network access
4. Configure Cloudinary (or switch storage provider later)
5. Restrict CORS origins to the real frontend domain
6. Run `npm test` in backend
7. Verify backups (`mongodump` recommended on host)
8. Confirm Super Admin 2FA is enabled
9. Review storage policy quotas and recycle retention

## Transfer note

Build currently lives in:

`...\academic-resource-management-system`

Transfer into `BU papers( Backend)` only when the user explicitly requests it.
