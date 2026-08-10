# Folder Structure

```
academic-resource-management-system/
│
├── README.md
├── .gitignore
├── .env.example
│
├── docs/
│   ├── architecture/
│   │   ├── OVERVIEW.md
│   │   ├── FOLDER_STRUCTURE.md
│   │   ├── CLEAN_ARCHITECTURE.md
│   │   ├── STORAGE_ABSTRACTION.md
│   │   ├── ROLES_PERMISSIONS.md
│   │   ├── SYSTEM_CONFIGURATION.md
│   │   └── TECH_STACK.md
│   ├── api/
│   │   └── API_DESIGN.md
│   ├── database/
│   │   └── DATA_MODEL.md
│   ├── security/
│   │   └── SECURITY_ARCHITECTURE.md
│   ├── deployment/
│   │   └── DEPLOYMENT_NOTES.md
│   └── phases/
│       └── PHASE_PLAN.md
│
├── backend/
│   ├── package.json                 # Phase 2
│   ├── src/
│   │   ├── server.js                # HTTP bootstrap
│   │   ├── app.js                   # Express app factory
│   │   ├── config/                  # env, db, swagger, cors, rate-limit
│   │   ├── constants/               # roles, status codes, enums (non-business data)
│   │   ├── controllers/             # HTTP adapters
│   │   ├── services/                # Business logic
│   │   ├── repositories/            # Data access
│   │   ├── models/                  # Mongoose schemas
│   │   ├── middlewares/             # auth, rbac, errors, upload, sanitize
│   │   ├── validators/              # express-validator chains
│   │   ├── routes/                  # student / admin / superadmin / public
│   │   ├── utils/                   # helpers, response, hashing, pagination
│   │   ├── jobs/                    # cleanup, backup, notifications cron
│   │   ├── storage/
│   │   │   ├── interfaces/          # IStorageProvider contract
│   │   │   └── providers/           # cloudinary, s3, gcs adapters
│   │   ├── security/                # 2FA, csrf, lockout helpers
│   │   ├── analytics/               # metrics aggregation
│   │   ├── monitoring/              # health collectors
│   │   ├── notifications/           # alert dispatch
│   │   ├── backup/                  # dump / restore / verify
│   │   └── docs/                    # swagger definitions
│   ├── tests/
│   │   ├── unit/
│   │   └── integration/
│   ├── logs/
│   └── uploads/temp/
│
├── frontend/
│   ├── package.json                 # Phase 12
│   ├── vite.config.js
│   ├── tailwind.config.js
│   ├── index.html
│   ├── public/
│   └── src/
│       ├── main.jsx
│       ├── App.jsx
│       ├── app/                     # providers, theme
│       ├── components/
│       │   ├── common/
│       │   ├── layout/
│       │   ├── student/
│       │   ├── admin/
│       │   └── superadmin/
│       ├── pages/
│       │   ├── student/
│       │   ├── admin/
│       │   ├── superadmin/
│       │   └── auth/
│       ├── hooks/
│       ├── services/                # Axios API clients
│       ├── store/
│       ├── utils/
│       ├── routes/
│       ├── styles/
│       └── assets/
│
├── docker/
│   ├── Dockerfile.backend
│   ├── Dockerfile.frontend
│   ├── nginx.conf
│   └── docker-compose.yml           # Phase 14
│
└── scripts/
    ├── seed.js
    ├── backup.sh
    └── restore.sh
```

## Module Ownership Rules

1. Controllers never talk to MongoDB directly.
2. Services never import Express `req`/`res`.
3. Repositories never contain business rules.
4. Storage providers never know about Paper domain models — they only move bytes and return URIs/metadata.
5. Frontend pages never call Axios without going through `services/`.
