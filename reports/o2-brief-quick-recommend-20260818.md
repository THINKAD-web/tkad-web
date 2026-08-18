# O-2 완료 보고 — Step 1 진입 모드 (빠른 추천 / 자세히 설계)

**브랜치:** `feat/o2-brief-quick-recommend` (base: `feat/o1-brief-channel-digital`)  
**일시:** 2026-08-18

## 구현 요약

| 항목 | 내용 |
|------|------|
| Step 1 토글 | `빠른 추천` / `자세히 설계` (`entryMode`) |
| 빠른 추천 입력 | 예산·지역만 |
| 빠른 추천 결과 | `scoreMediaCandidates()` 랭킹 20위 (`BriefQuickRankPanel`) — 믹스 편집 없음 |
| 전환 CTA | "예산·기간을 더 넣어 정확도를 높이려면 → 자세히 설계" |
| 성별 가드 | `brief-step-two` 와 동일 문구를 quick rank 에도 이식 |
| 미사용 | `matching-engine.ts`, `ai-media-recommend.ts` 가져오지 않음 |
| 레거시 | `/recommend` 코드 삭제 없음 |

## 변경 파일

- `lib/planner/brief/types.ts` — `BriefEntryMode`, `briefQuickRequiredStatus`
- `lib/planner/brief/store.ts` — `entryMode`, `setEntryMode`
- `components/planner/brief/brief-quick-rank.tsx` (신규)
- `components/planner/brief/brief-step-one.tsx` — 진입 모드 분기
- `components/planner/brief/brief-flow-client.tsx` — catalog → Step 1
- `lib/planner/brief/__tests__/brief.test.ts`

## 테스트

- `npx tsx --test lib/planner/brief/__tests__/*.test.ts` — **65 pass**

## PR 관계

- O-2는 O-1 위에 쌓임 → merge 순서: O-1 → O-2
- P (PR-8) 범위 확정은 O-1·O-2 merge 후 진행
