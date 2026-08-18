# PR-6c orphan 재확인 (#393) — 2026-08-18

301 적용 후 `/recommend` UI 체인 importers grep 실측.

## 확정 orphan (#393 마킹)

| # | 파일 | 비테스트 importer | 판정 |
|---|------|-------------------|------|
| 1 | `lib/recommend/brief-to-recommend-input.ts` | `recommend-page-client.tsx` only | **orphan** |
| 2 | `components/recommend/recommend-ai-freetext.tsx` | `recommend-page-client.tsx` only | **orphan** |
| 3 | `lib/recommend/recommend-session-persist.ts` | `recommend-page-client.tsx` only | **orphan** |
| 4 | `app/[locale]/(site)/recommend/recommend-page-client.tsx` | `recommend/page.tsx` only (→301) | **orphan** |
| 5 | `lib/recommend/build-freetext-recommend-input.ts` | 위 체인 + tests | **orphan** (tests 잔존) |
| 6 | `lib/recommend/freetext-recommend-defaults.ts` | 위 체인 + tests | **orphan** (tests 잔존) |
| 7 | `components/media-ai-recommend-form.tsx` | `recommend-page-client.tsx` (+ admin panel) | **orphan 후보 → #393 추가** — `randomFill` UI 잔존, 이번 PR 미삭제 |

## 후보에서 제외 (공유·다른 경로 사용)

| 파일 | 이유 |
|------|------|
| `lib/recommend/planner-freetext-to-recommend-brief.ts` | recommend 스택 외 테스트·adapter 참조 |
| `lib/recommend/recommend-rationale.ts` | planner·matching-engine |
| `app/api/recommend/*` | API 라우트 — 301과 무관, 별도 deprecate |

## `/recommend` 301 쿼리 보존

Next.js `redirects()`는 **query string을 기본 보존**한다.

| 쿼리 | legacy 동작 | 6c `/planner` |
|------|-------------|---------------|
| `brief=` | 자동 분석 후 URL에서 제거 | **미처리** — 새 플래너 Step 1 자연어로 수동 입력 필요 |
| `mode=ai` | AI 탭 선택 | **무의미** (탭 없음) |
| `auto=1` + `budget` + `region` + `industry` | 홈 예산 CTA 자동 분석 | **미처리** |
| `createQuote=` | 견적 생성 흐름 | **미처리** |
| `similarCampaignId=` | 유사 캠페인 prefill | **미처리** |

→ 쿼리는 URL에 **남지만** 새 3단계 플로우가 **읽지 않는다**. deep-link 복원은 후속 작업.

## `조건 무작위 채우기`

- `messages/ko.json` `mediaAiRecommend.form.randomFill` — **잔존**
- UI: `components/media-ai-recommend-form.tsx` L913–921 — **orphan (#393 #7, GitHub 이슈 기록)**
- `/recommend` 301 후 직접 진입 불가. admin panel import만 잔존
- 새 플래너: `brief-step-one.tsx` **업종 프리셋**으로 대체됨 ✅
- **이번 PR에서 코드 삭제하지 않음** — #393 정리 PR에서 제거 (추적: #402)
