# Tech Stack Details

## Runtime Ports

- Frontend: **3011**
- Backend: **3008**

## Backend Packages (planned)

| Package | Purpose |
|---------|---------|
| express | HTTP framework |
| mongoose | ODM |
| jsonwebtoken | JWT |
| bcryptjs | Password hashing |
| helmet | Security headers |
| cors | CORS |
| express-rate-limit | Rate limiting |
| express-validator | Validation |
| express-mongo-sanitize | NoSQL injection protection |
| morgan | HTTP logging |
| winston | App logging |
| multer | Multipart uploads |
| cloudinary | Default storage SDK |
| swagger-ui-express / swagger-jsdoc | API docs |
| dotenv | Env loading |
| compression | Response compression |
| cookie-parser | Cookies |
| csrf-csrf or equivalent | CSRF |
| node-cron | Scheduled jobs |
| speakeasy / otplib | 2FA |
| qrcode | 2FA setup UX support |
| uuid / crypto | IDs & hashing |

## Frontend Packages (planned)

| Package | Purpose |
|---------|---------|
| react / react-dom | UI |
| vite | Bundler / dev server |
| react-router-dom | Routing |
| axios | HTTP |
| tailwindcss | Styling |
| @tailwindcss/forms (optional) | Form styles |
| lucide-react or similar | Icons (chosen at Phase 12) |
| recharts or similar | Admin charts (Phase 12) |

## DevOps

| Tool | Purpose |
|------|---------|
| Docker / Compose | Containerized deploy |
| nginx | Frontend static serving |
| GitHub Actions (optional) | CI |

## Coding Standards

- ESLint + Prettier (introduced with foundation)
- Absolute path aliases where helpful
- No business hardcoding of academic levels or resource types
- Comments explain non-obvious intent only
