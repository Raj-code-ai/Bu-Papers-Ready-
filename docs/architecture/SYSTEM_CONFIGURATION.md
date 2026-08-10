# System Configuration Map

All runtime behavior is configuration-driven. Values below are defaults; Super Admin overrides live in MongoDB and take precedence over env where marked.

## Configuration Domains

| Domain | Env Bootstrap | DB Collection | Owner |
|--------|---------------|---------------|-------|
| App ports / URLs | ✅ | — | DevOps |
| JWT / bcrypt / lockout | ✅ | security_policies | Super Admin (partial) |
| Storage provider keys | ✅ | storage_policies | Super Admin |
| Feature toggles | ✅ defaults | feature_toggles | Super Admin |
| Maintenance mode | ✅ | system_configs | Super Admin |
| Email SMTP | ✅ | email_settings | Super Admin |
| Website branding | — | website_settings | Super Admin |
| Academic taxonomy | — | academic_* collections | Super Admin |
| Backup schedules | ✅ | system_configs | Super Admin |

## Feature Toggles (dynamic)

- Notes
- Assignments
- Projects
- Lab Manuals
- Model Papers
- Results
- Announcements
- (extensible keys)

When a toggle is off:
- Public/student APIs hide that resource type
- Admin upload UI hides it
- Existing files remain in DB but are not publicly listed unless Super Admin chooses otherwise (policy flag)

## Maintenance Mode

When enabled:
- Public write-like actions blocked (N/A for students uploads already)
- Admin mutating routes return 503 except Super Admin
- Optional full public read freeze via `maintenanceBlockPublic`

## Notification Rules

| Alert | Trigger |
|-------|---------|
| Storage warning/critical | Usage crosses % thresholds |
| Budget alert | Estimated monthly cost > budget |
| Failed login alert | Repeated failures / lock events |
| Backup failure | Job status failed |
| Large upload | File size > configured threshold |
| Duplicate upload | Hash collision |
| Cloud failure | Provider healthCheck fails |

## Local Development Binding

```
FRONTEND_URL=http://localhost:3011
VITE_PORT=3011
PORT=3008
API_BASE_URL=http://localhost:3008
CORS_ORIGINS=http://localhost:3011
```
