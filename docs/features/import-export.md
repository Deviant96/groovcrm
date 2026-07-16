# CSV import & export

## Import

1. Upload UTF-8 CSV
2. Map CSV headers → prospect fields (auto-suggest)
3. Preview: valid/skipped counts, within-file duplicates, matches against existing DB
4. Confirm: **full replace** — deletes all prospects, notes, and activities, then inserts mapped rows

Duplicate detection keys: phone, website, Instagram handle, company name.

## Export

`GET /api/export/csv` downloads the full prospects table as CSV.
