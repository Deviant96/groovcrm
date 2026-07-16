# Apache reverse proxy

Production vhost lives in [`apache/crm.miretazam.com.conf`](../../apache/crm.miretazam.com.conf).

Inside Docker Compose, Apache listens on host port `HTTP_PORT` (default 80) and proxies:

- `/api` → backend container
- `/` → frontend nginx container

For Laragon/Windows hosts without Docker Apache, you can mirror the same ProxyPass rules in Laragon’s Apache `sites-enabled` pointing at `localhost:3000` (API) and `localhost:5173` or a built static folder (SPA).
