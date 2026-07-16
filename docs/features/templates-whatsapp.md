# Templates & WhatsApp

## Templates

Variables:

- `{{company}}`
- `{{instagram}}`
- `{{website}}`
- `{{phone}}`
- `{{score}}`

Live preview updates as you type. Categories: Website Offer, SEO, Branding, Maintenance, Follow Up, General.

## WhatsApp generator

Builds `https://wa.me/{phone}?text={encoded_message}` after normalizing Indonesian numbers (`08…` → `62…`).

Actions:

- Open in new tab
- Copy link

Logs `MESSAGE_GENERATED` and `TEMPLATE_USED` activities; updates `last_contact_date`.
