# Phase 2 — Backend Foundation

## Deliverables

- Express application factory (`src/app.js`)
- HTTP bootstrap with graceful shutdown (`src/server.js`)
- Environment loader with typed parsing (`src/config/env.js`)
- Winston logger + Morgan HTTP logging
- MongoDB connection helper (optional until URI provided)
- Helmet, CORS (localhost:3011), compression, cookie-parser
- express-mongo-sanitize
- Global rate limiting
- Request ID middleware
- Maintenance mode middleware (foundation)
- Central AppError + asyncHandler + API response helpers
- Pagination/sort utilities
- Health liveness + readiness endpoints
- Swagger UI at `/api/docs`
- Backend `.env` for local development (port **3008**, frontend **3011**)

## Verify

```bash
cd backend
npm install
npm run dev
```

Then open:
- http://localhost:3008/
- http://localhost:3008/api/v1/health
- http://localhost:3008/api/v1/health/ready
- http://localhost:3008/api/docs

## Transfer Status

Still **not** copying into `BU papers( Backend)`.

## Next

Phase 3 — Authentication
