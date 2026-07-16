# Local development

## Prerequisites

- Node.js 22+
- PostgreSQL 16+
- npm 10+

## 1. Database

Create a database and user (example):

```sql
CREATE USER groovcrm WITH PASSWORD 'groovcrm';
CREATE DATABASE groovcrm OWNER groovcrm;
```

Or start only Postgres via Docker Compose:

```bash
docker compose up -d db
```

## 2. Backend

```bash
cd backend
cp .env.example .env
# edit DATABASE_URL / JWT secrets / ADMIN_* as needed
npm install
npx prisma migrate deploy
npx prisma db seed
npm run dev
```

API: `http://localhost:3000/api/health`

Default admin (from `.env`):

- Email: `admin@groovcrm.local`
- Password: `ChangeMe123!`

## 3. Frontend

```bash
cd frontend
npm install
npm run dev
```

App: `http://localhost:5173` (Vite proxies `/api` → backend)

## Useful scripts

From repo root:

```bash
npm run dev:backend
npm run dev:frontend
```
