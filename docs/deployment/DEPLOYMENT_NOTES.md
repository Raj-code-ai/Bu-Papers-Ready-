# Deployment — GitHub → Render (API) + Vercel (frontend)

Repo: https://github.com/Raj-code-ai/Bu-Papers-Ready_

## 1. MongoDB Atlas

1. Create free cluster + DB user.
2. Network Access → **Allow Access from Anywhere** (`0.0.0.0/0`) so Render can connect.
3. Copy connection string → use as `MONGODB_URI` (database name `arms`).

## 2. Render (backend)

1. New **Web Service** → connect this GitHub repo.
2. Settings:
   - **Root Directory:** `backend`
   - **Build:** `npm install`
   - **Start:** `npm start`
   - Health: `/api/v1/health`
3. Set environment variables (see `.env.example` + secrets below). **Do not** set `PORT`.
4. Required secrets:
   - `MONGODB_URI`, `MONGODB_DB_NAME=arms`
   - `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET`, `CSRF_SECRET` (unique, long)
   - `CLOUDINARY_*`, `STORAGE_PROVIDER=cloudinary`
   - `NODE_ENV=production`, `COOKIE_SECURE=true`, `SWAGGER_ENABLED=false`
5. After frontend is live, set:
   - `FRONTEND_URL=https://YOUR-APP.vercel.app`
   - `CORS_ORIGINS=https://YOUR-APP.vercel.app`
   - `API_BASE_URL=https://YOUR-API.onrender.com`

Optional: `render.yaml` at repo root for Blueprint deploys.

## 3. Vercel (frontend)

1. Import the same GitHub repo.
2. Settings:
   - **Root Directory:** `frontend`
   - **Framework:** Vite
   - **Build:** `npm run build`
   - **Output:** `dist`
3. Environment:
   - `VITE_API_BASE_URL=https://YOUR-API.onrender.com/api/v1`
4. `frontend/vercel.json` rewrites all routes to `index.html` (required for `/login`, `/admin`, etc.).

Redeploy Vercel after changing `VITE_*` (build-time vars).

## 4. Cloudinary

Settings → Security → enable **Allow delivery of PDF and ZIP files**.

## 5. First login / seed

On first DB connect, bootstrap Super Admin may be created from env:

- `BOOTSTRAP_SUPERADMIN_EMAIL` / `BOOTSTRAP_SUPERADMIN_PASSWORD`

Or run seed scripts against Atlas from a trusted machine:

```bash
cd backend
# point .env at Atlas
npm run seed:superadmin -- --reset
npm run seed:admin -- --reset
npm run seed:defaults
```

Default local bootstrap (change in production):

- Super Admin: `superadmin@arms.local` / `ChangeMe!SuperAdmin1`
- Admin: `admin@arms.local` / `ChangeMe!Admin1`

## 6. Verify

- `GET https://YOUR-API.onrender.com/api/v1/health` → `status: ok`, DB connected
- Open Vercel site → `/login` loads (not Vercel NOT_FOUND)
- Login works (CORS + API URL correct)
- Upload PDF → view/download works (Cloudinary PDF delivery enabled)

## Security

Never commit `.env`. Rotate any secrets pasted in chat before production handoff.
