# PR5 engine v0 verify SQL

**Environment**: production (ep-holy-cloud-ah6w4cml-pooler)

## Results

| Check | Expected | Actual | Pass |
|-------|----------|--------|:----:|
| v0-fallback count | 821 | 821 | ✓ |
| legacy-migration-v1 count | 0 | 0 | ✓ |
| daily_impressions mismatch (edge excluded) | 0 | 0 | ✓ |
| known exception (legacy NULL, daily > 0) | 1 | 1 | ✓ |
| cpm mismatch | 0 | 0 | ✓ |
| grade C | 821 | 821 | ✓ |
| max(computed_at) | recent | 2026-08-14T11:36:41.394Z | — |

**Overall**: PASS

## Known Exception (PR3 백필 유래)

- 1건: `mediaId=cmp3cfdsy000004jo3v38d9f4`, name="헤스티아 (익스클루시브) 버스 외부 LED 전광판"
- `legacy_daily_impressions=NULL`, `daily_impressions=1,733,333`
- 원인: `daily_footfall` NULL이지만 `impressions=52,000,000` 존재
- 백필 스크립트 `toComputedMetric()` (impressions/30 fallback)에 의해 저장
- v0 pass-through는 이 값 유지 (변경 없음)
- 향후 v1에서도 동일 규칙 적용 예정
