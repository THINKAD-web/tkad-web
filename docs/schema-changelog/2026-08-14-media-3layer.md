# 매체 스키마 3계층 확장

**날짜**: 2026-08-14  
**PR**: feat/media-schema-3layer  
**후속**: PR3 백필 → PR4 어드민 UI → PR5 계산 엔진 v0

## 변경 요약

`Media` 테이블에 3개 자매 테이블 추가. 기존 71개 필드 무변경.

## 신규 테이블

- `media_fact_sheets` — MediaFactSheet (1:1, optional)
- `media_external_signals` — MediaExternalSignal (1:N)
- `media_computed_metrics` — MediaComputedMetric (1:1, optional)

## 신규 Enum

- `ReliabilityGrade` (A / B / C)
- `DimensionSource` (MEASURED / PARSED_FROM_TEXT / ESTIMATED_MEDIAN / UNKNOWN)

## PR1 위임 반영

- `visibilityScore` → `MediaComputedMetric` (Computed 계층)
- Operational 필드 → `Media` 본체 유지 (별도 테이블 없음)
- `DimensionSource` enum 추가 (규격 결측 3단 대응 준비)
- `stationCode` 표준 → PR3 착수 전 재한 확정 예정

## 스코프 (문서)

- **Phase 1**: 서울 지하철 `stationCode` (지방 도시철도·환승역은 Phase 2)
- **stationLineCode**: 환승역 노선별 구분용 필드만 스키마 준비

## 미결 사항

- stationCode 값 체계 (재한 확인 중)
- Neon Preview 브랜치명 및 migrate 적용 시점

## 다음 단계

PR3에서 기존 `Media` 값을 신규 테이블로 백필. 백필은 `--dry-run` 우선.

## Migration

- 파일: `prisma/migrations/20260814140000_add_media_layers/migration.sql`
- 생성: `prisma migrate diff` (DB 미적용)
- Preview/프로덕션 적용: `pnpm prisma migrate deploy` (재한 승인 후)
