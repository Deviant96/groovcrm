# Environment variables

## Backend / Compose

| Variable | Purpose |
|----------|---------|
| `DATABASE_URL` | Prisma PostgreSQL connection string |
| `JWT_ACCESS_SECRET` | Access token signing secret |
| `JWT_REFRESH_SECRET` | Refresh token signing secret |
| `JWT_ACCESS_EXPIRES_IN` | e.g. `15m` |
| `JWT_REFRESH_EXPIRES_IN` | e.g. `7d` |
| `JWT_REFRESH_REMEMBER_EXPIRES_IN` | e.g. `30d` when remember me is checked |
| `PORT` | API port (default `3000`) |
| `CORS_ORIGIN` | Comma-separated allowed origins |
| `ADMIN_EMAIL` | Seeded admin email |
| `ADMIN_PASSWORD` | Seeded admin password |
| `ADMIN_NAME` | Seeded admin display name |
| `NODE_ENV` | `development` / `production` |

## Compose-only

| Variable | Purpose |
|----------|---------|
| `POSTGRES_USER` | DB user |
| `POSTGRES_PASSWORD` | DB password |
| `POSTGRES_DB` | Database name |
| `POSTGRES_PORT` | Host localhost port for Postgres (default `5432`) |
| `BACKEND_HOST_PORT` | Host localhost port for API (default `3001`; must match Apache vhost) |
| `FRONTEND_HOST_PORT` | Host localhost port for SPA (default `8081`; must match Apache vhost) |
