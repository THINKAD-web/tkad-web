# Verify: desktop filterbar unify (TOOLBAR_CTRL_H = 36px)

## After (1440×900)

| Page | filter | sort | segment | view | map |
|------|--------|------|---------|------|-----|
| /media | 36 | 36 | 36 (btns 36) | 36 | 36 |
| /media/map | 36 | 36 | — | 36 | — |
| /media mobile 390 | 36 | 36 | 36 | 36 | 36 |

## Before → After (/media)

| Control | Before | After |
|---------|--------|-------|
| 필터 | 30.5 | 36 |
| 정렬 | 31.0 | 36 |
| 세그먼트 버튼 | 34.0 | 36 |
| 뷰모드 | 26.5 | 36 |
| 지도 | 30.5 | 36 |
| spread | 9.5 | 0 |

## Artifacts

- `before-after-compare.png` — table + crops
- `after-media-*.png`, `after-map-*.png`, `after-mobile-toolbar.png`
- `report.json`
