# A1a 수동 검증 대기 — 2주 매핑 제외 5건

**상태**: 수동 검증 대기 (재한님 / 매체 담당자 확인 후 개별 반영)  
**생성**: 2026-07-28  
**배경**: A1a 읽기 매핑(`2주` → `biweekly`) 배포 시, 단독 2주 옵션 + root `pricePeriod=month` 동일 금액 패턴 5건은 **월단가 오표기 vs 2주 패키지** 구분이 필요해 자동 매핑에서 제외.

## 제외 매체 (자동 `2주→biweekly` 미적용)

| ID | 매체명 | 2주 금액 | root | 비고 |
|----|--------|----------|------|------|
| `cmrep774v000304jrv9zmylys` | 부산 해운대 엘리시아 호텔 외벽 광고 | ₩60,000,000 | 60M/month | 단독 2주 옵션, desc `2주, 60,000,000` |
| `cmrg5360d000104l7s0vllbeq` | 강남 센타빌딩 대형 외벽 아트월 광고 | ₩120,000,000 | 120M/month | 단독 2주, desc `2주` |
| `cmrpvsn0k000p04l7ddhs9bwc` | HD한양주유소 빌보드 광고 | ₩48,000,000 | 48M/month | desc `2주 집행 기준` |
| `cmo5yramn000504jul2h2i3y6` | 시청 프레지던트호텔 아트월 광고 | ₩120,000,000 | 120M/month | desc `아트월 광고 2주` |
| `cmo61lsrg000204juraw6dpsw` | 이태원역 178 외벽 아트월 광고 | ₩70,000,000 | 70M/month | desc `빌보드 광고 2주` |

## 확인 질문 (계약서 / 매체 등록 원본)

1. 표시 금액이 **2주 패키지 총액**인가, **월 단가**인가?
2. 2주 패키지가 맞다면 → Admin에서 `period=biweekly` + root `pricePeriod` 정정 후 코드 제외 목록에서 해제.
3. 월 단가가 맞다면 → `period=month`로 옵션 수정 (현재 `2주` 문자열 제거).

## 코드 위치

- 제외 SSOT: `lib/media-price-period-read.ts` → `A1A_MANUAL_REVIEW_BIWEEKLY_MEDIA`
- 확인 후: DB/Admin 정정 + 제외 배열에서 해당 ID 제거

## A1a 적용 범위 (이 5건 제외)

- `1일` → `day`
- `7일` / `1주` → `week`
- `15일` / `2주` → `biweekly` (제외 5건은 `month` 폴백 유지)
- `1개월` / `월` / `monthly` → `month` (읽기)

A1b/A1c (`2개월`, `시즌`, `campaign`, `10일` 등) — **매핑 없음**, `scripts/report-a1b-a1c-periods.mjs` 리포트만.
