# OOH 신규 매체 등록 파이프라인 (운영 가이드)

**범위:** OOH (`dooh` / `static` / `mobile`) · quick-add JSON 허브 · bulk-import  
**상태:** 2026-09-23 기준 (안 A)

## 흐름 요약

1. **엑셀(또는 수기) → JSON** — `scripts/excel-to-quick-add-json.mts` (표준 컬럼: `lib/admin-media-excel-import.ts`)
2. **미리보기** — Admin 「매체 일괄 가져오기」→ **시뮬레이션 (dry-run)**  
   - Kakao 주소 보강 여부  
   - 대표 `price` vs `priceOptions` 최저가  
   - 이미지 URL 형식  
   - 유사 매체명 경고  
3. **반영** — 「실행」→ **신규는 `isActive: false`** (고객 카탈로그 비노출)  
4. **운영 검수** — 매체 모달에서 가격 옵션·이미지·설명 확인, CPM은 **표시가 SSOT** (`resolveMediaDisplayPrice`) 자동  
5. **게시** — 검수 통과 후 매체 목록 **노출 ON** (`isActive: true`)  
6. **데이터 품질 이상** — metrics gate / Phase B 규칙에 걸리면 `reviewStatus: flagged` (고객 미노출, `isActive`와 별개)

## Computed / lockdown

KR 매체는 `dailyFootfall`, `impressions`, `cpm`, `visibilityScore` 등 **수기 입력 불가**.  
엑셀·JSON·bulk-import 모두 API에서 strip. 엑셀 변환기도 Computed 컬럼은 **무시(경고)**.

## FactSheet 백필

Admin create / bulk-import **경로는 `media_fact_sheets` 행을 자동 생성하지 않음**.  
SOV·정밀 노출·coverage는 PR3 백필/엔진이 Fact+Signal을 사용.

| 시점 | 권장 |
|------|------|
| **등록 직후 (소량)** | 좌표·규격 확정된 매체만 `scripts/backfill-media-layers.ts` dry-run → 필요 시 execute |
| **대량 등록 배치 후** | 주 1회 또는 50건 단위로 backfill + `scripts/recompute-all-media.ts` (운영 정책에 맞게) |
| **SOV 수치 확정 전** | v1 엔진은 class default SOV — FactSheet `spotDurationSec`/`loopDurationSec` 입력 후 재계산 |

## API 참고

- `POST /api/admin/medias/bulk-import` — `{ items, matchKey?, dryRun? }`
- 신규 create: `isActive: false`, `catalogChannel` offline
- 온라인(`MediaOnlineSpec`)은 **이 파이프라인 대상 아님**

## 관련 코드

- `lib/media-quick-add.ts` — JSON 스키마  
- `lib/admin-media-excel-import.ts` — 엑셀 매핑  
- `lib/admin-bulk-import-preview.ts` — dry-run 체크리스트  
- `lib/media/locked-fields.ts` — lockdown  
- `lib/media-metrics.ts` — CPM/표시가 SSOT  

## 보류 (별도 이슈)

- `Media.visibilityScore` vs `MediaComputedMetric.visibilityScore` 동기화  
- Admin AI translate(Anthropic) 비용·정책  
