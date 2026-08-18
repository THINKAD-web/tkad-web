# O-1 완료 보고 — Step 1 채널 토글 (OOH만 / OOH+디지털)

**브랜치:** `feat/o1-brief-channel-digital`  
**일시:** 2026-08-18

## 구현 요약

| 항목 | 내용 |
|------|------|
| Step 1 | `OOH만` / `OOH + 디지털` 토글 (`channelMode`) |
| Step 2 | `ooh_digital` 선택 시 `BriefDigitalPanel` — 디지털 예산 슬라이더·채널 그리드 |
| 재사용 | `lib/integrated/build-mix-request`, `useIntegratedMix`, `recommend-digital.ts`, `digital-channels.ts`, `digital-catalog-bridge` |
| 출처 배지 | BFF 성공 → `[실측]` / 503·네트워크 폴백 → `[벤치마크 기반]` (OOH `[추정]`과 분리) |

## env 미설정 폴백 UX (스크린샷)

`INTEGRATION_SERVICE_SECRET` / `DIGITAL_ORIGIN` 미설정(로컬 dev) 상태에서 Playwright 캡처:

- 경로: `reports/screenshots-o1-fallback/`
  - `01-step1-channel-toggle.png` — Step 1 채널 토글
  - `02-step2-digital-panel.png` — Step 2 디지털 패널
- 캡처 결과: `data-allocation-source="benchmark"`, 벤치마크 안내 문구 표시
- **판정:** 에러 배너(amber alert) 대신 sky 톤 참고 안내 + `[벤치마크 기반]` 배지 — **폴백이 매끄럽게 동작**. 503 `UPSTREAM_UNAVAILABLE` 은 `IntegratedMixErrorBanner` 를 띄우지 않음.

재현: `npx tsx scripts/capture-o1-digital-fallback.mts`

## 변경 파일

- `lib/planner/brief/brief-integrated-adapters.ts` (신규)
- `lib/planner/brief/store.ts` — `channelMode`, `digitalBudgetPct`, `digitalChannelIds`
- `components/planner/brief/allocation-source-badge.tsx` (신규)
- `components/planner/brief/brief-digital-panel.tsx` (신규)
- `components/planner/brief/brief-step-one.tsx` — 채널 토글
- `components/planner/brief/brief-step-two.tsx` — 디지털 패널 + mix hook
- `components/planner/brief/brief-flow-client.tsx`, `app/.../planner/page.tsx` — digital catalog SSR
- `lib/planner/brief/__tests__/brief-integrated-adapters.test.ts`

## 테스트

- `npx tsx --test lib/planner/brief/__tests__/*.test.ts` — **64 pass**

## 다음

- O-2 PR (`feat/o2-brief-quick-recommend`) — Step 1 진입 모드 빠른 추천 / 자세히 설계
