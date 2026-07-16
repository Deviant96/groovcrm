# Docker deployment

Target host: **crm.miretazam.com**

## Services

| Service | Image / build | Role |
|---------|---------------|------|
| `db` | postgres:16-alpine | Persistent volume `pgdata` |
| `backend` | `./backend` | API + migrate + seed on start |
| `frontend` | `./frontend` | Built SPA served by nginx |
| `apache` | httpd:2.4-alpine | Reverse proxy on port 80 |

## Steps

1. Copy env file:

```bash
cp .env.example .env
```

2. Set strong values for:

- `JWT_ACCESS_SECRET`
- `JWT_REFRESH_SECRET`
- `ADMIN_PASSWORD`
- `POSTGRES_PASSWORD`
- `CORS_ORIGIN=https://crm.miretazam.com`

3. Build and start:

```bash
docker compose up -d --build
```

4. Point DNS `crm.miretazam.com` at the host. Terminate TLS at your edge (Laragon / Cloudflare / certbot) and forward HTTP to the Apache container, or add TLS vhosts as needed.

## Apache routing

Configured in [`apache/crm.miretazam.com.conf`](../../apache/crm.miretazam.com.conf):

- `/api` → `backend:3000`
- `/` → `frontend:80` (SPA)

## Persistence

PostgreSQL data lives in the Docker volume `pgdata`.
