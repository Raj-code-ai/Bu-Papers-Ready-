# Phase 5 — Student APIs

## Deliverables

Public (no-login) endpoints under `/api/v1/public`:

| Method | Path | Purpose |
|--------|------|---------|
| GET | `/public/papers` | Browse / search / filter |
| GET | `/public/papers/latest` | Latest uploads |
| GET | `/public/papers/popular` | Popular papers |
| GET | `/public/papers/:id` | Paper detail |
| GET | `/public/papers/:id/view` | View URL + view counter |
| GET | `/public/papers/:id/download` | Download URL + download counter |
| GET | `/public/stats` | Totals |
| GET | `/public/taxonomy` | Enabled filters + website/feature flags |

Filters honor feature toggles and enabled taxonomy only. Soft-deleted / draft papers are never exposed.

## Transfer Status

Still **not** copying into `BU papers( Backend)`.

## Next

Phase 6 — Admin APIs
