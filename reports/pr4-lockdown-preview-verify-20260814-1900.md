# PR4 lockdown — Preview verification checklist

**Branch**: `feat/media-admin-computed-lockdown`  
**Base main SHA**: `6ac48035`  
**Generated**: 20260814-1900 (pre-Preview deploy)

## 선결 확인 (착수 전)

| 항목 | 결과 |
|------|------|
| main #383 반영 | ✅ `6ac48035` |
| baseline 스크린샷 3장 | ✅ `docs/screenshots/pr4-baseline/` |
| baseline 리포트 3종 | ✅ `reports/pr4-baseline-*`, `pr4-legacy-*`, `pr4-null-cpm-*` |
| 편집 폼 | `admin-medias-client.tsx` (모달), `media-json-edit-client.tsx` (JSON) |
| API | `PATCH /api/admin/medias/[id]`, `PUT /api/admin/medias/[id]/json`, `POST quick-add`, `POST bulk-import` |
| 로컬 build | ✅ `npm run build` PASS |

## 구현 요약

- **잠금 필드 8개**: `COMPUTED_FIELDS_LOCKED` (`lib/media/locked-fields.ts`)
- **3층 방어**: 모달 disabled · JSON strip+toast · API silently strip + `X-Locked-Fields-Stripped`
- **JSON edit**: Option A (값 표시, 저장 시 strip, toast 경고)
- **뱃지 4종**: 신뢰도 / 레거시 / 규격 미확인 / CPM unknown (`layerBadges` on list)

## Preview 자동 검증 (배포 후 실행)

```bash
# Preview URL 확정 후
node scripts/pr4-verify-lockdown.mjs --url {Preview URL} --media-id {testMediaId}

# after 스크린샷
SCREENSHOT_BASE={Preview URL} node scripts/capture-pr4-baseline-admin.mjs \
  --output docs/screenshots/pr4-after/
```

## 재한 수동 검증 (§7-2)

Preview URL 배포 후 확인:

- [ ] 리스트: 신뢰도 C, 레거시, 규격 미확인(145), CPM unknown(17) 뱃지
- [ ] 모달: 8 Computed 필드 회색+🔒, Fact 필드 편집 가능
- [ ] JSON edit: Computed 수정 후 저장 → toast, DB 값 유지
- [ ] quick-add / bulk-import: Computed 포함 JSON → 저장 성공, 값 무시
- [ ] 좌표·규격·가격·매체명 편집 저장 정상

**판정**: 모두 통과 → squash merge 승인
