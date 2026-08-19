# PR-3 Phase 3-3 — Scoring + UI (preview 검증)

**상태:** ✅ preview dry-run 검증 완료 · merge 대기 (재한 확인)

---

## PR 범위

| 영역 | 파일 |
|------|------|
| defaults + bridge | `lib/metrics/defaults.ts`, `demo-age-bridge.ts`, `parse-target-age.ts` |
| backfill | `scripts/backfill-pr3-phase3-demo.mts` |
| catalog | `lib/media-data.ts`, `lib/public-media-catalog.ts` (demo 스냅샷 노출) |
| scoring | `lib/planner/brief/scoring.ts` |
| UI | `brief-step-two.tsx`, `brief-quick-rank.tsx`, `data-quality-badge.tsx` |
| tests | `demo-defaults.test.ts`, `mix.test.ts` |
| verify | `scripts/verify-pr3-phase3-scoring.mts` |

---

## Preview 검증 — "3천만원 서울경기 2030 여성 2주"

DB: preview `ep-shiny-sun` · active KR 804 · 서울·경기 후보 582

| 체크 | 이전 조사 | 이번 |
|------|-----------|------|
| `withTargetAxis` | **0** | **582** ✅ |
| 여성 vs 남성 Top10 동일 | **true** | **false** ✅ |
| 2030 vs 50s+ Top10 동일 | — | **false** ✅ |

### class share (2030 여성) — 승인 검산표 일치

| class | share |
|-------|-------|
| subway_psd | **30.2%** (1위) |
| dooh_mid | 27.6% |
| bus_exterior / subway_light | 27.0% |
| airport | 26.0% |
| static_other | 17.6% |

JSON: [`pr3-phase3-33-scoring-verify-preview.json`](pr3-phase3-33-scoring-verify-preview.json)

---

## UI

- ~~"성별 데이터 준비 중 — 미반영"~~
- → "성별·연령은 매체 유형·등록 정보 기반 추정치입니다" + `[추정]` 배지

---

## Prod backfill (3-2, 이미 execute)

827건 demo 스냅샷 반영 완료. 이 PR merge 후 prod planner는 DB demo + scoring 연동.
