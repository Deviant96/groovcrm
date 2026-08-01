# Templates & WhatsApp

## Templates

Variables:

- `{{company}}`
- `{{instagram}}`
- `{{website}}`
- `{{phone}}`
- `{{score}}`

Live preview updates as you type.

**Message type** (template category): Website Offer, SEO, Branding, Maintenance, Follow Up, General.

**Prospect categories**: map each template to one or more prospect/lead categories (e.g. `Tour & Travel`). When generating WhatsApp for a prospect in that category, matching templates are suggested first. Leave empty for general use.

## WhatsApp generator

Builds `https://wa.me/{phone}?text={encoded_message}` after normalizing Indonesian numbers (`08…` → `62…`).

Template picker:

1. Templates mapped to the prospect’s category (suggested first, auto-selected when present)
2. Unmapped / general templates
3. Templates mapped to other categories

Actions:

- Open in new tab
- Copy link

Logs `MESSAGE_GENERATED` and `TEMPLATE_USED` activities; updates `last_contact_date`.
