# Backend

Backend business logic lives in `backend/services`, grouped by domain. Keep database
access and reusable business rules here instead of duplicating them in API handlers.

`app/api/**/route.ts` remains the Next.js HTTP entry layer: validate/request parsing,
call a backend service, and translate its result into an HTTP response. Keeping these
route files preserves the existing API URLs.

Current service domains:
- `services/auth`: credential verification and login rate limiting.

## Frontend

The UI remains in `components/`, grouped by layout, feature, and view. Next.js page
entry points stay in `app/`. Shared client-safe helpers belong in `lib/`; do not import
server-only services or Prisma modules into client components.

When adding a feature, keep its UI under `components/<feature>/`, reusable business
logic under `backend/services/<feature>/`, and its HTTP adapter under `app/api/<feature>/`.
