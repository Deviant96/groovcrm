# API reference

Base path: `/api`

All routes except `/auth/login`, `/auth/refresh`, `/auth/logout`, and `/health` require:

`Authorization: Bearer <accessToken>`

## Health

- `GET /health` → `{ status, service }`

## Auth

- `POST /auth/login` `{ email, password, rememberMe? }`
- `POST /auth/refresh` `{ refreshToken }`
- `POST /auth/logout` `{ refreshToken? }`
- `GET /auth/me`
- `POST /auth/change-password` `{ currentPassword, newPassword }`

## Prospects

- `GET /prospects` query: search, status, hasWebsite, hasPhone, hasInstagram, hasWebsiteUrl, scoreMin/Max, followUp, page, pageSize, sortBy, sortDir
- `GET /prospects/lead-index` → `{ leads: [{ id, handle, website, phone, visited }] }` (Instagram extension)
- `POST /prospects/instagram-lead` `{ handle, name?, website?, phone?, links?, hasWebsite?, score?, sourceUrl?, visited? }` — upsert by Instagram handle
- `GET /prospects/follow-ups`
- `GET /prospects/stats`
- `GET /prospects/search?q=`
- `GET /prospects/:id`
- `POST /prospects`
- `PATCH /prospects/:id`
- `DELETE /prospects/:id`
- `POST /prospects/bulk/status` `{ ids, status }`
- `POST /prospects/bulk/delete` `{ ids }`
- `POST /prospects/:id/notes` `{ content }`
- `DELETE /prospects/:id/notes/:noteId`

## Templates

- `GET /templates`
- `POST /templates`
- `GET /templates/:id`
- `PATCH /templates/:id`
- `DELETE /templates/:id`
- `POST /templates/preview` `{ message, company?, … }`

## WhatsApp

- `POST /whatsapp/generate` `{ prospectId, templateId?, message? }` → `{ url, message, phone }`

## Import / export

- `POST /import/parse` multipart `file`
- `POST /import/preview` `{ mapping, rows }`
- `POST /import/confirm` `{ mapping, rows }` — full replace
- `GET /export/csv`
