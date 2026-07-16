# System architecture

GroovCRM is a monorepo personal CRM for prospect management and manual WhatsApp outreach.

## High-level diagram

```
Browser
  → Host Apache (crm.miretazam.com :80/:443)
      → /api/*   Backend container (127.0.0.1:3000)
      → /        Frontend container (127.0.0.1:8081)
                    → PostgreSQL (Docker network)
```

## Packages

| Path | Role |
|------|------|
| `frontend/` | Vue 3 + Vite + TypeScript + Pinia + PrimeVue + Tailwind |
| `backend/` | Express + TypeScript + Prisma + JWT auth |
| `apache/` | Host Apache vhost for VPS reverse proxy |
| `docs/` | Product and technical documentation |

## Backend layers

- **Routes** — HTTP wiring only
- **Controllers** — request/response mapping
- **Services** — business logic + activity logging
- **Validators** — Zod schemas
- **Middleware** — auth, validation, errors

## Frontend layers

- **Views** — pages
- **Components** — reusable UI
- **Stores** — Pinia state
- **Services** — API client
- **Composables / Utils / Types** — shared helpers

## Auth model

- Access JWT (~15m) in memory + `localStorage`
- Refresh JWT (7d / 30d with remember me) hashed in `refresh_tokens`
- Protected API routes use `Authorization: Bearer <access>`
- SPA interceptor refreshes on 401

## Data ownership

Single seeded admin user (personal CRM). Multi-user/roles are deferred; schema keeps `User` separate so team features can land later without rewriting prospects.
