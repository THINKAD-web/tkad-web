# Report Copy Store — 설계안 (승인 요청)

**목적:** 광고주명·제목·로고·인사말·Executive summary를 **플로우와 무관한 공용 저장소**로 분리.  
**비목적:** `useBriefStore` / `usePlannerStore`에 report 필드를 추가하지 않음.

---

## 문제

| 저장소 | 키 | 용도 |
|--------|-----|------|
| `useBriefStore` | `tkad-planner-brief-v1` | 3단계 브리프 입력·믹스 |
| `usePlannerStore` | `tkad-planner-plan-v2` | 레거시 6단계 (dead code UI) |

C-lite~full-1 필드가 **레거시 planner store에만** 있어 `/ko/planner`(브리프)와 어긋남.  
`/recommend`, `/my/plan/report`도 같은 문구를 써야 함.

---

## 제안 구조

```
lib/planner-report-export/
  report-copy-state.ts    # 타입·serialize·migrate·empty
  report-copy-store.ts    # zustand + persist (세션 초안)
  report-copy.ts          # (기존) 초안 생성·fingerprint SSOT
```

### 1. `PlannerReportCopyState` (단일 타입)

```typescript
type PlannerReportCopyState = {
  clientName: string;
  documentTitle: string;
  coverLogoUrl: string | null;   // 전용 필드 (creativeUploadedUrl와 분리 목표)
  greeting: string;
  executiveSummary: string;      // 문단은 \n\n 구분 (기존과 동일)
  greetingTouched: boolean;
  executiveSummaryTouched: boolean;
  copyFingerprint: string | null;
};
```

- **로고:** UI는 brief Step 5 합성과 분리해 `coverLogoUrl`만 export에 사용.  
  마이그레이션 전환기에는 `coverLogoUrl ?? creativeUploadedUrl` 폴백 허용.

### 2. `useReportCopyStore` (공용 zustand)

- **persist key:** `tkad-report-copy-v1` (브리프·레거시와 별도)
- **역할:** 편집 중 **작업 중 초안** (플랜 저장 전에도 유지)
- **액션:** C-full-1과 동일 (`setGreeting`, `applyDraft`, `acknowledgeFingerprint` …)

### 3. 플랜 단위 persist (SSOT for restore)

| 플로우 | 저장 위치 | 필드 |
|--------|-----------|------|
| 브리프 3단계 | `CampaignPlanSnapshot.reportCopy` | JSON 컬럼/객체 (신규) |
| 레거시 SavedPlannerPlan | `planJson.reportCopy` 또는 기존 flat 필드 | 하위 호환 migrate |
| 플랜 카트 | `SavedPlanCart` 메타 또는 cart snapshot | `reportCopy` 동일 shape |

**원칙:** DB/저장 스냅샷에 `reportCopy` 블록이 있으면 로드 시 `useReportCopyStore`에 **hydrate**.  
저장 시 store → `reportCopy`로 **스냅샷에 포함**.

기존 flat 키(`reportClientName` 등)는 `migrateReportCopyFromPlanJson()`에서 흡수 후 v1 블록으로 통합.

### 4. 소비자 (읽기/쓰기)

| 화면 | 변경 |
|------|------|
| `brief-step-three` | `PlannerReportDocument` + stale + email — **store만 참조** |
| `recommend-report-section` | 동일 store (이미 clientName/title만 쓰던 부분 확장) |
| `my-plan-report` / `PlannerReportStep` | store로 이전 (6단계 파일은 유지, 내부만 교체) |
| `buildBriefReportPayload` / `buildOohReportPayload` | args에 `reportCopy` 전달 (adapter가 store에서 주입) |

`usePlannerStore`의 report* 필드는 **deprecated** → 한 PR에서 읽기 경로를 store로 옮긴 뒤, 다음 PR에서 planner store 필드 제거.

### 5. 동기화 규칙 (C-full-1 유지)

- `report-copy.ts`의 fingerprint / stale / auto-draft 로직 **그대로** store 액션에서 호출
- 매체 구성 입력은 플로우별 (brief mix vs campaignMediaIds) → fingerprint 계산 시 **export portfolio** 기준으로 통일

---

## 데이터 흐름 (브리프 3단계)

```text
[브리프·믹스] useBriefStore
        ↓ buildBriefReportPayload(portfolio, metrics, …)
[편집 UI] useReportCopyStore ←→ CampaignPlan.reportCopy (저장 시)
        ↓ exportPayload
[PDF / 이메일] buildOohReportPayload + server PDF
```

---

## 마이그레이션 단계 (구현 순서)

1. `report-copy-state.ts` + `report-copy-store.ts` 추가 (planner store와 병행)
2. `CampaignPlan` 스키마·API에 `reportCopy?` 추가
3. `brief-step-three` UI 연결 (이번 승인 범위)
4. `PlannerReportStep` / recommend → store 참조로 전환 (6단계 파일 수정 최소)
5. planner store report 필드 제거 + persist v10 migrate (별도 PR)

---

## C-full-3a 확장

`PlannerReportCopyState`에 추가 예정:

```typescript
productionCostWon: number | null;  // 3a 총액 1줄
// 3b: per-media는 CampaignPlan.mediaMix[].productionCostWon — 별도
```

견적 3단 표는 **payload 빌더**가 `reportCopy` + mix 합계를 읽음. UI는 `brief-step-three` 동일 패널.

---

## 승인 요청 체크리스트

- [ ] 공용 `useReportCopyStore` + `tkad-report-copy-v1` persist
- [ ] 플랜 저장 = `CampaignPlan.reportCopy` (브리프 SSOT)
- [ ] brief store에 report 필드 **추가 안 함**
- [ ] 6단계 dead code **삭제/대규모 수정 안 함** — import만 store로 교체
- [ ] 3b 제작비는 `mediaMix` 라인 확장 (이번 범위 외)

승인 후 **3단계 연결 구현** 착수.
