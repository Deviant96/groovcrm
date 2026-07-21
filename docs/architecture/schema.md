# Database schema

## Enums

**ProspectStatus:** `NEW`, `SENT`, `REPLIED`, `INTERESTED`, `MEETING`, `PROPOSAL`, `CLOSED_WON`, `CLOSED_LOST`

**TemplateCategory:** `WEBSITE_OFFER`, `SEO`, `BRANDING`, `MAINTENANCE`, `FOLLOW_UP`, `GENERAL`

**ActivityType:** `IMPORTED`, `EDITED`, `STATUS_CHANGED`, `MESSAGE_GENERATED`, `FOLLOW_UP_CHANGED`, `TEMPLATE_USED`, `NOTE_ADDED`

## Tables

### users
id, name, email (unique), password_hash, created_at, updated_at

### refresh_tokens
id, user_id → users, token_hash, expires_at, created_at

### prospects
id, company_name, instagram_handle, website, phone_number, source_url, score, has_website, visited, status, follow_up_date, last_contact_date, notes, created_at, updated_at

Indexed on company, Instagram, website, phone, status, follow_up_date, score, visited.

### templates
id, name, category, message, created_at, updated_at

### notes
id, prospect_id → prospects (cascade), content, created_at

### activities
id, prospect_id → prospects (cascade), type, metadata (JSON), created_at

Activities are written inside prospect/template/import service methods so history stays consistent even if the UI changes.
