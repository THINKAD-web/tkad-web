# THINKAD 사이트 구조 정리 (2026-04-25)

새 작업 의뢰 전 현황 파악용 — 메인 네비게이션, 핵심 기능 위치, 노출 갭 진단.

---

## 1. 메인 네비게이션 (`components/header.tsx`)

| 위치 | 라벨 | 경로 |
|---|---|---|
| 단독 | 홈 | `/` |
| 단독 | 서비스 | `/services` |
| **드롭다운: 매체 검색** | 매체 목록 | `/media` |
| | 지도에서 찾기 | `/media/map` |
| | AI 매체 추천 | `/recommend` |
| | 미디어 플래너 | `/planner` |
| **드롭다운: 트렌드 & 학습** | 성공 사례 | `/cases` |
| | 트렌드 리포트 | `/insights` |
| | 아카데미 | `/academy` |
| 우측 CTA (gold) | 문의하기 | `/contact` |

i18n 라벨은 `messages/ko.json` 의 `nav.*` 키 사용.

---

## 2. 핵심 기능 위치

| 기능 | 메인 진입 | 비고 |
|---|---|---|
| **AI 추천** | `/ko/recommend` | nav 드롭다운 (3 depth) |
| **플래너 (6단계 시뮬레이터)** | `/ko/planner` | nav 드롭다운. `?addMedia=<id>` 로 Step 4 사전선택 진입 가능 |
| **매체 검색·필터** | `/ko/media` | nav 1번째 드롭다운 헤더. `MediaBrowseClient` (지역/유형/예산/검색) |
| **지도 검색** | `/ko/media/map` | nav 드롭다운 |
| **비교** | `/ko/compare` | ⚠️ nav 미노출 — 매체 카드 "비교 담기"만 진입 |
| **견적 요청** | `/ko/quote` | ⚠️ nav 미노출 — 매체 상세 sticky CTA / Footer 만 진입 |
| **인사이트 (트렌드 리포트)** | `/ko/insights` | nav 드롭다운 + 자동 발행 (PR #49~53) |
| **데이터 컨설팅** | `/ko/contact` 통합 | ⚠️ 별도 페이지 없음 — Footer "Services" 에서 contact 로 점프 |
| **문의** | `/ko/contact` | gold CTA 버튼 (가장 강조) |
| **사례** | `/ko/cases` | nav 드롭다운 |
| **아카데미** | `/ko/academy` | nav 드롭다운 |

---

## 3. 홈 (`app/[locale]/page.tsx`) 섹션 순서

```
1. Hero (Ken Burns 애니메이션)
   배지: "대한민국 No.1 OOH 광고 에이전시"
   제목: "생각하는 광고회사 싱커드"
   CTA: [무료 상담 신청 → /contact]  [매체 검색하기 → /media]
   통계: 500+ 매체 · 15년 경력 · 100+ 대기업 파트너
2. 4단계 검증 프로세스 (현장방문 → 촬영/실측 → 데이터검증 → 매체등록)
3. TOP 3 추천 매체 (Prisma isFeatured + featuredOrder)
4. 인기 매체 6개 (isPopular)
5. Why THINKAD 차별점 (3 항목)
6. 고객 후기 캐러셀 (data/testimonials.ts)
7. CTA 배너 → /contact
```

---

## 4. Footer 메뉴

**Quick Links**: 서비스 / 매체검색 / 사례 / 문의 / 개인정보처리방침

**Services**:
- 국내 OOH → `/media`
- 전국 통합 OOH → `/planner`
- 데이터 컨설팅 → `/contact` (별도 랜딩 없음)
- 플래닝 툴 → `/tools` (현재 미구성)

**Contact Info**: 주소 / 전화 / 이메일 / 카카오채널

---

## 5. 발견된 노출 갭 (1순위 개선 후보)

### Gap 1 — **플래너 + AI 추천이 nav 3 depth**
- "매체 검색" 드롭다운 → 4번째 항목이 플래너 (가장 많은 시간 들인 기능)
- 호버해야 발견 가능. 모바일에서 클릭 단계 ↑
- → **홈 Hero 의 두 CTA 중 하나를 "AI 시뮬레이션 시작"** 으로 교체 권장

### Gap 2 — **견적 요청이 nav 미노출**
- `/ko/quote` 가 존재하는데 nav 어디에도 없음
- 매체 상세의 sticky CTA 와 Footer 만 진입 → 카탈로그 안 본 사용자는 못 찾음

### Gap 3 — **데이터 컨설팅 자체 페이지 없음**
- Footer "Services" 에 라벨만 있고 `/contact` 로 점프
- 의뢰서·마케팅에서 강조하면서 랜딩 페이지가 없는 상태

### Gap 4 — **비교 nav 미노출**
- `/ko/compare` 페이지는 잘 만들어졌는데 진입 경로가 매체 카드뿐
- 검색 안 거치고 바로 비교하고 싶은 사용자는 발견 어려움

---

## 6. 메인 1순위 강조 추천

**"AI 시뮬레이션 (플래너)"** — 이유 3가지:

1. **차별화 가장 큼**
   - 매체 카탈로그·검색은 경쟁사도 비슷
   - 6단계 시뮬레이터 + 합성 미리보기 + Saved Plan PDF 는 THINKAD 만의 자산

2. **체류시간 ↑**
   - 단순 검색보다 깊은 engagement
   - → 견적·문의 전환율 높을 가능성

3. **현재 nav 위치가 3 depth**
   - Hero 로 끌어올리면 즉시 효과

---

## 7. 후속 강조 우선순위 (제안)

작은 PR 들로 분할 가능:

| 순위 | 작업 | 예상 PR 크기 |
|---|---|---|
| ① | 홈 Hero CTA 를 플래너로 교체 + nav 트리 개선 | < 200줄 |
| ② | 데이터 컨설팅 랜딩 페이지 신설 | 300~500줄 |
| ③ | 견적 nav 진입 추가 | < 100줄 |
| ④ | 비교 nav 진입 추가 | < 100줄 |
| ⑤ | Footer "플래닝 툴" `/tools` 페이지 신설 또는 메뉴 제거 | 케이스 별 |

---

## 8. 추가 메모

- 모든 페이지는 `/ko` 와 `/en` locale 분기 (next-intl)
- 헤더/푸터는 모바일 Sheet overlay 별도 구성
- nav 라벨은 `messages/{ko,en}.json` 의 `nav.*` 에서 일괄 관리
- Hero CTA 변경은 i18n 키 추가도 같이 필요
