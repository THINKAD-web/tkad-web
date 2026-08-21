# C-1 보류 큐 — 시부야 CPM_BOUNDS 초과 2건

날짜: 2026-08-21  
상태: **flagged 유지** · 조치 없음 · 매체사 spot/loop 확인 대기  
Execute: `scripts/apply-pr3-phase-b-shibuya-e-unflag.mts` (스타츠비전·시부크로비전만 적용)

이번 C-1에서 **제외**한 2건. `dooh_mid` 기본 SOV 0.0625로 월노출을 줄이면 가격 대비 CPM이 `CPM_BOUNDS.dooh_mid` ₩5,000–₩40,000을 넘는다. 면적 큰 Q'S EYE는 #428 `gateClass=dooh_large`(cap 20M)는 통과하지만 SOV 클래스 CPM 상한은 실패.

FactSheet 행이 없다 (`spotDurationSec` / `loopDurationSec` / `playsPerHour` / `forceLoopSov` 전부 없음). 실측 SOV가 기본값보다 크면 impressions가 늘고 CPM이 상한 안으로 들어올 수 있다. **추측으로 SOV를 올리지 않는다.**

---

## 큐

| name | id | dailyFootfall | price (KRW) | default SOV 시 월노출 | default SOV 시 CPM | #428 cap | CPM_BOUNDS | reviewStatus |
|---|---|---:|---:|---:|---:|---|---|---|
| 시부야 Q'S EYE(큐즈 아이) 전광판 광고 | `cmsyguc6s000u04l2ybgpbbwp` | 70,000 | 33,836,590 | 131,250 | **257,803** | pass (`dooh_large` 20M) | **fail max** | flagged / `null_or_negative` |
| 시부야 스크램블 교차로 16면 싱크 전광판 광고 | `cmsyx0h1c001c04ji8ck0gixm` | 70,000 | 13,456,000 | 131,250 | **102,522** | pass (`dooh_mid` 8M) | **fail max** | flagged / `null_or_negative` |

공개 카탈로그: 숨김 (`reviewStatus=flagged`).

---

## 매체사 확인 시 받을 것

1. 스팟 초(`spotDurationSec`) · 루프 초(`loopDurationSec`) 또는 시간당 횟수(`playsPerHour`)
2. 1사 전매/롤 판매 시 실제 점유율
3. (선택) 일 유동 70,000 근거 — 지금은 건드리지 않음

확인 후: SOV 재계산 → CPM이 ₩40,000 이하면 C-1과 같은 impressions+CPM 동시 패치 + `reviewed`. 그래도 상한 초과면 가격·판매단위를 별도 판단 (이번 큐에서 자동 execute 금지).

---

## 이번에 적용한 2건 (참고, 이 큐 아님)

| name | id | impressions | CPM | reviewStatus |
|---|---|---:|---:|---|
| 시부야 스타츠비전 전광판 광고 | `cmsyvvvbi000c04jiczu69c5c` | 131,250 | 13,090 | reviewed |
| 시부야 시부크로비전 전광판 광고 | `cmsywe2z2001604jvcecrobiz` | 131,250 | 9,143 | reviewed |
