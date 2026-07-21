# Instagram Chrome extension

The `instagram-lead-gen-chrome-extension/` package captures Instagram profile leads and saves them into GroovCRM (replacing the old Google Sheets webhook).

## Flow

1. Sign in via extension Options (JWT access + refresh tokens in `chrome.storage.local`).
2. On an Instagram profile, the content script extracts handle, name, website, phone, links, and score.
3. Background worker loads `GET /api/prospects/lead-index` for duplicate/visited checks.
4. Save / update / mark visited → `POST /api/prospects/instagram-lead` (upsert by handle).

## Field mapping

`handle` → `instagramHandle`, `name` → `companyName`, `phone` → `phoneNumber`, plus `website`, `hasWebsite`, `score`, `sourceUrl`, `visited`. Link list is written into `notes` on create.

See `instagram-lead-gen-chrome-extension/documentation.md` for setup.
