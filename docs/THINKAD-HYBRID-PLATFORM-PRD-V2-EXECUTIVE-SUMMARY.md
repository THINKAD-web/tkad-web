# THINKAD Hybrid Platform — 1페이지 임원 요약

> **기준 문서**: `docs/THINKAD-HYBRID-PLATFORM-PRD-V2.md` (3,451줄, 7섹션)
> **작성일**: 2026-04-20 · **대상**: 경영진 · **담당**: Product Team

---

## 🎯 비전 & 포지셔닝

> ### **"검증된 OOH만. 30분이면 됩니다."**
> _Verified OOH. Delivered in minutes._

THINKAD는 OOH 광고의 **신뢰 레이어(Trust Layer)**다. 셀프서비스의 투명성(HOO)과 풀서비스의 전문성(전통 대행사)을 동시에 제공하는 **유일한 하이브리드 플랫폼**이 된다.

**전환 전략 4축**
- ① Trust → 배지화 ② Service → 3-Tier (Self·Assisted·Full) ③ Speed → 자동화(30분 제안서) ④ Scale → 양면 시장(매체 오너·대행사 네트워크)

---

## 📊 북극성 지표 — MCC (Monthly Confirmed Campaigns)

**월간 결제 확정 캠페인 수** = 매출·재고·고객 만족·매체사 수익 모두와 양의 상관.

| 시점 | MCC 목표 | GMV 목표 |
|---|---|---|
| **Phase 1 (3개월)** | **20건/월** | — |
| **Phase 2 (6개월)** | 60건/월 | 월 3억+ |
| **Phase 3 (12개월)** | 150건/월 | — |
| **Phase 4 (24개월)** | 300건/월 | **월 50억+** |

**보조 지표**: Activation 40%+ · Conversion 25%+ · Average Deal Size Phase 2말 5천만원+

---

## 🗓️ Phase 1 MVP 로드맵 — 13주 (2026-05 ~ 2026-08 초)

> **베타 출시일: 2026-08-07** (Founders Program 30명)

| Sprint | 주차 | 주제 | 핵심 산출물 |
|---|---|---|---|
| Pre-sprint | 10일 (4월 말) | 킥오프·API 키·법무 | 3트랙 병렬 준비 (Infra / Design / Data) |
| **Sprint 1** | **W1-3 (3주)** | 인증 + 회원 | next-auth · Kakao/Google · `/my` 셸 · localStorage 동기화 |
| Sprint 2 | W4-5 | 지도 MVP | Kakao Map + 클러스터 + Verified Only 필터 |
| Sprint 3 | W6-7 | My THINKAD | 플래너 저장 · 즐겨찾기 · 대시보드 |
| Sprint 4 | W8-9 | 플래너 AI | Claude tool use · 3안 추천 (Conservative/Balanced/Aggressive) |
| Sprint 5 | W10-11 | **자동 제안서 PDF** | 1클릭 PDF (p95 <60s) + 검증 배지 + **공개 웹뷰 보안 8항목** |
| Sprint 6 | W12-13 | 안정화·법무 | E2E 95%+ · Lighthouse ≥85 · 법무 완료 · **2026-08-07 베타 공개** |

**MVP 핵심 기능 (P0 8종)**: F1.1 지도 · F1.2 제안서 · F1.3 플래너 · F1.4 My THINKAD · F2.4 배지(데이터) · D1 Verified Only · D2 3-Tier · 모바일 반응형

**품질 게이트**: Lighthouse ≥85 · E2E 95%+ · Sentry 에러율 <1% · PDF p95 <60s · 공개 웹뷰 보안 0건

---

## ⚠️ Top 3 리스크 & 대응

### R1 · 매체사 온보딩 병목 → 재고 부족 `영향:높음 · 확률:높음`
- **시나리오**: 베타 사용자 몰리는데 매체 500개만 존재, 3주+ 검증 리드타임
- **대응**: Pre-sprint에 **거래 매체사 200곳 CSV 일괄 등록** + Founders Program (수수료 3개월 면제) + 매체사 직접 입력을 Phase 2 Sprint 7로 **앞당김**
- **경보**: 검색 결과 "결과 없음" 비율 > 10%

### R2 · Claude API 비용 폭증 `영향:중 · 확률:높음`
- **시나리오**: 챗봇 남용·prompt cache 부재 시 월 청구서가 매출의 20%+
- **대응**: **Stage 1 rule-based 우선** (Sprint 13-14) → Stage 2 Claude 고도화 (Sprint 21-22) 이중화 · `cache_control: ephemeral` 90% 절감 · IP+userId rate-limit · **월 예산 80% 도달 시 자동 rule-only 폴백**
- **경보**: 월 Anthropic 비용 / MCC > $10

### R3 · HOO 가격 덤핑 또는 매체 독점 계약 `영향:높음 · 확률:중`
- **시나리오**: HOO Series B~C 자금 조달 후 주요 매체 10~20%에 "THINKAD 판매 금지" 독점 계약 요구
- **대응**: 매체사 **비독점 장기 계약 선점**(Phase 1) · 검증 배지 lock-in(6개월 재검증) · 대행사 네트워크 전환 비용(Phase 3) · **"검증 큐레이션" 가치**로 재고 양 경쟁 회피
- **경보**: 매체사 이탈율 > 5% / 분기

---

## 💎 구조적 해자 (Moat)

1. **현장 실사팀 = 물리적 자산** (자본으로 살 수 없음)
2. **3년치 자체 캠페인 데이터** (HOO는 0년차)
3. **매체본부 도메인 지식 → AI 프롬프트 특화**
4. **대행사 수수료 네트워크 → 전환 비용 높음**

---

## 📌 이 문서의 핵심 메시지

> **"THINKAD의 진짜 경쟁력은 '현장 검증 조직'이라는 물리적 자산이다. 이것을 배지·PDF·필터·리포트로 디지털화하여 플랫폼 곳곳에서 보여주는 것 — HOO가 절대 복제할 수 없는 해자를 만드는 유일한 길이다. 자동화·속도는 HOO도 따라올 수 있지만, 검증팀은 따라올 수 없다."**

---

### 팀 규모 (Phase 1 → 4)

| 단계 | 합계 | 핵심 채용 |
|---|---|---|
| Phase 1 (MVP) | 9명 | 현재 팀 + 디자인 보강 |
| Phase 2 | 12명 | +Data Engineer |
| Phase 3 | 16명 | +AI Engineer (Sprint 21 직전 W38) |
| Phase 4 | 20+ | +글로벌 GTM |

### 예산·결제 로드맵
- Phase 1~3: **Toss Payments (primary)** · Phase 4: **Stripe (primary 전환)** — 해외 세션 20%+ 또는 글로벌 GMV 30%+ 도달 시

### 문서 레퍼런스
- 상세 전문 (3,451줄): `docs/THINKAD-HYBRID-PLATFORM-PRD-V2.md`
- PR #14 · 브랜치 `claude/write-prd-v2-yDYGn`
- v1 역사 자료: `docs/THINKAD-PLATFORM-PRD.md` (1,410줄)
