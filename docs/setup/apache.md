# Apache reverse proxy (VPS host)

GroovCRM does **not** run Apache inside Docker on production. Your VPS host Apache terminates HTTP/HTTPS and proxies to Docker services on localhost.

Vhost file: [`apache/crm.miretazam.com.conf`](../../apache/crm.miretazam.com.conf)

## Routing

| Path | Upstream |
|------|----------|
| `/api` | `http://127.0.0.1:3000/api` (backend) |
| `/` | `http://127.0.0.1:8081/` (frontend nginx) |

Ports must match `BACKEND_HOST_PORT` and `FRONTEND_HOST_PORT` in `.env` (defaults: 3000 and 8081).

## Install on Ubuntu/Debian

```bash
sudo cp apache/crm.miretazam.com.conf /etc/apache2/sites-available/
sudo a2enmod proxy proxy_http headers
sudo a2ensite crm.miretazam.com
sudo systemctl reload apache2
```

## TLS

Use Certbot on the host:

```bash
sudo certbot --apache -d crm.miretazam.com
```

## Local dev (Laragon / no Docker)

Point Laragon Apache at `localhost:3000` (API) and `localhost:5173` (Vite dev) with the same `ProxyPass` rules, or use Vite’s built-in `/api` proxy during development.

## Docker Apache (legacy)

[`apache/httpd.conf`](../../apache/httpd.conf) was used by an older compose setup with a containerized Apache. It is kept for reference only and is not started by the current `docker-compose.yml`.
