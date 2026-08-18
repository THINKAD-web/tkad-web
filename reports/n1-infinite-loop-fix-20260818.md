# N-series 긴급 수정 보고 — 무한 루프 크래시 (2026-08-18)

## N-1 조사 결과

### 에러 스택 (브라우저 콘솔)

```
The result of getSnapshot should be cached to avoid an infinite loop
    at BriefFlowClient (components/planner/brief/brief-flow-client.tsx:95:34)

Error: Maximum update depth exceeded.
```

### 발생 컴포넌트

**`BriefFlowClient`** — L-1/L-2 추가분.

### 근본 원인 (N-1 #2 — 지문 로직, 그러나 effect 순환이 아님)

```tsx
// ❌ 제거됨 — React 19 + zustand useSyncExternalStore 무한 루프
const briefCore = useBriefStore((s) => ({
  budgetInputWon: s.budgetInputWon,
  ...
}));
```

Zustand selector가 **매 `getSnapshot` 호출마다 새 객체**를 반환.
React 19는 `useSyncExternalStore`에서 스냅샷 불안정 시 **즉시 무한 re-render**를 차단한다.

**L-1 지문 비교 로직 자체(`isMixBriefStale`)는 문제 없음.**
문제는 비교 **입력을 객체 selector로 구독**한 것.

### L-2 재진입 모달 (N-1 #3)

`useEffect([hydrated, mixCount, planFromUrl])` + `setResumeOpen(true)`는
**직접적인 루프 원인 아님** (ref로 1회 제한).

다만 `mixCount`를 deps에 두면 hydration 타이밍에 effect가 2회 도는 여지가 있어
`useLayoutEffect` + `getState()` + `shouldPromptResumeSession`으로 **1회만** 실행하도록 변경.

---

## N-2 수정

| 변경 | 파일 |
|------|------|
| `selectMixIsStale` — **boolean** selector | `brief-session-logic.ts` |
| `briefCore` 객체 selector **삭제** | `brief-flow-client.tsx` |
| resume prompt → `useLayoutEffect` 1회 | `brief-flow-client.tsx` |
| StrictMode (dev) | `planner/page.tsx` |

### 검증 테스트 (`brief-session-logic.test.ts`)

| 시나리오 | 테스트 |
|----------|--------|
| mix 없는 첫 진입 | `resume prompt: mix 없으면` |
| mix 있는 재진입 (StrictMode 이중) | `StrictMode 이중 호출` |
| 브리프 변경 → stale 확인/해소/비우기 | `stale mix:` 3건 |
| getSnapshot 100회 안정 | `selectMixIsStale: 연속 getSnapshot` |

---

## N-3 — 48개 테스트가 못 잡은 이유

### 검증했던 것

- `brief-fingerprint.ts` — 지문 계산·stale 판정 (**순수 함수**)
- `mix-metrics.ts` — CPM·믹스 지표 (**순수 함수**)
- `store.ts` — persist partialize (**Node, React 없음**)

### 놓친 것

1. **React 19 `useSyncExternalStore` + zustand selector 규칙** — 객체 반환 selector는 브라우저에서만 크래시
2. **컴ponent mount/hydration 사이클** — `useEffect` + persist rehydrate 타이밍
3. **StrictMode 이중 effect** — 프로젝트에 StrictMode 미적용

### 추가한 테스트 (N-3 요구)

- `isStableSnapshot()` — selector 100회 연속 `Object.is` 검증 (렌더 루프 proxy)
- `simulateResumePromptEffect()` — setState 1회 상한 검증
- `anti-pattern` 테스트 — 객체 selector 불안정을 **문서화**

**한계**: `@testing-library/react` 없음 → 실제 DOM mount 테스트는 없음.
다음 단계: RTL 도입 시 `BriefFlowClient` StrictMode smoke test 추가 권장.

---

## O-series

**N 완료 전 O 착수 금지** — O-1/O-2 조사는 N 커밋 후 별도 지시 시 진행.
