# Verify: admin gallery image-loss fix

## Results

| Check | Result |
|-------|--------|
| Concurrent upload race (stale vs functional) | BEFORE count=2 / AFTER count=5 |
| Idle save on primary∈extracted DB sample | uniquePreserved=true, sameSet=true |
| CDN purge without `purgeImageUrls` | toPurge=0 (skipped) |
| CDN purge with intentional list | toPurge includes removed URL |
| Unit tests (`tsx --test` gallery + purge) | pass |
| Build | see CI / local `npm run build` |

## Artifacts

- `report.json` — machine-readable evidence
- `preview.html` / `before-after.png` — race + DB + purge gate
- DB sample: `cmrwirjcs000504jlnlr684lo` (idle-save simulation only; no write)

## Notes

- Intentional gallery ✕ still calls `/api/admin/upload/bunny/delete` immediately and sends `purgeImageUrls` on save.
- Accidental form shrink without intent no longer triggers Bunny CDN delete.
