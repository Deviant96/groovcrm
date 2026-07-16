# Docker deployment

Target host: **crm.miretazam.com**

Production uses **host Apache** on the VPS (port 80/443). Docker runs only the app stack; no Apache container.

## Services

| Service | Image / build | Role |
|---------|---------------|------|
| `db` | postgres:16-alpine | Persistent volume `pgdata` (localhost:5432) |
| `backend` | `./backend` | API + migrate + seed on start (localhost:3001) |
| `frontend` | `./frontend` | Built SPA via nginx (localhost:8081) |

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

4. Install the host Apache vhost from [`apache/crm.miretazam.com.conf`](../../apache/crm.miretazam.com.conf):

```bash
sudo cp apache/crm.miretazam.com.conf /etc/apache2/sites-available/
sudo a2enmod proxy proxy_http headers
sudo a2ensite crm.miretazam.com
sudo systemctl reload apache2
```

5. Point DNS `crm.miretazam.com` at the VPS and add TLS (e.g. Certbot on host Apache).

## Host Apache routing

- `/api` → `http://127.0.0.1:3001/api` (backend; default `BACKEND_HOST_PORT`)
- `/` → `http://127.0.0.1:8081/` (frontend SPA)

Override ports via `BACKEND_HOST_PORT` and `FRONTEND_HOST_PORT` in `.env` if needed. Keep host Apache `ProxyPass` in sync.

## Persistence

PostgreSQL data lives in the Docker volume `pgdata`.
