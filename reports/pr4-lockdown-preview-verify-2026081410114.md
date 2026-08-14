# PR4 lockdown — Preview verification (final)

**Status**: ✅ Preview 검증 통과 (자동 10/10 + 재한 수동 §7-2)  
**PR**: [#384](https://github.com/THINKAD-web/tkad-web/pull/384)  
**Preview URL**: https://tkad-web-git-feat-media-admin-com-97f6ce-mannote-6701s-projects.vercel.app  
**Test media ID**: `cmnz82khn000004kzmu9sap6n`  
**Timestamp**: 2026081410114

## API 잠금 테스트 (자동)

| 필드 | Status | Stripped Header | DB 변경 | 판정 |
|---|---|---|---|---|
| dailyFootfall | 200 | dailyFootfall | 유지 | PASS |
| weekdayFootfall | 200 | weekdayFootfall | 유지 | PASS |
| impressions | 200 | impressions | 유지 | PASS |
| reach | 200 | reach | 유지 | PASS |
| frequency | 200 | frequency | 유지 | PASS |
| cpm | 200 | cpm | 유지 | PASS |
| engagementRate | 200 | engagementRate | 유지 | PASS |
| visibilityScore | 200 | visibilityScore | 유지 | PASS |
| name (control) | 200 | (없음) | 변경됨 | PASS |
| latitude (control) | 200 | (없음) | 변경됨 | PASS |

**잠금 필드**: **8/8 PASS**  
**Control 필드**: **2/2 PASS**  
**Summary**: **10/10 PASS**

## 재한 수동 검증 (§7-2)

- [x] 리스트 뱃지 4종
- [x] 모달 8 Computed 필드 잠금 + Fact 편집
- [x] JSON edit strip + toast
- [x] quick-add / bulk-import Computed 무시
- [x] 좌표·규격·가격·매체명 저장

## Before / After 스크린샷

| # | Before (baseline) | After (PR4) |
|---|-------------------|-------------|
| 1 | `docs/screenshots/pr4-baseline/01-admin-medias-list.png` | `docs/screenshots/pr4-after/01-admin-medias-list.png` |
| 2 | `docs/screenshots/pr4-baseline/02-admin-medias-edit-full.png` | `docs/screenshots/pr4-after/02-admin-medias-edit-full.png` |
| 3 | `docs/screenshots/pr4-baseline/03-admin-medias-edit-legacy-fields-zoom.png` | `docs/screenshots/pr4-after/03-admin-medias-edit-legacy-fields-zoom.png` |

## Merge 승인

Preview 자동·수동 검증 완료 → **main squash merge 승인**

프로덕션 배포 후:

```bash
node scripts/pr4-verify-lockdown.mjs --url https://tkad.co.kr --media-id cmnz82khn000004kzmu9sap6n
```
