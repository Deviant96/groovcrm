# Instagram Lead Gen — Chrome Extension

Captures Instagram profile leads and upserts them into **GroovCRM** (no Google Sheets).

## Architecture

```
Instagram profile page
  → Content script (extract + score + widget)
  → Background service worker (JWT auth)
  → GroovCRM API
       GET  /api/prospects/lead-index
       POST /api/prospects/instagram-lead
```

## Setup

1. Load the extension in Chrome (`chrome://extensions` → Load unpacked → this folder).
2. Open **extension Options**.
3. Set API base URL:
   - Local: `http://localhost:3000/api`
   - Production: `https://crm.miretazam.com/api`
4. Sign in with your GroovCRM admin email/password (`remember me` keeps refresh for ~30 days).
5. Open any Instagram profile — the IG Lead panel appears.

If you are not signed in, the panel prompts you to open settings.

## Data mapping

| Extension field | GroovCRM field |
|-----------------|----------------|
| `handle` | `instagramHandle` |
| `name` | `companyName` (falls back to handle) |
| `website` | `website` + `hasWebsite` |
| `phone` | `phoneNumber` |
| `score` | `score` |
| `sourceUrl` | `sourceUrl` |
| `visited` | `visited` |
| `links` | stored in `notes` on create |

Save / Update / Mark visited all call the same upsert endpoint (match by Instagram handle, case-insensitive).

## Lead scoring (unchanged)

| Condition | Points |
|-----------|--------|
| No website | +50 |
| Has links | +10 |
| Has name | +5 |
| Linktree | -10 |

## Duplicate + visited

On profile load the extension fetches `GET /api/prospects/lead-index` and builds a local handle set for:

- “Already exists” / Update Lead
- Greying out visited suggested accounts

## Legacy Google Sheets

`Code.gs` is kept only as a historical reference. The extension no longer calls Apps Script.

## Security notes

- Tokens live in `chrome.storage.local` (`gc_access_token`, `gc_refresh_token`).
- Access JWT refreshes automatically on 401; re-login when the refresh token expires or is revoked.
- Prefer production HTTPS API URLs outside local development.
