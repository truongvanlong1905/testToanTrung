# PROJECT HANDOFF — TOÀN TRUNG MARKETING MANAGEMENT

## Application workspaces

- `Frontend`: Next.js frontend, port 3001.
- `Backend`: Next.js API, auth and uploads, port 3002.
- `Database`: Prisma SQLite schema/client and the existing local database.
- Web proxies `/api/*` and `/uploads/*` to API, preserving same-origin HttpOnly cookies.

See [docs/ARCHITECTURE.md](./docs/ARCHITECTURE.md) for ownership boundaries and
[docs/DEPLOYMENT.md](./docs/DEPLOYMENT.md) for setup/migration.

## Data and deployment status

- Existing SQLite file is retained at `Database/data/source.sqlite`.
- The application uses the existing SQLite file directly at
  `Database/data/source.sqlite`.
- Uploaded files currently use API local disk; configure persistent volume/object
  storage before production.
- Production admin accounts must be provisioned separately. Never seed demo accounts
  into production.
- Gemini key is optional and belongs only in the API environment.

## Authentication

Sessions use the `tt_session_token` HttpOnly cookie. The web and API must use the same
random `JWT_SECRET` of at least 32 characters. Keep secrets in local env files or the
deployment provider's secret manager, not in source control or handoff chat.
