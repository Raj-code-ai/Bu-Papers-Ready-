# Architecture Overview — Academic Resource Management System

## 1. Purpose

ARMS is a multi-tenant-ready academic resource platform that lets students discover and download PDF resources, admins manage uploads and metadata, and super admins govern academic taxonomy, storage, security, and system health.

## 2. High-Level Architecture

```
┌─────────────────────┐     HTTPS/JSON      ┌──────────────────────────────┐
│  React Frontend     │◄───────────────────►│  Express API Gateway         │
│  Vite :3011         │                     │  Node.js :3008               │
│  Tailwind / Router  │                     │  Helmet / CORS / Rate Limit  │
└─────────────────────┘                     └──────────────┬───────────────┘
                                                           │
                    ┌──────────────────────────────────────┼────────────────┐
                    │                                      │                │
                    ▼                                      ▼                ▼
           ┌────────────────┐                   ┌─────────────────┐  ┌─────────────┐
           │ Controllers    │                   │ JWT Auth        │  │ Swagger     │
           │ Validators     │                   │ RBAC Middleware │  │ OpenAPI     │
           └───────┬────────┘                   └─────────────────┘  └─────────────┘
                   │
                   ▼
           ┌────────────────┐
           │ Service Layer  │◄────── Storage Abstraction ──────► Cloudinary / S3 / GCS
           │ Business Logic │
           └───────┬────────┘
                   │
                   ▼
           ┌────────────────┐
           │ Repositories   │
           │ Mongoose Models│
           └───────┬────────┘
                   │
                   ▼
           ┌────────────────┐
           │ MongoDB Atlas  │
           └────────────────┘
```

## 3. Architectural Style

- **Layered Clean Architecture** with MVC + Service + Repository
- **Dependency inversion** for storage providers and email providers
- **Configuration-driven** academic structure and feature toggles (no hardcoding)
- **Event-friendly audit trail** for every security-relevant action

## 4. Bounded Contexts

| Context | Responsibility |
|---------|----------------|
| Identity & Access | Auth, JWT, 2FA, lockout, password reset, RBAC |
| Academic Taxonomy | Levels, programmes, departments, semesters/classes, subjects, resource types, years |
| Resource Management | Papers/PDFs, metadata, soft delete, recycle bin, duplicates |
| Storage | Quotas, policies, provider abstraction, monitoring |
| Analytics | Views, downloads, popularity, reports |
| System Ops | Health, backups, notifications, audit logs, settings |

## 5. Request Flow

1. Client hits `http://localhost:3011`
2. Axios calls `http://localhost:3008/api/v1/...`
3. Morgan logs HTTP; Winston logs application events
4. Security middlewares (Helmet, CORS, rate limit, XSS, injection guards)
5. express-validator validates input
6. Auth/RBAC middleware (skipped for public student browse endpoints)
7. Controller → Service → Repository → MongoDB / Storage
8. Standardized JSON response + status codes
9. Audit logger records mutating actions

## 6. Port Policy

| Process | Port | Notes |
|---------|------|-------|
| Frontend | **3011** | Vite dev server / nginx in production |
| Backend | **3008** | Express REST API + Swagger |

## 7. Non-Functional Requirements

| Concern | Approach |
|---------|----------|
| Scalability | Stateless API, indexed MongoDB queries, pagination, cloud object storage |
| Security | JWT, bcrypt, Helmet, rate limits, CSRF, audit, lockout, Super Admin 2FA |
| Maintainability | Layered modules, SOLID, shared validators, documented APIs |
| Observability | Winston, Morgan, health dashboards, error logs |
| Recoverability | Soft delete, recycle bin, scheduled backups + restore |

## 8. Deployment Topology (Target)

```
Docker Compose
  ├── frontend (nginx serving Vite build) :3011
  ├── backend (Node) :3008
  ├── (optional) redis / mailhog for local
  └── MongoDB Atlas (external managed)
       Cloudinary (external managed)
```

## 9. Phase Gate

Phase 1 delivers this architecture, folder layout, env contract, role matrix, data model blueprint, API surface map, and storage abstraction design. Implementation begins in Phase 2.
