# Roles & Permissions Matrix

## Roles

| Role | Login | Code |
|------|-------|------|
| Student | No | `student` (public, implicit) |
| Admin | Yes | `admin` |
| Super Admin | Yes | `superadmin` |

## Student (Public)

| Capability | Allowed |
|------------|---------|
| Browse resources | ✅ |
| Search / filter | ✅ |
| View PDF | ✅ |
| Download PDF | ✅ |
| Latest uploads | ✅ |
| Popular papers | ✅ |
| Aggregate stats (papers/downloads/views) | ✅ |
| Upload | ❌ |
| Edit / delete | ❌ |
| Admin panels | ❌ |

## Admin

| Capability | Allowed |
|------------|---------|
| Dashboard | ✅ |
| Upload paper | ✅ |
| Bulk upload | ✅ |
| Replace PDF | ✅ |
| Edit metadata | ✅ |
| Soft delete | ✅ |
| Recycle bin (own / scoped) | ✅ |
| Upload history | ✅ |
| Storage dashboard (own) | ✅ |
| Duplicate detection | ✅ |
| Own analytics | ✅ |
| Change password | ✅ |
| Download / view statistics (own resources) | ✅ |
| Create admins | ❌ |
| Website settings | ❌ |
| System policies | ❌ |

## Super Admin

Full access including:

- Admin lifecycle (create, edit, delete, enable, disable, reset password)
- Login history, audit logs
- Storage / cloud / system health dashboards
- Backup & restore
- Academic taxonomy CRUD + reorder + enable/disable
- Degrees, departments, semesters, classes, subjects
- Paper types / resource types
- Website, security, storage, feature toggles
- Maintenance mode, cloud settings, email settings, system configuration

## RBAC Enforcement Points

1. **Route middleware** — `authenticate` + `authorize('admin'|'superadmin')`
2. **Service checks** — ownership for admin-scoped resources
3. **Feature toggles** — disable entire resource categories globally
4. **Maintenance mode** — block non–super-admin writes / optionally all public access

## Token Claims (JWT Access)

```json
{
  "sub": "<userId>",
  "role": "admin|superadmin",
  "email": "user@example.com",
  "sessionId": "<uuid>",
  "iat": 0,
  "exp": 0
}
```

Students never receive JWTs for browsing.
