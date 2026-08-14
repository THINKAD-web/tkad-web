(node:23620) Warning: SECURITY WARNING: The SSL modes 'prefer', 'require', and 'verify-ca' are treated as aliases for 'verify-full'.
In the next major version (pg-connection-string v3.0.0 and pg v9.0.0), these modes will adopt standard libpq semantics, which have weaker security guarantees.

To prepare for this change:
- If you want the current behavior, explicitly use 'sslmode=verify-full'
- If you want libpq compatibility now, use 'uselibpqcompat=true&sslmode=require'

See https://www.postgresql.org/docs/current/libpq-ssl.html for libpq SSL mode definitions.
(Use `node --trace-warnings ...` to show where the warning was created)
# PR5 engine v0 batch recompute (execute)

**Environment**: preview (ep-shiny-sun-ahrk7gkk-pooler)
**Git SHA**: 8d380be4d77c910ad3b00b04c4f20db8b471d5fc
**Scope**: model_version=legacy-migration-v1
**Engine**: v0-fallback

## Summary

| Metric | Count |
|--------|------:|
| Planned | 821 |
| Processed | 821 |
| modelVersion promotion | 821 |
| Value changes (should be 0 for v0) | 0 |
| Skipped | 0 |
| Failures | 0 |

## Known Exception (PR3 백필 유래)

- 1건: `mediaId=cmp3cfdsy000004jo3v38d9f4`, name="헤스티아 (익스클루시브) 버스 외부 LED 전광판"
- `legacy_daily_impressions=NULL`, `daily_impressions=1,733,333`
- 원인: `daily_footfall` NULL이지만 `impressions=52,000,000` 존재
- 백필 스크립트 `toComputedMetric()` (impressions/30 fallback)에 의해 저장
- v0 pass-through는 이 값 유지 (변경 없음)
- 향후 v1에서도 동일 규칙 적용 예정

## Verify SQL (post-execute)

Edge-case 제외 mismatch = 0, known exception = 1. See `docs/pr5-verify-sql.md`.


Wrote /Users/jaehanlee/thinkad-work/tkad-web/reports/pr5-engine-v0-preview-execute-2026081411212.md
