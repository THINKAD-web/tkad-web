# THINKAD Hybrid Platform PRD v2 — 7섹션 통합본

> 작성일: 2026-04-20 (v1 2026-04-18 → v2)
> 브랜치: claude/write-prd-v2-yDYGn
> 기반: Next.js 16.2.3 / Prisma 7.6.0 / next-intl 4.8.3 / @anthropic-ai/sdk 0.88.0
> AGENTS.md 룰 준수: `fetchPublicMediaCatalog` (DB-backed) source of truth 유지
> v1 원본: `docs/THINKAD-PLATFORM-PRD.md` (1,410줄, 10섹션) — 역사적 레퍼런스로 보존

---

## 목차

1. [비전 · 포지셔닝 · 제품 원칙](#1-비전--포지셔닝--제품-원칙)
2. [시장 · 페르소나 · 경쟁 환경](#2-시장--페르소나--경쟁-환경)
3. [제품 기능 명세 (Phase 1–4, 15개 기능)](#3-제품-기능-명세-phase-14-15개-기능)
4. [정보 구조 및 사용자 플로우](#4-정보-구조-및-사용자-플로우)
5. [데이터 모델 · API 설계](#5-데이터-모델--api-설계)
6. [개발 로드맵 · 배포 전략](#6-개발-로드맵--배포-전략)
7. [KPI · 리스크 · 운영 원칙](#7-kpi--리스크--운영-원칙)

---

## 1. 비전 · 포지셔닝 · 제품 원칙

### 1.1 비전 (Vision Statement)

> **"Korea's most trusted OOH intelligence platform — 현장의 눈, 데이터의 손, 전문가의 판단을 하나로."**
>
> THINKAD는 한국 OOH(Out-of-Home) 광고 시장에서 **셀프서비스 마켓플레이스의 투명성**과 **풀서비스 에이전시의 전문성**을 동시에 제공하는 하이브리드 플랫폼이다.

### 1.2 미션

1. **검증된 매체만**: 현장 4단계 검증(입지·가시성·조도·경쟁매체)을 통과한 매체만 판매
2. **결정까지 72시간**: 플래너 착수부터 제안서 확정까지 3일 이내
3. **성과 증명**: 모든 캠페인에 집행 증빙 사진·유동인구 리포트·성과 메트릭 자동 제공

### 1.3 HOO(House of OOH) 8축 비교

| 축 | HOO | **THINKAD (목표)** |
|---|---|---|
| 제공 모델 | 순수 셀프서비스 마켓플레이스 | **하이브리드 (셀프 + 전문 큐레이션 + 풀서비스)** |
| 매체 검증 | 매체사 자율 등록 | **현장 4단계 검증 배지 시스템** |
| 제안서 | 수동 요청 후 이메일 | **AI 자동 생성 PDF + 검증 배지 삽입** |
| 데이터 근거 | 매체사 자료만 | **공공유동인구 + Kakao POI + 자체 집행 이력** |
| AI 활용 | 없음/제한적 | **플래너/추천/챗봇/리포트 자동화 (Claude 4.7)** |
| 집행 증빙 | 매체사 제공 선택 | **필수 제공 + 캠페인 완료 PDF 자동 생성** |
| 멀티 언어 | KO 중심 | **KO/EN/CN/JP 풀 지원 (Phase 4)** |
| 가격 투명성 | 호가 노출 | **가격 이력 스냅샷 + 실시간 가용성** |

### 1.4 포지셔닝 문구

- **광고주용**: "HOO에서 검색하고, THINKAD에서 결정하세요."
- **매체사용**: "매체의 가치를 숫자로 증명하는 유일한 플랫폼."
- **대행사용**: "72시간 안에 제안 끝내는 OOH 부스터."

### 1.5 제품 원칙 (Product Principles)

1. **Evidence over Claim** — 주장보다 증빙. 모든 수치는 출처를 함께 표기한다.
2. **Speed × Depth** — 빠른 셀프서비스와 깊은 전문 상담을 하나의 흐름으로 연결한다.
3. **Korean-first, Global-ready** — 한국 OOH 도메인의 깊이를 잃지 않으면서 글로벌 확장이 가능한 구조를 유지한다.
4. **One DB, Multi-facing** — Admin · Client · Public · Owner · Agency 모두 동일한 Prisma 모델을 공유한다 (`fetchPublicMediaCatalog` 단일 진실 원천).

---

## 2. 시장 · 페르소나 · 경쟁 환경

### 2.1 페르소나 A — 박준호 (35) · 스타트업 마케팅 리드

- **직무**: Series B SaaS Growth Lead, 연 광고 예산 15억
- **상황**: 브랜드 인지도 확대 위해 OOH 첫 집행 검토. 디지털 퍼포먼스 경험 풍부, OOH 낯섦.
- **JTBD**: 예산 3,000만원 내 서울 2030 타겟 매체 조합 / 제안서 당일 C레벨 공유 / 집행 후 ROI 증빙
- **Pain Points**: HOO 매체 적합성 확신 부족 / 유동인구 데이터 출처 불일치 / 대행사 2주 제안 대기
- **THINKAD 시나리오**: `/planner` 7단계 → Claude 매체 포트폴리오 추천 → 4/4 검증 배지 매체 선별 → PDF Slack 공유 → `/client/dashboard`에서 증빙·리포트 확인
- **북극성**: 제안서 생성까지 < 30분

### 2.2 페르소나 B — 김미영 (42) · 중견 대행사 AE

- **직무**: 종합광고대행사 매체본부 AE, 제약/금융 클라이언트 담당
- **상황**: 클라이언트별 연 5~10건 OOH 제안. 기존 OOH 본부 통한 수작업 견적.
- **JTBD**: 브리핑 후 48시간 내 제안서 3안 / 전국 멀티시티 캠페인 설계 / 매체 가용성·가격 실시간 확인
- **Pain Points**: 내부 응답 2~3일 / 경쟁사도 같은 HOO 보고 있음 / 보고용 증빙 매번 수작업
- **THINKAD 시나리오**: 파트너 대행사 네트워크 가입 → 자사 브랜드 PDF 템플릿 → `/compare` 3개 비교 PDF → My THINKAD 캠페인 성과 자동 리포트
- **핵심 지표**: 월간 견적 생성 건수, 재계약율

### 2.3 페르소나 C — 이동철 (58) · 지방 버스쉘터 매체사 대표

- **직무**: 부산/울산 버스쉘터 240면 운영, 연매출 18억
- **상황**: 영업망 전화·엑셀 중심. 서울 광고주 접점 부족.
- **JTBD**: 비수기 공실률(현 35%) 낮추기 / 서울·수도권 광고주 노출 / 집행 이력·가격 이력 자동 관리
- **Pain Points**: 온라인 노출 채널 없음 / 자체 유동인구 데이터 없음 / 증빙 카톡 수동 전송
- **THINKAD 시나리오**: `/owner` 매체 240면 CSV 일괄 업로드 → 자동 지오코딩 + 공공 유동인구 자동 삽입 → PWA로 현장 촬영 즉시 업로드 → 월간 정산 리포트 자동 발행
- **핵심 지표**: 월간 예약 전환율, 평균 공실률

### 2.4 경쟁사 비교표

| 항목 | **THINKAD (목표)** | HOO | 전통 종합대행사 | 매체사 직거래 |
|---|---|---|---|---|
| 비즈니스 모델 | 하이브리드 (SaaS + 커미션 + 풀서비스) | 마켓플레이스 수수료 | 커미션 15~20% | 직거래 |
| 매체 수 (YR1 목표) | 15,000+ (검증) | ~20,000 | 제한적 | 자사만 |
| 검증 시스템 | **4단계 배지** | 등록 심사만 | 수작업 | 없음 |
| 제안서 속도 | **< 30분 (AI)** | 24~48h | 3~7일 | 3~5일 |
| 가격 투명성 | **가격 이력 스냅샷** | 호가만 | 비공개 | 협상 |
| 데이터 근거 | 공공유동인구 + 자체이력 + POI | 매체사 자료 | 내부 DB | 없음 |
| AI 추천 | **Claude 4.7** | 없음 | 없음 | 없음 |
| VR/AR 투어 | **Phase 3 제공** | 없음 | 일부 | 현장답사 |
| 집행 증빙 | **필수, 자동 PDF** | 선택 | 사진 보고 | 요청 시 |
| 다국어 | **KO/EN/CN/JP** | KO | KO/EN | KO |
| 모바일 | **PWA (Phase 4)** | 모바일 웹 | 없음 | 없음 |
| 가격 범위 | 50만~10억 | 50만~5억 | 1억+ | 협상 |

### 2.5 SWOT 분석

**Strengths** — 현장 4단계 검증 역량(기존 오프라인 자산) · 풀스택 + AI 통합(Claude API) · Prisma 16 모델 성숙도

**Weaknesses** — 매체 재고 부족(HOO 대비) · 브랜드 인지도 낮음 · 미디어 오너 온보딩 미구현

**Opportunities** — OOH 시장 디지털 전환 초기 (DX 선점) · 공공데이터 개방 가속(유동인구·소상공인·교통) · 글로벌 광고주 한국 OOH 수요 증가

**Threats** — HOO의 자본력/네트워크 효과 · 전통 대행사의 반발 · AI 환각 리스크

### 2.6 차별화 포지셔닝 맵

```
       High Touch (전문 상담)
              │
  종합대행사 ●│● THINKAD  ← 목표 (우상단)
              │
──────────────┼────────────── High Tech (셀프/AI)
              │
   매체사직거래●│● HOO
              │
       Low Touch
```

THINKAD는 **High Tech × High Touch** 사분면을 선점한다.

---

## 3. 제품 기능 명세 (Phase 1–4, 15개 기능)

> 각 기능은 **[User Story] → [Acceptance Criteria] → [UI Guide] → [기술 구현]** 순서로 기술. `신규` / `기존 확장` 태그 구분.

### 3.1 Phase 1 (0–3개월) 핵심 기능 — F1.1 ~ F1.4

#### F1.1 지도 기반 매체 검색 (Kakao Map) `신규`

**User Story**
> "광고주로서, 관심 지역을 지도에서 핀으로 보고 필터링하여 원하는 매체를 빠르게 찾고 싶다."

**Acceptance Criteria**
- [ ] `/media` 페이지 상단에 **지도/리스트 토글** 제공
- [ ] Kakao Map SDK로 매체 위치를 클러스터링 핀으로 렌더링 (1,000개 이상에서도 60fps 유지)
- [ ] 핀 클릭 시 사이드 카드에 매체 썸네일, 가격, 4단계 검증 배지, 가용성 표시
- [ ] 지도 이동(`bounds_changed`) 시 뷰포트 내 매체만 재쿼리 (debounce 500ms)
- [ ] 카테고리·가격대·검증 여부 필터가 지도와 동기화
- [ ] 모바일: 바텀시트 형태로 리스트 표시 (스와이프업)
- [ ] 반경 검색: "이 지점 기준 500m 내" 버튼
- [ ] URL 쿼리에 `?lat=&lng=&zoom=&filters=` 저장 (공유 가능)

**UI Guide**
- 좌측 35%: 필터 + 매체 리스트 (가상 스크롤 `@tanstack/virtual`)
- 우측 65%: Kakao Map (primary `#0D1B2E` 핀, 검증 매체는 `#C8913C` gold 테두리)
- 클러스터 색상: 매체 수 기준 (1~5 navy, 6~20 amber, 21+ 진한 amber)
- 핀 hover: 작은 카드 (썸네일·가격), 클릭: 전체 사이드 카드

**기술 구현**
- 클라이언트: `components/media-map-view.tsx` 신규, Kakao Maps JS SDK (`//dapi.kakao.com/v2/maps/sdk.js?appkey=<KEY>&libraries=clusterer,services`)
- 기존 `fetchPublicMediaCatalog()` 확장 → `bounds: { sw, ne }` 파라미터 추가 (DB-backed source of truth 유지)
- API: `GET /api/public/media-catalog`에 `boundingBox`, `radiusKm`, `centerLat`, `centerLng` 쿼리 지원
- Prisma: `Media.latitude`, `Media.longitude`에 `@@index([latitude, longitude])` 추가 (PostGIS 이관 가능성 열어둠)
- 지도 SSR 이슈 방지: `next/dynamic` `ssr: false`
- 성능: Intersection Observer로 뷰포트 밖 카드 언마운트

---

#### F1.2 자동 제안서 고도화 — 검증 배지 삽입 `기존 확장`

**User Story**
> "광고주로서, 제안서 PDF를 받았을 때 각 매체가 THINKAD의 4단계 현장 검증을 통과했음을 한눈에 보고 싶다."

**Acceptance Criteria**
- [ ] 현재 `lib/build-quote-pdf.ts` 확장, 각 매체 행 옆에 배지 4종 (●/○ 아이콘) 렌더링
- [ ] 배지 4종: `입지(Location)`, `가시성(Visibility)`, `조도(Illumination)`, `경쟁매체(Competition)`
- [ ] PDF 커버에 "THINKAD Verified Ⓣ" 워터마크, 하단에 검증 일자·검증자 기재
- [ ] 각 배지에 대한 검증 방법 설명을 PDF 마지막 페이지 부록에 자동 삽입
- [ ] 공개 제안서 웹뷰(`/quote/[id]`)에도 동일 배지 노출
- [ ] 검증 배지가 없는 매체는 별도 섹션 ("미검증 — 검토 요청 가능")

**UI Guide**
- 배지 아이콘: `lucide-react` `ShieldCheck` + 4개 점 (4/4, 3/4 등)
- 컬러: 통과 `#C8913C` (rich amber), 미통과 `#B0B8C4` (pale gray)
- 커버 페이지: 좌상단 THINKAD 로고, 우상단 QR (제안서 URL), 중앙 "Verified" 도장

**기술 구현**
- Prisma `MediaVerificationBadge` 모델 신규 (§5 참조)
- `lib/build-quote-pdf.ts`에 `renderVerificationBadges(doc, badges)` 유틸 추가
- `/api/admin/quotes/[id]/pdf`에서 매체별 `include: { verificationBadges: true }`
- jsPDF SVG 렌더링은 `svg2pdf.js` 또는 base64 PNG pre-render
- Noto Sans KR 폰트(이미 탑재) 유지

---

#### F1.3 회원제 + My THINKAD 대시보드 `신규`

**User Story**
> "광고주로서, 로그인하면 내가 저장한 플래너 플랜, 요청한 견적, 진행 중인 캠페인, 즐겨찾기한 매체를 한 곳에서 보고 싶다."

**Acceptance Criteria**
- [ ] 이메일/비밀번호 + 소셜 로그인 (Kakao, Google) 지원
- [ ] `/my` 경로 하단에 탭: **플래너 저장본 / 견적 이력 / 캠페인 / 즐겨찾기 / 청구서**
- [ ] 기존 localStorage `tkad-planner-plan-v2` → 로그인 시 서버 동기화 (`PlannerPlan` 모델)
- [ ] 캠페인 탭: OoHQuote 상태 파이프라인 진행도 시각화
- [ ] 알림 벨 아이콘: 가격 변동, 새 매체 입고, 캠페인 상태 변경
- [ ] 계정 삭제 및 데이터 내보내기(JSON) 제공 (개인정보보호법 준수)

**UI Guide**
- 레이아웃: 좌측 세로 네비(200px) + 우측 컨텐츠
- Hero: "안녕하세요, {이름}님" + 이번 달 요약 카드 3종 (진행 캠페인, 저장 플랜, 미확인 알림)
- 각 카드: navy `#0D1B2E` 상단 바 + amber `#C8913C` CTA

**기술 구현**
- Auth: `next-auth` v5 또는 자체 세션 (`AdminUser` 구조 재사용)
- Prisma 신규: `User`, `UserSession`, `UserOAuthAccount`, `UserFavoriteMedia`, `PlannerPlan` (§5)
- 미들웨어: `middleware.ts`에 `/my/*` 경로 보호
- 소셜 로그인: Kakao OAuth (KR 광고주 다수), Google OAuth
- CSRF: 기존 Turnstile 사용 + SameSite=Lax 쿠키

---

#### F1.4 실시간 매체 알림 뱃지 `신규`

**User Story**
> "광고주로서, 관심 매체의 가용성이 바뀌거나 가격이 변동되면 즉시 알고 싶다."

**Acceptance Criteria**
- [ ] 매체 상세 페이지에 "가격/가용성 알림 받기" 버튼
- [ ] 알림 이벤트: `PRICE_CHANGED`, `AVAILABILITY_OPENED`, `NEW_PROOF_PHOTO`, `CAMPAIGN_STATUS_CHANGED`
- [ ] 전달 채널: 브라우저 푸시(Web Push), 이메일, (Phase 4) 앱 푸시
- [ ] 내비게이션 벨 아이콘에 뱃지 카운트 (숫자)
- [ ] 알림 센터(`/my/notifications`): 읽음/미읽음, 필터, 일괄 읽음
- [ ] Admin이 `Media` 수정 시 cron 없이 **DB 트리거** 수준에서 알림 큐 생성

**UI Guide**
- 벨 아이콘: 상단바 우측, 미읽음 시 `#C8913C` 도트
- 알림 드롭다운: 최신 5개 + "모두 보기"
- 토스트: 페이지 우상단 슬라이드 인

**기술 구현**
- Prisma: `Notification`, `NotificationSubscription`, `WebPushSubscription` (§5)
- 이벤트 발생 지점: `/api/admin/medias/[id]` PUT 핸들러에서 `price` 변경 감지 → `enqueueNotification()`
- 배송: 큐 테이블에서 cron(`/api/cron/dispatch-notifications`, 1분 주기) 읽어 Resend/Web Push 발송
- Web Push: `web-push` 라이브러리, VAPID 키는 환경변수
- 실시간성: 초기 폴링(30s), Phase 3에서 SSE 또는 Pusher 검토

---

### 3.2 Phase 2 (3–6개월) 확장 기능 — F2.1 ~ F2.4

#### F2.1 유동인구 데이터 자동 삽입 (공공데이터 API) `신규`

**User Story**
> "광고주·대행사로서, 매체 상세 페이지에서 KT·SKT 유동인구 데이터를 공식 출처와 함께 확인하고 싶다."

**Acceptance Criteria**
- [ ] 매체 상세 페이지에 **시간대별(0~23시) 유동인구 히트맵** 표시
- [ ] 성별·연령대(10~60+) 분포 차트 제공
- [ ] 요일별 평균 (평일/주말) 비교
- [ ] 데이터 출처 명시: "서울열린데이터광장 / 행정안전부 / 2025년 3월 기준"
- [ ] 매체 반경 300m·500m·1km 단위 선택
- [ ] 제안서 PDF에 자동 삽입 (F1.2와 연동)

**UI Guide**
- Recharts `AreaChart` + `BarChart` 조합
- 히트맵 색상: `#0D1B2E`→`#C8913C` 그라데이션
- 데이터 없을 시: "해당 지역은 heuristic 추정값" 뱃지 + `footfall-district-heuristic.ts` 폴백

**기술 구현**
- 공공데이터 API 연동: 서울시 생활인구, 통신사(KT/SKT) 유동인구 공공데이터셋
- `lib/footfall-public-data.ts` 신규 — 일별 fetch + PostgreSQL 캐시 (`FootfallSnapshot` 모델)
- Cron: `/api/cron/sync-footfall` (일 1회 03:00)
- 지오해시 기반 반경 쿼리 (현재 lat/lng 인덱스 재활용)
- Fallback: `lib/footfall-district-heuristic.ts` 기존 로직 유지

---

#### F2.2 4단계 검증 배지 시스템 확장 `신규`

**User Story**
> "매체 운영 담당자로서, 현장 검증 결과를 표준화된 루브릭에 따라 입력하고 배지가 자동 계산되길 바란다."

**Acceptance Criteria**
- [ ] Admin `/admin/medias/[id]/verification` 페이지 신규
- [ ] 4개 항목 × 각 5점 척도 (총 20점) 평가 폼
  - 입지: 보행량/접근성/주변 앵커 시설
  - 가시성: 시야 각도·장애물·높이
  - 조도(디지털): 휘도·야간 운영시간·색재현성
  - 경쟁매체: 반경 100m 내 동종 매체 수
- [ ] 현장 사진 업로드 필수 (최소 4장, 각 항목별 1장+)
- [ ] 검증자 서명·날짜·유효기간(6개월) 자동 기록
- [ ] 총점 기반 배지 자동 산출: 16+ Gold / 12+ Silver / 8+ Bronze
- [ ] 배지 만료 7일 전 Admin 알림

**UI Guide**
- Stepper 폼 (4단계 + 최종 리뷰)
- 각 단계 우측에 기준 루브릭 펼침 패널
- 저장 시 "재검증 필요일: 2026-10-18" 자동 계산

**기술 구현**
- `MediaVerificationBadge` 모델 (§5)
- `lib/verification-scoring.ts` — 점수 → 배지 등급 매핑
- Cloudinary 업로드 재활용 (`/api/admin/upload/cloudinary`)
- PDF 렌더링은 F1.2 연계

---

#### F2.3 OOH 트렌드 리포트 자동화 `기존 확장`

**User Story**
> "마케터로서, 매월 업계 트렌드를 AI가 정리한 리포트로 구독하고 싶다."

**Acceptance Criteria**
- [ ] 기존 `TrendReport` 모델 기반, 매월 1일 자동 초안 생성
- [ ] 입력 데이터: 지난달 캠페인 데이터 + 매체 가격 변동 + 공공 유동인구 트렌드
- [ ] Claude 4.7으로 섹션 생성: 시장 동향, DOOH 트렌드, 업종별 인사이트, 추천 매체 TOP10
- [ ] Admin `/admin/trend-reports` 검수 UI에서 수정 후 발행
- [ ] 구독자에게 Resend 이메일 자동 발송 (HTML 템플릿)
- [ ] `/insights/trend-reports/[month]` 웹 뷰 + PDF 다운로드

**기술 구현**
- 기존 `lib/ai-content-generator.ts` 확장
- 입력 프롬프트에 지난달 Prisma 집계 쿼리 결과 주입 (prompt caching — Anthropic `cache_control: { type: 'ephemeral' }`)
- 월 1일 03:00 cron: `/api/cron/generate-monthly-trend-report`
- `Subscriber` 모델 신규 (§5) — 이메일·관심 카테고리·언어

---

#### F2.4 성공사례 메트릭스 자동화 `기존 확장`

**User Story**
> "영업팀으로서, 완료된 캠페인의 성과 메트릭(CPM·리치·브랜드 리프트)이 자동으로 성공사례 페이지에 반영되길 바란다."

**Acceptance Criteria**
- [ ] `Campaign.status = completed` 전환 시 성공사례 초안 자동 생성
- [ ] 집계 메트릭: 노출수(impressions), 예상 리치, 실집행 금액, 제공 증빙 매수
- [ ] 고객 인터뷰 섹션은 Admin 수동 입력
- [ ] `/cases/[slug]` 페이지에 차트 자동 렌더링
- [ ] 승인 전에는 `status: draft` 유지

**기술 구현**
- 기존 `/api/admin/campaigns/[id]/draft-success-case` 핸들러 확장
- `SuccessCase.metricsJson`에 표준 스키마 강제 (JSON Schema validation)
- Recharts 재사용

---

### 3.3 Phase 3 (6–12개월) 플랫폼 기능 — F3.1 ~ F3.5

#### F3.1 AI 챗봇 컨설턴트 (Claude API) `신규`

**User Story**
> "처음 OOH를 검토하는 사용자로서, 24시간 언제든 '3,000만원 예산으로 강남 2030 타겟 매체' 같은 질문에 즉시 답변받고 싶다."

**Acceptance Criteria**
- [ ] 모든 페이지 우하단 플로팅 챗 위젯
- [ ] Claude 4.7 Sonnet/Opus 기반 대화 (스트리밍)
- [ ] 시스템 프롬프트: 기존 `lib/ai-chatbot-system.ts` + `lib/ai-ooh-expert.ts` 확장
- [ ] Tool use: `search_media`, `create_plan_draft`, `book_consultation`
- [ ] 대화 이력 저장 (로그인 시 서버, 비로그인 시 localStorage)
- [ ] "상담사 연결" 버튼 → CrmAccount 생성 + Slack 알림
- [ ] 한국어/영어 자동 감지
- [ ] Rate limit: 로그인 60 req/hr, 게스트 10 req/hr
- [ ] 환각 방지: tool 결과를 근거로만 답변, "확실하지 않음" 응답 허용

**UI Guide**
- 위젯: 60×60 원형 버튼, amber `#C8913C`
- 열림 상태: 400×600 패널, 좌측 하단 앵커
- 메시지 버블: 유저 navy, 어시스턴트 white + amber 테두리
- 빠른 질문 칩: "예산 상담" / "지역 추천" / "제안서 요청"

**기술 구현**
- `app/api/chat/route.ts` (기존) 확장
- Anthropic SDK streaming + tool use
- Prompt caching: 시스템 프롬프트 + 매체 카탈로그 요약을 `cache_control: { type: 'ephemeral' }`
- Tool handler: Prisma 쿼리로 실시간 매체 검색 (DB-backed `fetchPublicMediaCatalog` 경유)
- `ChatSession`, `ChatMessage` 모델 (§5)
- Vercel Edge runtime 또는 Node.js (Prisma 제약 확인)

---

#### F3.2 현장 VR 투어 `신규`

**User Story**
> "원거리 광고주로서, 실제 현장을 방문하지 않고 매체 위치와 주변 환경을 360° 영상으로 보고 싶다."

**Acceptance Criteria**
- [ ] 매체 상세 페이지에 VR 탭 (있는 매체만)
- [ ] 360° 이미지/영상 재생 (Marzipano 또는 Three.js)
- [ ] 매체 위치에 핫스팟 표시 → 클릭 시 매체 카드 팝업
- [ ] 주변 주요 시설(지하철·쇼핑몰) 핫스팟 제공
- [ ] 모바일: 자이로스코프 연동
- [ ] 녹화 다운로드 불가 (저작권 보호)

**기술 구현**
- 촬영: Insta360 / RICOH Theta로 현장 수집, Cloudinary equirectangular 업로드
- 렌더러: `marzipano` (15KB gzip) 또는 `@react-three/fiber` + `@react-three/drei`
- `MediaVRTour` 모델 (§5) — imageUrl, hotspotsJson, capturedAt
- Admin 업로드 UI: `/admin/medias/[id]/vr-tour`

---

#### F3.3 캠페인 성과 보고서 완전 자동화 `기존 확장`

**User Story**
> "광고주로서, 캠페인 종료 후 7일 이내에 완성된 성과 보고서 PDF를 받고 싶다."

**Acceptance Criteria**
- [ ] 집행 증빙 사진(`CampaignProofPhoto`) 자동 수집·분류 (시점별·매체별)
- [ ] 유동인구 기반 추정 노출수 산출
- [ ] 업종 평균 대비 CPM 비교 그래프
- [ ] AI 요약 섹션: 핵심 인사이트 + 다음 캠페인 제언
- [ ] 고객 로고/브랜드 컬러 맞춤 커버 페이지
- [ ] `Campaign.status = completed` 이후 7일 cron 자동 실행

**기술 구현**
- 기존 `lib/build-campaign-completion-pdf.ts` 확장
- `/api/cron/generate-completion-reports` 주 1회 cron
- AI 섹션: Claude 4.7 + 캠페인 데이터 프롬프트 주입
- 이메일 자동 발송 + CRM 자동 기록

---

#### F3.4 미디어 오너 등록 포털 `신규`

**User Story**
> "매체사 대표로서, THINKAD에 매체 240면을 CSV 업로드 한 번으로 등록하고, 수주 현황과 정산을 확인하고 싶다."

**Acceptance Criteria**
- [ ] `/owner` 별도 포털 (Admin과 분리)
- [ ] 회원가입 심사 프로세스 (사업자등록증 업로드 → Admin 승인)
- [ ] 매체 CSV 일괄 등록 (주소 자동 지오코딩)
- [ ] 예약/집행 현황 대시보드
- [ ] 월간 정산 리포트 PDF 다운로드
- [ ] 문의 → THINKAD Admin으로 자동 라우팅

**UI Guide**
- 포털 컬러: navy `#0D1B2E` 주 + teal 포인트 (Admin/Client와 구분)
- 업로드: Drag & drop CSV, 오류 셀 하이라이트

**기술 구현**
- `MediaOwner`, `MediaOwnerMembership` 모델 (§5)
- `Media.ownerId` FK 추가
- CSV 파싱: `papaparse`
- 지오코딩 배치: 기존 `/api/admin/networks/geocode-locations` 재활용
- 권한: 미들웨어에서 오너는 자신의 `ownerId` 매체만 조회

---

#### F3.5 파트너 대행사 네트워크 `신규`

**User Story**
> "대행사 AE로서, 자사 브랜드 PDF 템플릿으로 제안서를 생성하고 THINKAD로부터 수수료를 받고 싶다."

**Acceptance Criteria**
- [ ] 대행사 가입 후 승인 → 전용 대시보드
- [ ] 자사 로고/컬러/도메인(서브도메인) 커스터마이징
- [ ] 제안서 PDF에 자사 브랜드 자동 적용 (White-label)
- [ ] 수수료 셰어 구조 설정 (기본 5%, 협상 가능)
- [ ] 클라이언트 귀속(Attribution) 추적 — 쿠키 + 로그인

**기술 구현**
- `Agency`, `AgencyCommission` 모델 (§5)
- `QuoteTemplate.agencyId` FK 추가
- 서브도메인 라우팅: `middleware.ts`에서 `*.thinkad.kr` 감지 시 agency 컨텍스트 주입
- 수수료 계산: OoHQuote `status = payment_confirmed` 시 이벤트 발생

---

### 3.4 Phase 4 (12개월+) 글로벌 & 모바일 — F4.1 ~ F4.3

#### F4.1 다국어 풀 지원 (EN / CN / JP) `기존 확장`

**User Story**
> "해외 브랜드 매니저로서, 영어/중국어/일본어로 THINKAD를 탐색하고 제안서를 받고 싶다."

**Acceptance Criteria**
- [ ] `next-intl` 이미 설치됨 → locale `ko`/`en`/`zh`/`ja` 전체 지원
- [ ] 매체 이름·설명을 4개 언어로 관리 (`Media.nameEn` 이미 존재, 확장)
- [ ] 제안서 PDF 언어 선택
- [ ] Kakao Map → Google Map 자동 전환 (해외 접속 시)
- [ ] 통화: KRW 기본, USD/CNY/JPY 환산 표시
- [ ] 결제: Stripe 해외 카드 지원

**기술 구현**
- `Media` 테이블에 JSON 컬럼 `names: { ko, en, zh, ja }` / `descriptions`
- AI 번역 자동화: Admin 저장 시 Claude 4.7으로 초안 생성 → 사람 검수
- 환율 API: 한국은행 공시환율 일 1회 동기화
- i18n 키 추가 시 ko/en/zh/ja 모두 반영 (CLAUDE.md 룰)

---

#### F4.2 PWA / 모바일 앱 `신규`

**User Story**
> "매체사 현장 담당자로서, 모바일로 현장 사진을 찍어 즉시 매체 레코드에 업로드하고 싶다."

**Acceptance Criteria**
- [ ] Next.js App Router PWA (manifest + service worker)
- [ ] 오프라인 지원: 매체 카탈로그·즐겨찾기 캐시
- [ ] 푸시 알림 (F1.4 연동)
- [ ] 카메라 API로 증빙 사진 업로드
- [ ] 지오로케이션 API로 현장 매체 자동 제안
- [ ] iOS/Android 홈스크린 설치 가이드

**기술 구현**
- `next-pwa` 또는 직접 service worker (Next.js 16.2.3 호환성 확인 — `node_modules/next/dist/docs/` 참고)
- IndexedDB 오프라인 데이터 저장
- Workbox caching strategies (StaleWhileRevalidate)
- Capacitor 래핑 필요 시 별도 검토

---

#### F4.3 웨비나·세미나 예약 `신규`

**User Story**
> "광고주 교육 담당자로서, THINKAD 주관 OOH 세미나에 쉽게 등록하고 녹화본을 다시 볼 수 있기를 원한다."

**Acceptance Criteria**
- [ ] `/events` 목록·상세 페이지
- [ ] 온라인(Zoom/Teams)·오프라인 혼합
- [ ] 참가 신청 + 리마인더 이메일
- [ ] 녹화본 업로드 후 회원 전용 공개
- [ ] 출석 확인 → 아카데미 수료증 발급

**기술 구현**
- `Event`, `EventRegistration` 모델 (§5)
- Zoom Webhook으로 출석 확인
- 수료증 PDF 자동 발급 (`AcademyLesson` 재활용)

---

## 4. 정보 구조 및 사용자 플로우

### 4.1 사이트맵

```
THINKAD
├── /                           홈
├── /media                      매체 카탈로그
│   ├── /[id]                   매체 상세 (4단계 배지·VR·유동인구)
│   └── /network/[id]           매체 네트워크 패키지
├── /planner                    7단계 AI 플래너 위자드
├── /quote                      셀프 견적
│   └── /[id]                   견적 진행 상태
│       ├── /contract           e-서명 계약
│       └── /status             진행 현황
├── /compare                    매체 비교 툴
├── /recommend                  AI 추천
├── /insights                   트렌드 리포트
├── /cases                      성공사례
├── /academy                    OOH 아카데미
├── /events                     [신규] 웨비나·세미나
├── /my                         [신규] My THINKAD
│   ├── /plans                  저장된 플래너
│   ├── /quotes                 견적 이력
│   ├── /campaigns              진행 캠페인
│   ├── /favorites              즐겨찾기
│   └── /notifications          알림 센터
├── /admin                      Admin 포털 (내부)
├── /owner                      [신규] 매체사 포털
├── /partner                    [신규] 대행사 파트너 포털
├── /about, /services, /contact, /faq, /history, /privacy
└── /chat                       AI 챗봇 API
```

### 4.2 핵심 사용자 플로우

#### Flow A — 셀프서비스 광고주 (첫 집행)
```
홈 → /planner(1단계 목표)
   → (2) 매체 선택 ← 카탈로그 필터
   → (3) 크리에이티브 업로드·시뮬레이션
   → (4) 예산·기간 설정
   → (5) 지역·카테고리·인구통계
   → (6) 자동 리포트
   → (7) 견적 요청 → /quote/[id]
   → PDF 수신 (이메일 + 웹뷰)
   → e-서명 → 계약 확정
   → /my/campaigns 에서 진행 상황 추적
   → 캠페인 종료 → 자동 성과 보고서 수신
```
**이탈 방지 포인트**: 4→5 구간 이탈율 높을 가능성 → 챗봇 트리거 (30초 체류 시 "도움 필요하세요?")

#### Flow B — 대행사 AE (반복 사용자)
```
로그인 → /partner 대시보드
       → /compare 3개 매체 비교 → PDF 출력
       → /admin/quotes/new 템플릿 선택
       → 자사 브랜드 PDF 생성 → 클라이언트 전달
       → 수주 → CrmAccount 자동 연결
       → 수수료 정산 월별 리포트
```

#### Flow C — 매체사 (공급자)
```
/owner 가입 → 사업자등록증 업로드 → Admin 승인
  → 매체 CSV 업로드 → 자동 지오코딩
  → 검증 요청 제출 → THINKAD 현장 실사 예약
  → 4단계 검증 완료 → 배지 부여 → 판매 개시
  → 수주 알림 → 현장 증빙 사진 업로드 (모바일)
  → 월간 정산 PDF 수령
```

#### Flow D — AI 챗봇 진입
```
임의 페이지 → 플로팅 챗 클릭
  → 자연어 질문 → Claude + tool use (search_media)
  → 매체 카드 임베드 → "플래너로 가져가기" 버튼
  → /planner?preset=... 로 딥링크
  → 기존 플로우 A로 전환
```

### 4.3 네비게이션 계층

- **Primary GNB (상단)**: 매체 / 플래너 / 견적 / 비교 / 인사이트 / 사례 / 아카데미
- **Secondary (유저 메뉴)**: 알림벨 / My / 언어 / 로그인
- **Footer**: 회사 / 서비스 / 리소스 / 문의 / SNS

### 4.4 OoHQuote 상태 파이프라인

```
draft → sent → booking_requested → booking_pending
     → booking_confirmed → invoice_sent → payment_pending
     → payment_confirmed → contract_confirmed
     → in_progress → completed
                  └→ cancelled (언제든)
```
각 단계 전환 시 이벤트 버스 발행 → 알림·자동화 연쇄 (F1.4, F3.3).

---

## 5. 데이터 모델 · API 설계

### 5.1 Prisma 신규 모델 (기존 16개 모델은 유지, 말미에 append)

```prisma
// =============================================
// Phase 1: Auth & My THINKAD
// =============================================

model User {
  id              String   @id @default(cuid())
  email           String   @unique
  passwordHash    String?
  name            String?
  phone           String?
  company         String?
  locale          String   @default("ko")
  role            UserRole @default(advertiser)
  emailVerifiedAt DateTime?
  lastLoginAt     DateTime?
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt

  sessions        UserSession[]
  favorites       UserFavoriteMedia[]
  plans           PlannerPlan[]
  subscriptions   NotificationSubscription[]
  notifications   Notification[]
  chatSessions    ChatSession[]
  oauthAccounts   UserOAuthAccount[]

  @@index([email])
}

enum UserRole { advertiser agency owner admin }

model UserOAuthAccount {
  id           String   @id @default(cuid())
  userId       String
  provider     String   // kakao | google
  providerId   String
  accessToken  String?
  refreshToken String?
  createdAt    DateTime @default(now())

  user         User     @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@unique([provider, providerId])
  @@index([userId])
}

model UserSession {
  id        String   @id @default(cuid())
  userId    String
  token     String   @unique
  userAgent String?
  ip        String?
  expiresAt DateTime
  createdAt DateTime @default(now())

  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([userId])
}

model UserFavoriteMedia {
  id        String   @id @default(cuid())
  userId    String
  mediaId   String
  createdAt DateTime @default(now())

  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  media     Media    @relation(fields: [mediaId], references: [id], onDelete: Cascade)

  @@unique([userId, mediaId])
}

model PlannerPlan {
  id          String   @id @default(cuid())
  userId      String?
  name        String
  payloadJson Json     // 현재 localStorage 구조 그대로
  status      String   @default("draft") // draft | submitted | archived
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  user        User?    @relation(fields: [userId], references: [id], onDelete: SetNull)

  @@index([userId])
}

// =============================================
// Phase 1: Notifications
// =============================================

enum NotificationType {
  PRICE_CHANGED
  AVAILABILITY_OPENED
  NEW_PROOF_PHOTO
  CAMPAIGN_STATUS_CHANGED
  QUOTE_STATUS_CHANGED
  VERIFICATION_EXPIRING
}

enum NotificationChannel { web_push email sms in_app }

model NotificationSubscription {
  id        String               @id @default(cuid())
  userId    String
  type      NotificationType
  targetId  String?              // 예: mediaId
  channels  NotificationChannel[]
  createdAt DateTime             @default(now())

  user      User                 @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@unique([userId, type, targetId])
}

model Notification {
  id        String   @id @default(cuid())
  userId    String
  type      NotificationType
  title     String
  body      String
  linkUrl   String?
  payload   Json?
  readAt    DateTime?
  createdAt DateTime @default(now())

  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([userId, readAt])
}

model WebPushSubscription {
  id        String   @id @default(cuid())
  userId    String
  endpoint  String   @unique
  p256dh    String
  auth      String
  createdAt DateTime @default(now())

  @@index([userId])
}

// =============================================
// Phase 1/2: Verification Badges
// =============================================

enum VerificationTier { bronze silver gold }

model MediaVerificationBadge {
  id                String           @id @default(cuid())
  mediaId           String
  locationScore     Int              // 0-5
  visibilityScore   Int              // 0-5
  illuminationScore Int              // 0-5 (디지털만 의미)
  competitionScore  Int              // 0-5
  totalScore        Int              // computed 0-20
  tier              VerificationTier
  verifierName      String
  verifiedAt        DateTime         @default(now())
  expiresAt         DateTime
  photosJson        Json             // Cloudinary URL array
  notes             String?

  media             Media            @relation(fields: [mediaId], references: [id], onDelete: Cascade)

  @@index([mediaId, verifiedAt])
}

// =============================================
// Phase 2: Footfall + Subscribers
// =============================================

model FootfallSnapshot {
  id           String   @id @default(cuid())
  geohash      String   // 8~9 정밀도
  source       String   // seoul_open_data | kt | skt | heuristic
  observedAt   DateTime
  hourOfDay    Int      // 0-23
  totalCount   Int
  demographics Json?    // { gender: {m, f}, age: {10s, 20s, ...} }
  radiusM      Int
  createdAt    DateTime @default(now())

  @@index([geohash, observedAt])
}

model Subscriber {
  id           String   @id @default(cuid())
  email        String   @unique
  locale       String   @default("ko")
  categories   String[] // ["digital", "static", "market-trend"]
  verifiedAt   DateTime?
  unsubToken   String   @unique
  createdAt    DateTime @default(now())
}

// =============================================
// Phase 3: AI Chat / VR / Owner / Agency
// =============================================

model ChatSession {
  id         String   @id @default(cuid())
  userId     String?
  sessionKey String   @unique // for guests
  locale     String   @default("ko")
  createdAt  DateTime @default(now())
  updatedAt  DateTime @updatedAt

  user       User?    @relation(fields: [userId], references: [id], onDelete: SetNull)
  messages   ChatMessage[]

  @@index([userId])
}

model ChatMessage {
  id         String   @id @default(cuid())
  sessionId  String
  role       String   // user | assistant | tool
  content    String   @db.Text
  toolCalls  Json?
  tokensIn   Int?
  tokensOut  Int?
  createdAt  DateTime @default(now())

  session    ChatSession @relation(fields: [sessionId], references: [id], onDelete: Cascade)

  @@index([sessionId])
}

model MediaVRTour {
  id            String   @id @default(cuid())
  mediaId       String
  imageUrl      String   // Cloudinary equirectangular
  hotspotsJson  Json
  capturedAt    DateTime
  createdAt     DateTime @default(now())

  media         Media    @relation(fields: [mediaId], references: [id], onDelete: Cascade)

  @@index([mediaId])
}

model MediaOwner {
  id                 String   @id @default(cuid())
  companyName        String
  businessNumber     String   @unique
  ceoName            String
  contactEmail       String
  contactPhone       String
  address            String?
  businessDocUrl     String?  // Cloudinary
  approvedAt         DateTime?
  approvedByAdminId  String?
  createdAt          DateTime @default(now())
  updatedAt          DateTime @updatedAt

  memberships        MediaOwnerMembership[]
  medias             Media[]  @relation("MediaOwner")
}

model MediaOwnerMembership {
  id        String   @id @default(cuid())
  ownerId   String
  userId    String
  role      String   @default("staff") // ceo | manager | staff
  createdAt DateTime @default(now())

  owner     MediaOwner @relation(fields: [ownerId], references: [id], onDelete: Cascade)

  @@unique([ownerId, userId])
}

model Agency {
  id                String   @id @default(cuid())
  name              String
  subdomain         String   @unique
  logoUrl           String?
  brandColorPrimary String?
  brandColorAccent  String?
  contactEmail      String
  commissionRate    Decimal  @default(0.05) @db.Decimal(5, 4)
  approvedAt        DateTime?
  createdAt         DateTime @default(now())
  updatedAt         DateTime @updatedAt

  commissions       AgencyCommission[]
  templates         QuoteTemplate[] @relation("AgencyTemplates")
}

model AgencyCommission {
  id         String   @id @default(cuid())
  agencyId   String
  oohQuoteId String   @unique
  amount     Decimal  @db.Decimal(14, 2)
  status     String   @default("pending") // pending | paid | cancelled
  settledAt  DateTime?
  createdAt  DateTime @default(now())

  agency     Agency   @relation(fields: [agencyId], references: [id], onDelete: Cascade)

  @@index([agencyId, status])
}

// =============================================
// Phase 4: Events
// =============================================

model Event {
  id           String   @id @default(cuid())
  slug         String   @unique
  title        String
  titleEn      String?
  description  String   @db.Text
  format       String   // online | offline | hybrid
  startsAt     DateTime
  endsAt       DateTime
  capacity     Int?
  zoomUrl      String?
  venue        String?
  recordingUrl String?
  status       String   @default("scheduled") // scheduled | live | completed | cancelled
  createdAt    DateTime @default(now())

  registrations EventRegistration[]
}

model EventRegistration {
  id         String   @id @default(cuid())
  eventId    String
  userId     String?
  email      String
  name       String
  company    String?
  attendedAt DateTime?
  createdAt  DateTime @default(now())

  event      Event    @relation(fields: [eventId], references: [id], onDelete: Cascade)

  @@index([eventId])
}
```

### 5.2 기존 모델 수정 사항

- `Media`: `ownerId String?`, `latitude`/`longitude`에 공간 인덱스 추가, `names Json?` (i18n)
- `QuoteTemplate`: `agencyId String?` + `@relation("AgencyTemplates")`
- `Campaign`: `assignedAgencyId String?`

### 5.3 API 엔드포인트 (신규/확장 11종 그룹)

기존 89개 엔드포인트는 유지. 신규/확장만 기술.

**5.3.1 공용 인증 (Phase 1)**

| Method | Path | 설명 |
|---|---|---|
| POST | `/api/auth/register` | 이메일 회원가입 |
| POST | `/api/auth/login` | 로그인 |
| POST | `/api/auth/logout` | 로그아웃 |
| GET  | `/api/auth/session` | 현재 세션 |
| POST | `/api/auth/password/forgot` | 비번 재설정 메일 |
| POST | `/api/auth/password/reset` | 토큰 기반 재설정 |
| GET  | `/api/auth/oauth/:provider/start` | Kakao/Google OAuth start |
| GET  | `/api/auth/oauth/:provider/callback` | OAuth callback |
| POST | `/api/auth/email/verify` | 이메일 인증 토큰 |

**5.3.2 My THINKAD (Phase 1)**

| Method | Path | 설명 |
|---|---|---|
| GET    | `/api/my/profile` | 프로필 조회 |
| PATCH  | `/api/my/profile` | 프로필 수정 |
| DELETE | `/api/my/account` | 계정 삭제 (soft) |
| GET    | `/api/my/plans` | 저장된 플래너 |
| POST   | `/api/my/plans` | 플랜 저장 |
| DELETE | `/api/my/plans/:id` | 플랜 삭제 |
| GET    | `/api/my/favorites` | 즐겨찾기 |
| POST   | `/api/my/favorites` | 즐겨찾기 추가 |
| DELETE | `/api/my/favorites/:mediaId` | 삭제 |
| GET    | `/api/my/campaigns` | 내 캠페인 |
| GET    | `/api/my/quotes` | 내 견적 이력 |
| GET    | `/api/my/export` | 데이터 내보내기 (JSON) |

**5.3.3 알림 (Phase 1)**

| Method | Path | 설명 |
|---|---|---|
| GET    | `/api/notifications` | 목록 (cursor page) |
| PATCH  | `/api/notifications/:id/read` | 읽음 처리 |
| POST   | `/api/notifications/read-all` | 전체 읽음 |
| GET    | `/api/notifications/subscriptions` | 구독 목록 |
| POST   | `/api/notifications/subscriptions` | 구독 추가 |
| DELETE | `/api/notifications/subscriptions/:id` | 해지 |
| POST   | `/api/notifications/webpush/subscribe` | 브라우저 푸시 등록 |
| POST   | `/api/cron/dispatch-notifications` | (cron) 큐 소비 |

**5.3.4 지도·매체 (Phase 1)**

| Method | Path | 설명 |
|---|---|---|
| GET | `/api/public/media-catalog?bbox=&radiusKm=&centerLat=&centerLng=` | 지도 뷰 확장 쿼리 (`fetchPublicMediaCatalog` 경유 — DB-backed source of truth 유지) |
| GET | `/api/public/media/:id/nearby` | 반경 500m 매체 |

**5.3.5 검증 (Phase 1/2)**

| Method | Path | 설명 |
|---|---|---|
| GET  | `/api/admin/medias/:id/verification` | 현재 배지 |
| POST | `/api/admin/medias/:id/verification` | 새 검증 제출 |
| POST | `/api/cron/verification-expiring` | 만료 7일 전 알림 |

**5.3.6 유동인구 (Phase 2)**

| Method | Path | 설명 |
|---|---|---|
| GET  | `/api/public/footfall?lat=&lng=&radiusM=` | 반경 유동인구 |
| POST | `/api/cron/sync-footfall` | 공공데이터 일일 동기화 |

**5.3.7 AI 챗봇 (Phase 3)**

| Method | Path | 설명 |
|---|---|---|
| POST | `/api/chat` | 스트리밍 응답 (기존 확장) |
| GET  | `/api/chat/sessions` | 세션 목록 |
| GET  | `/api/chat/sessions/:id/messages` | 메시지 이력 |
| POST | `/api/chat/sessions/:id/handoff` | 상담사 연결 → CRM |

**5.3.8 VR (Phase 3)**

| Method | Path | 설명 |
|---|---|---|
| POST | `/api/admin/medias/:id/vr-tour` | 업로드 |
| GET  | `/api/public/medias/:id/vr-tour` | 공개 조회 |

**5.3.9 매체사 포털 (Phase 3)**

| Method | Path | 설명 |
|---|---|---|
| POST | `/api/owner/register` | 신청 |
| GET  | `/api/owner/me` | 오너 프로필 |
| POST | `/api/owner/medias/bulk` | CSV 업로드 |
| GET  | `/api/owner/bookings` | 수주 현황 |
| GET  | `/api/owner/settlements/:month` | 월간 정산 PDF |

**5.3.10 파트너 대행사 (Phase 3)**

| Method | Path | 설명 |
|---|---|---|
| GET   | `/api/agency/me` | 프로필 |
| PATCH | `/api/agency/branding` | 로고·컬러 수정 |
| GET   | `/api/agency/commissions?status=` | 수수료 이력 |

**5.3.11 다국어·이벤트 (Phase 4)**

| Method | Path | 설명 |
|---|---|---|
| GET  | `/api/public/events` | 목록 |
| POST | `/api/public/events/:id/register` | 참가 신청 |
| POST | `/api/admin/events` | 생성 |
| POST | `/api/admin/translations/generate` | 매체 다국어 번역 (Claude) |

### 5.4 API 표준

- **응답 형식**: `{ ok: true, data }` / `{ ok: false, error: { code, message } }`
- **페이지네이션**: cursor 기반 (`?cursor=&limit=`)
- **Rate limit**: 기존 `lib/rate-limit.ts` 확장 (Upstash Redis 또는 DB-backed)
- **CSRF**: SameSite 쿠키 + Origin 헤더 검증
- **OpenAPI**: Phase 2에 `openapi.yaml` 자동 생성 (zod → OpenAPI)

---

## 6. 개발 로드맵 · 배포 전략

### 6.1 마일스톤 개요

| Phase | 기간 | 주요 목표 | 인력 |
|---|---|---|---|
| **P1** | 2026.05 ~ 2026.07 | 지도 · 배지 · 회원 · 알림 | FE×2, BE×2, 디자인×1, PM×1 |
| **P2** | 2026.08 ~ 2026.10 | 유동인구 · 검증 시스템 · 트렌드/사례 자동화 | + 데이터엔지니어×1 |
| **P3** | 2026.11 ~ 2027.04 | AI 챗봇 · VR · 매체사/대행사 포털 · 완전자동 보고서 | + AI엔지니어×1 |
| **P4** | 2027.05 ~ | 다국어 · PWA · 이벤트 | + 글로벌 GTM×1 |

### 6.2 Phase 1 스프린트 (12주 / 6 스프린트)

- **Sprint 1 (W1-2)** · 인증 기반 — `User`, `UserSession`, OAuth 스캐폴드, `/my` 라우트 트리 + 미들웨어, 마이그레이션 · 시드
- **Sprint 2 (W3-4)** · 지도 MVP — Kakao Map 통합, bbox 쿼리, 핀 클러스터링, 사이드 카드
- **Sprint 3 (W5-6)** · My THINKAD — 플래너 localStorage → 서버 동기화, 즐겨찾기·견적 이력·캠페인 탭
- **Sprint 4 (W7-8)** · 검증 배지 (읽기 전용) — `MediaVerificationBadge` 시드, 카탈로그·상세·PDF 배지 노출
- **Sprint 5 (W9-10)** · 알림 시스템 — Notification·Subscription, Web Push · 이메일 디스패처, 알림 센터 UI
- **Sprint 6 (W11-12)** · 안정화 — Playwright E2E 확장, Lighthouse ≥ 90, 베타 공개 + 피드백

### 6.3 Phase 2 스프린트 (12주)

- W1-2: 공공데이터 API 조사·계약·스키마
- W3-4: `FootfallSnapshot` 수집 파이프라인 + 반경 쿼리
- W5-6: 매체 상세 유동인구 위젯·차트
- W7-8: 검증 Admin UI · 점수→배지 산출
- W9-10: 트렌드 리포트 월간 자동화 + 구독자
- W11-12: 성공사례 메트릭 자동화 + 안정화

### 6.4 Phase 3 스프린트 (24주)

- W1-4: Claude 챗봇 (tool use, streaming, 세션 DB)
- W5-8: VR 촬영 파일럿 10개 매체 + 뷰어
- W9-12: 매체사 포털 — 가입·승인·CSV·대시보드
- W13-16: 대행사 파트너 — 서브도메인·화이트라벨 PDF·수수료
- W17-20: 완전 자동 성과 보고서
- W21-24: 성능·보안 감사, SOC2 준비 킥오프

### 6.5 Phase 4 스프린트

- 다국어 번역 파이프라인 → 콘텐츠 에이전시 협업
- PWA + 오프라인 + 카메라 업로드
- Stripe 글로벌 결제
- 이벤트·웨비나 모듈

### 6.6 릴리즈 & 배포 전략

- **브랜치 전략**: `main` (prod) / `staging` / feature 브랜치
- **Preview deploy**: PR마다 Vercel/커스텀 런너 자동 배포
- **릴리즈 케이던스**: **격주 금요일 오전** 정기 배포 + 긴급 hotfix 즉시
- **롤백**: Vercel instant rollback + Prisma migration은 `prisma migrate resolve` 로 되돌림 가능한 변경만 채택
- **Feature flag**: 간단한 `FeatureFlag` 테이블 (Phase 2 도입) — 점진적 롤아웃, 카나리 사용자, kill-switch 용도

---

## 7. KPI · 리스크 · 운영 원칙

### 7.1 북극성 지표 (North Star Metric)

> **"월간 결제 확정 캠페인 수 (MCC, Monthly Confirmed Campaigns)"**
>
> 이유: 매출·재고·고객만족 모두와 상관관계가 가장 높음.

### 7.2 단계별 KPI

**Phase 1 (Activation)**

| 지표 | 기준선 | 3개월 목표 |
|---|---|---|
| MCC | — | 20건/월 |
| 가입 유저 수 | 0 | 1,000명 |
| 플래너 완주율 (1→6단계) | 35% | **60%** |
| 제안서 생성까지 평균 소요시간 | 3일 | **< 30분** |
| 지도 검색 사용률 | — | 활성 유저의 70% |
| NPS | — | ≥ 30 |

**Phase 2 (Engagement)**

| 지표 | 목표 |
|---|---|
| MCC | 60건/월 |
| 재방문율 (WAU/MAU) | 40% |
| 트렌드 리포트 구독자 | 3,000명 |
| 검증 배지 보유 매체 비율 | 60% |
| 매체 상세 평균 체류시간 | 3분+ |

**Phase 3 (Expansion)**

| 지표 | 목표 |
|---|---|
| MCC | 150건/월 |
| 챗봇 일 활성 세션 | 500건 |
| 챗봇 → 견적 전환율 | 15% |
| 파트너 대행사 수 | 20곳 |
| 매체사 포털 등록 매체 | 5,000면+ |
| VR 투어 보유 매체 | 500곳 |

**Phase 4 (Global)**

| 지표 | 목표 |
|---|---|
| MCC | 300건/월 |
| 해외 광고주 비율 | 20% |
| PWA 설치 수 | 10,000 |
| 다국어 페이지 SEO 유입 | 월 50,000 세션 |

### 7.3 제품 헬스 / 비즈니스 지표

- **P95 API 응답시간** < 300ms · **에러율** < 0.5% (5xx) · **빌드 성공률** ≥ 98%
- **E2E 테스트 커버리지** (핵심 플로우) ≥ 90% · **Lighthouse Performance** ≥ 90 (모바일)
- **GMV**: P1말 월 10억 → P4 월 50억+
- **Take rate**: 8~12% · **CAC** < ₩150,000 · **LTV/CAC** > 4
- **매체사 만족도** (공실률 감소): 평균 -10%p

### 7.4 측정 도구

- 이벤트 트래킹: PostHog (self-hosted) 또는 Plausible + 자체 DB 이벤트
- 에러 모니터링: Sentry
- 퍼포먼스: Vercel Analytics + Web Vitals
- 비즈니스 대시보드: Metabase 또는 `/admin/analytics` 자체 대시보드

### 7.5 리스크 & 미티게이션 (R1–R15)

| # | 리스크 | 영향 | 확률 | 미티게이션 |
|---|---|---|---|---|
| R1 | HOO의 가격 덤핑 또는 독점 매체 계약으로 재고 제한 | 높음 | 중 | 매체사와 비독점 장기 계약 + 검증 배지 가치 제공으로 lock-in |
| R2 | Claude API 비용 폭증 (챗봇·자동화 남용) | 중 | 높음 | Prompt caching 전면 도입, rate limit, 비용 대시보드, 사용자별 quota |
| R3 | AI 환각 → 잘못된 매체/가격 추천 | 높음 | 중 | tool use 강제, 응답 전 DB 재확인, "확인 필요" 라벨 |
| R4 | 공공데이터 API 중단/지연 | 중 | 중 | 자체 heuristic 폴백, 매주 데이터 덤프 캐싱 |
| R5 | 개인정보보호법/PIPA 위반 | 치명 | 중 | 약관·동의·마케팅 수신 분리, 데이터 내보내기/삭제 API, 암호화 저장 |
| R6 | 매체사 온보딩 느림 → 재고 부족 | 높음 | 높음 | 영업팀 매뉴얼 온보딩, 인센티브(3개월 수수료 면제), 자동 지오코딩 |
| R7 | Kakao Map API 쿼터/과금 | 중 | 중 | 무료 한도 초과 시 Naver Map 백업, 뷰포트 debounce |
| R8 | 대행사 반발 (자체 채널 우회 유도) | 중 | 높음 | 파트너 네트워크로 인센티브, 화이트라벨 제공 |
| R9 | 브라우저 호환성 (PDF/지도/VR) | 저 | 중 | Chrome/Safari/Edge 최신 2버전 지원, E2E 포함 |
| R10 | SEO 경쟁 (HOO 선점 키워드) | 중 | 높음 | 콘텐츠 허브(인사이트/사례/아카데미), schema.org Place 구조화 |
| R11 | 보안 사고 (서명 PDF 유출, 세션 탈취) | 치명 | 저 | 서명 PDF 암호화, 접근 로그, 세션 IP 바인딩, SOC2 로드맵 |
| R12 | Next.js 16 breaking change | 중 | 중 | `node_modules/next/dist/docs/` 의무 확인 (AGENTS.md), 메이저 업 시 별도 스프린트 |
| R13 | 모바일 사용자 이탈 | 중 | 높음 | 모바일 우선 디자인, P1부터 지도 바텀시트·플래너 세로 스크롤 최적화 |
| R14 | Prisma/PostgreSQL 성능 (매체 1만+, 지리쿼리) | 중 | 중 | 공간 인덱스·PostGIS 이관 플랜 (P3), 읽기 replica |
| R15 | 번역 품질 (AI 번역 부자연) | 중 | 중 | 전문 번역사 검수 루프, 주요 카피는 사람 확정 |

### 7.6 비상 계획 (Contingency)

- **서비스 장애**: Vercel → Railway/Fly.io 이중화 검토 (Phase 3)
- **데이터 유실**: 일 1회 PITR 백업, 주 1회 외부 S3 덤프
- **핵심 인력 이탈**: Runbook·ADR 문서화, Pair programming

### 7.7 법률/컴플라이언스 체크리스트

- [ ] 개인정보처리방침 v2026 갱신
- [ ] 이용약관 (셀프·매체사·대행사 각각)
- [ ] 전자상거래법 고지 (청약철회 예외 사유 명기)
- [ ] 전자서명법 (e-서명 무결성 보증)
- [ ] PIPA 준수 (해외 이전 시 동의)
- [ ] ISMS-P 인증 Phase 3 착수

### 7.8 운영 원칙

- **PR 머지·force push·close**는 사용자 명시 요청 있을 때만
- **공개 매체 경로**는 DB-backed `fetchPublicMediaCatalog` 유지 — mock/샘플 금지 (AGENTS.md)
- **i18n 키 추가** 시 ko/en/zh/ja 모두 반영
- **Next.js 16.2.3 breaking change** → 코드 작성 시 `node_modules/next/dist/docs/` 확인
- **v1 문서** (`docs/THINKAD-PLATFORM-PRD.md`)는 삭제하지 말고 역사적 레퍼런스로 유지

### 7.9 부록 A — 브랜드 & 디자인 시스템 (tailwind.config.ts 실값)

- Primary Navy: `#0D1B2E` (딥 잉크) · primaryLight `#1E3A5F` · primaryDark `#0A1420`
- Accent Gold: `#C8913C` (리치 앰버)
- Neutral: silver `#B0B8C4` / background `#D6D9E6`
- CTA: `#9B3C31` (hover `#85342A`)
- Typography: Pretendard (KO), Inter (EN), Noto Sans KR (PDF)
- Radius: 8px 기본, 16px 카드, 24px 모달
- Shadow: `0 1px 2px rgba(13,27,46,.06), 0 4px 12px rgba(13,27,46,.08)`

### 7.10 부록 B — 용어 정의

- **OOH**: Out-of-Home advertising (옥외광고)
- **DOOH**: Digital Out-of-Home (디지털 옥외광고)
- **CPM**: Cost per Mille (1,000회 노출당 비용)
- **Reach**: 순노출 인원
- **Impressions**: 누적 노출수
- **4단계 검증**: 입지/가시성/조도/경쟁매체 현장 실사
- **MCC**: Monthly Confirmed Campaigns (월간 확정 캠페인)
- **HOO**: House of OOH (경쟁 마켓플레이스)
- **JTBD**: Jobs-to-be-Done

### 7.11 부록 C — 관련 문서

- `docs/THINKAD-PLATFORM-PRD.md` (v1, 1,410줄)
- `docs/deployment-checklist.md`
- `docs/e2e-test-scenarios.md`
- `docs/page-design-and-media-search-spec.md`
- `AGENTS.md` (Next.js 16 신규 규칙)

---

> **Last updated**: 2026-04-20
> **Next review**: Phase 1 스프린트 3 완료 시점 (2026.06)

