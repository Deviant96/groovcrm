# Extensibility

GroovCRM is intentionally shaped so future work can plug in without rewriting core tables.

## AI (not built yet)

Add an `integrations/` or `ai/` service module that consumes `Prospect` + `Template` and returns suggestions. Store AI outputs as activities (`metadata.source = 'ai'`) or a future `ai_runs` table keyed by `prospect_id`.

## Integrations

Keep outbound adapters behind interfaces (WhatsApp Business, Google Sheets, n8n webhooks). Controllers should not call third-party SDKs directly.

**Instagram lead extension** — inbound integration via `POST /api/prospects/instagram-lead` and `GET /api/prospects/lead-index`. Auth uses the same JWT login/refresh as the SPA; tokens are stored in the extension.

## CRM enhancements

- Kanban: reuse `status` enum as columns; no schema change required for a board view
- Tags / custom fields: add join tables (`tags`, `prospect_tags`, `custom_field_definitions`) later
- Attachments: new table with `prospect_id` + storage key
- Saved filters: JSON blob per user

## Team

`User` already exists. Add `role`, membership, and `activities.user_id` when multi-user lands.

## Automation

Prefer a job queue (BullMQ / n8n) listening to domain events emitted from services (`STATUS_CHANGED`, `FOLLOW_UP_CHANGED`) rather than embedding schedulers in Express handlers.
