# THINKAD Hybrid Platform — 제품 기획 통합 문서

> **버전**: v2.0 (2026-04-20 작성)
> **대상 독자**: 경영진 · PM · FE/BE/디자인팀 · 영업 · 매체본부
> **작성 관점**: 12년 경력 PM + Next.js 풀스택 아키텍트 + OOH 광고 도메인 전문가
> **기반 코드베이스**: Next.js **16.2.3** / Prisma 7.6.0 / PostgreSQL / Anthropic SDK 0.88.0 / next-intl 4.8.3
> **AGENTS.md 준수**: `fetchPublicMediaCatalog` (DB-backed) source of truth 유지. 공개 매체 경로는 mock/샘플 금지.
> **주의**: 사용자 초기 요청은 "Next.js 15 App Router" 이었으나 프로젝트 실제 스택은 16.2.3이며 AGENTS.md에 breaking change 체크 룰이 고정되어 있어 **16.2.3**을 기준으로 작성함.

---

## 목차

- [1. 제품 비전 & 포지셔닝](#1-제품-비전--포지셔닝)
- [2. 상세 기능 명세서 (Phase 1~3 + 추가 차별화)](#2-상세-기능-명세서-phase-13--추가-차별화)
- [3. 사용자 플로우 & 화면 설계](#3-사용자-플로우--화면-설계)
- [4. 기술 아키텍처 & 스택 추천](#4-기술-아키텍처--스택-추천)
- [5. 개발 로드맵 (Phase별 스프린트)](#5-개발-로드맵-phase별-스프린트)
- [6. 차별화 전략 & 성공 지표 (OKR)](#6-차별화-전략--성공-지표-okr)
- [7. 추가 제언](#7-추가-제언)

---

## 1. 제품 비전 & 포지셔닝

### 1.1 One-line Positioning (한 줄 포지셔닝)

> **"THINKAD — 한국에서 가장 신뢰받는 OOH, 가장 편리한 플랫폼."**
>
> _We are the **trust layer** for OOH advertising — where every media is field-verified, every quote is data-backed, and every campaign is proven._

### 1.2 Product Vision

> **"신뢰는 THINKAD, 편의성은 HOO 이상."**
>
> 우리는 한국 OOH 시장에서 **셀프서비스의 투명성**(HOO)과 **풀서비스의 전문성**(전통 대행사)을 동시에 제공하는 유일한 하이브리드 플랫폼이 된다. 2026년 말까지 "OOH를 처음 집행하는 브랜드가 가장 먼저 여는 탭"이 된다.

### 1.3 현재 상태 진단 (2026-04-20 기준)

| 영역 | 현재 (tkad-web.vercel.app) | 목표 |
|---|---|---|
| **랜딩 페이지** | ✅ 매우 잘 다듬어짐 (4단계 검증, TOP3 매체, 300%/200% 성과, 파트너 100+, 고객 증언) | 유지·심화 |
| **지도 매체 검색** | ❌ 없음 | P0 / Phase 1 |
| **자동 제안서** | ❌ 없음 (백엔드 `lib/build-quote-pdf.ts`는 존재) | P0 / Phase 1 |
| **매체플래너 (AI)** | ❌ 없음 | P0 / Phase 1 |
| **회원·대시보드** | ❌ 없음 (Admin 백오피스만 존재) | P0 / Phase 1 |
| **유동인구 데이터** | ⚠️ heuristic 폴백만 | P1 / Phase 2 |
| **VR 투어** | ❌ 없음 | P1 / Phase 2 |
| **검증 배지 UI** | ⚠️ 랜딩에 소개만, 매체 카드/PDF 미연동 | P0 / Phase 1~2 |
| **챗봇** | ⚠️ `/api/chat` 존재, UI 미노출 | P1 / Phase 3 |
| **다국어** | ⚠️ `next-intl` 설치·일부 경로만 | P2 / Phase 3 |
| **매체사 포털** | ❌ 없음 | P1 / Phase 3 |

**결론**: 프런트는 "고급 마케팅 랜딩" 수준에서 멈춰 있고, 플랫폼 기능은 0%. 백엔드(Prisma 16 모델, Admin, PDF 빌더, AI 엔드포인트)는 상당 부분 준비됨 → **프런트와 공개 UX에 집중 투자하면 3개월 내 MVP 가능**.

### 1.4 "전통 대행사 → 하이브리드 플랫폼" 전환 전략

전환은 기존 강점(검증·풀서비스)을 버리는 것이 아니라, **디지털 레이어로 포장하여 레버리지하는 것**이다.

**전략 4축**

| 축 | 전통 대행사 (As-Is) | 하이브리드 플랫폼 (To-Be) |
|---|---|---|
| **①Trust → 배지화** | 현장 4단계 검증 (내부 지식) | **검증 배지 API** — 매체 카드·제안서 PDF·비교표 모든 곳에 노출 |
| **②Service → 티어링** | 풀서비스 (고비용·고관여) | **3-Tier 서비스**: Self (무료), Assisted (AI+전문가 리뷰, 중간가), Full-service (기존 모델) |
| **③Speed → 자동화** | 제안서 3~7일 | **30분 자동 제안서** + 매체본부는 "검수·커스텀"에만 집중 |
| **④Scale → 네트워크** | 매체사 직접 계약 | **매체 오너 포털** + **파트너 대행사 네트워크** → 양면 시장 확대 |

**6개월 전환 경로**
1. **M1~M3 (MVP)**: 자동 제안서 + 지도 검색으로 **셀프서비스 트랙 신설** (기존 풀서비스 팀 업무는 그대로 유지)
2. **M4~M6 (차별화)**: 배지·VR·알림으로 **셀프서비스 → 풀서비스 전환 퍼널** 구축 (예: 셀프로 들어왔다가 "전문가 연결" 버튼으로 풀서비스 전환)
3. **M7~M12 (플랫폼)**: 매체 오너·대행사 네트워크로 양면 시장 확장. 이 시점부터 매출 믹스가 "에이전시 수수료" → "SaaS + 커미션 + 풀서비스" 다각화.

**내부 조직 원칙**
- 기존 매체본부 인력은 **"검증 실사팀" + "에스컬레이션 컨설턴트"**로 리브랜딩 (대체 아닌 레버리지)
- 자동 제안서가 대체한 공수는 **더 많은 매체 검증·더 깊은 컨설턴트 상담**에 재투입
- KPI 전환: "계약 수" → "검증 매체 수" + "플랫폼 GMV" + "풀서비스 전환율"

### 1.5 Product Principles (제품 원칙 4개)

1. **Evidence over Claim** — 모든 수치는 출처를 함께 표기한다. "노출 300,000" 대신 "KT 유동인구 2025-03 / 반경 500m / 주중 평균".
2. **Speed × Depth** — 30분 자동 제안서와 깊이 있는 전문가 상담을 **하나의 흐름**에서 연결한다. "자동이냐 사람이냐"의 이분법을 거부한다.
3. **Korean-first, Global-ready** — 한국 OOH 도메인의 깊이(사업자·지자체 인허가·국문 크리에이티브 룰)를 잃지 않으면서 KO→EN/CN/JP 확장이 가능한 데이터 구조 유지.
4. **One DB, Multi-facing** — Admin·Client·Public·Owner·Agency는 **동일한 Prisma 모델**을 공유한다 (`fetchPublicMediaCatalog` 단일 진실 원천).

### 1.6 HOO 대비 8축 압도 포지셔닝

| 축 | HOO | **THINKAD** | 압도 방식 |
|---|---|---|---|
| 매체 검증 | 매체사 자율 등록 | **4단계 현장 실사 배지** | 매체 카드·PDF·비교표에 배지 상시 노출 |
| 제안서 속도 | 24~48시간 | **30분 자동 생성 + 2시간 내 전문가 검수** | 셀프+어시스트 이중 트랙 |
| 데이터 근거 | 매체사 제공 자료 | **공공유동인구 + 자체 실적 + POI** | 출처 명시, 근거 없는 수치 금지 |
| 가격 투명성 | 호가 노출 | **가격 이력 스냅샷 + 실시간 가용성** | "이 매체 최근 3건 계약가" 공개 |
| AI 활용 | 없음/제한적 | **Claude 4.7 플래너/추천/챗봇/리포트** | 플래너 위자드에서 매체 조합 추천 |
| 집행 증빙 | 매체사 선택 | **필수 + 자동 PDF 완료 리포트** | 캠페인 종료 7일 내 자동 발송 |
| 다국어 | KO 중심 | **KO/EN/CN/JP 풀 지원** | 제안서 PDF 언어 선택 |
| 서비스 모델 | 셀프 단일 | **Self / Assisted / Full-service 3-Tier** | 전환 퍼널로 LTV 확대 |

---

## 2. 상세 기능 명세서 (Phase 1~3 + 추가 차별화)

> **표기 규칙**
> - **Priority**: `P0` = MVP 필수 (없으면 출시 불가) / `P1` = 차별화 핵심 (출시 후 4주 내) / `P2` = 보강 (분기 내)
> - **태그**: `신규` (코드 없음) / `기존 확장` (백엔드만 있음, FE 신설) / `기존 강화`
> - 각 기능은 **User Story → Acceptance Criteria → UI/UX → 기술 구현 → 의존성 → 측정 지표** 순서

---

### 2.1 Phase 1 — MVP (3개월, 가장 큰 임팩트)

#### F1.1 지도 기반 매체 검색 `P0` `신규`

**User Story**
> 광고주(박준호, 35세, 스타트업 마케팅 리드)로서, **관심 지역을 지도에서 핀으로 보고 카테고리·가격·검증 여부로 필터링**하여 후보 매체를 30초 내에 추리고 싶다. 그래야 "강남역 반경 500m DOOH 5천만원 이하" 같은 자연스러운 탐색이 가능해진다.

**Acceptance Criteria**

기능 AC (P0):
- [ ] `/media` 페이지 상단에 **지도 / 리스트 토글** 버튼
- [ ] Kakao Map SDK로 매체 위치를 **클러스터링 핀**으로 렌더링 (1,000개+에서도 60fps)
- [ ] 핀 클릭 → 우측 사이드 카드: 썸네일 · 매체명 · 가격대 · 4단계 검증 배지 · 가용성 · "상세보기" CTA
- [ ] 지도 이동 (`bounds_changed`) 시 **뷰포트 내 매체만 재쿼리** (debounce 500ms)
- [ ] 카테고리(빌보드/버스쉘터/지하철/DOOH 등) · 가격대 슬라이더 · 검증 배지 여부(All / Verified Only) 필터가 지도와 양방향 동기화
- [ ] **반경 검색**: 지도 임의 지점 우클릭 → "이 지점 기준 500m / 1km / 2km 매체 보기" 팝업
- [ ] URL 쿼리에 `?lat=&lng=&zoom=&category=&priceMax=&verifiedOnly=` 저장 (공유·SEO)

반응형 AC (P0):
- [ ] 모바일: 상단 70% 지도, 하단 30% 바텀시트 리스트 (드래그업 시 70%로 확장)
- [ ] 태블릿: 좌측 40% 리스트 + 우측 60% 지도

품질 AC (P0):
- [ ] 첫 로딩 (LCP) < 2.5s · 클러스터 렌더링 < 100ms
- [ ] Kakao Map 쿼터 초과 시 Naver Map 자동 폴백 (Phase 2)
- [ ] 비로그인도 사용 가능, 로그인 시 "지도 즐겨찾기 위치" 저장

**UI/UX**
```
┌─────────────────────────────────────────────────────────┐
│ [GNB: 매체 / 플래너 / 견적 / 비교 / 인사이트 / My ]  🔔 🌐│
├─────────────────────────────────────────────────────────┤
│ [지도] [리스트] | 카테고리▼ 가격▼ ✓Verified | 찾기🔍   │
├──────────────────────┬──────────────────────────────────┤
│ 매체 리스트 (35%)    │ Kakao Map (65%)                  │
│ ┌─[썸네일]──────────┐│       ●────●                     │
│ │강남역 디지털보드  ││      ╱      ╲                    │
│ │₩4,800만 / 월     ││     ●  [클러스터: 12]              │
│ │🛡️4/4 GOLD       ││      ╲      ╱                    │
│ │가용 ◯  [상세→]   ││       ●────●                     │
│ └──────────────────┘│                                   │
│ ┌──────────────────┐│      [+] [-] [📍 내위치]          │
│ ...                  │                                   │
└──────────────────────┴──────────────────────────────────┘
```

**핵심 인터랙션**
- 핀 hover → 100×60 미니 카드 (썸네일 + 가격)
- 클러스터 클릭 → 자동 줌인 (현재 zoom + 2)
- 사이드 카드 "상세보기" → `/media/[id]` 새 탭 열기 (Cmd/Ctrl+클릭은 진짜 새 탭)
- 필터 변경 시 URL 자동 업데이트 + 지도 리프레시 (300ms throttle)

**기술 구현**
- 컴포넌트: `components/media-map-view.tsx` 신규, `next/dynamic` `ssr: false` 로 import
- SDK: `//dapi.kakao.com/v2/maps/sdk.js?appkey=<KEY>&libraries=clusterer,services`
- API: `GET /api/public/media-catalog` 확장 — 쿼리 파라미터 `bbox=sw_lat,sw_lng,ne_lat,ne_lng` `radiusKm` `centerLat` `centerLng`
- **DB-backed source of truth 유지**: `lib/fetchPublicMediaCatalog.ts`에 bbox/반경 인자 추가 (mock 금지 — AGENTS.md)
- Prisma: `Media` 모델에 `@@index([latitude, longitude])` 추가, Phase 3에 PostGIS 이관 옵션 열어둠
- 가상 스크롤: `@tanstack/virtual` (의존성 추가)
- Intersection Observer로 뷰포트 밖 카드 언마운트 → 메모리 절감
- 색상 토큰 (tailwind.config.ts 실값): primary `#0D1B2E` / accent `#C8913C` / silver `#B0B8C4`

**의존성**
- `MediaVerificationBadge` 모델 (F1.2와 공유)
- Kakao 디벨로퍼스 API 키 발급 (`NEXT_PUBLIC_KAKAO_MAP_KEY`)

**측정 지표**
- 지도 사용률 = (`/media`에서 지도 토글 클릭한 세션 / 전체 `/media` 세션)
- 핀 → 상세 전환율 = (매체 상세 진입 / 핀 클릭)
- 평균 핀 클릭 수 = 세션당 평균 (목표 5+)

---

#### F1.2 자동 제안서 생성기 (1클릭 PDF + 검증 배지) `P0` `기존 확장`

**User Story**
> 광고주로서, 마음에 든 매체 3~5개를 장바구니에 담은 뒤 **단 1번의 클릭으로 자사 로고가 박힌 제안서 PDF를 30초 내에 다운로드**받아 C-레벨에 당일 공유하고 싶다. 제안서 안에 **THINKAD 4단계 검증 배지**가 박혀 있어야 의사결정자가 한눈에 신뢰한다.

**Acceptance Criteria**

기능 AC (P0):
- [ ] 매체 카드·상세·비교 페이지에 "📋 제안서에 담기" 버튼
- [ ] 우상단 장바구니 배지 (담긴 매체 수)
- [ ] `/quote/new` 페이지: 담긴 매체 목록 · 캠페인 정보 폼 (브랜드명·기간·예산·연락처)
- [ ] **"PDF 생성" 1클릭** → 30초 내 다운로드 (서버에서 jsPDF + Noto Sans KR)
- [ ] PDF 구성 (필수 섹션):
  1. **커버**: THINKAD 로고 · 광고주 로고 · 캠페인명 · 발행일 · QR (웹뷰 URL)
  2. **요약**: 총 매체 수 · 총 예상 노출 · 총 견적 · 캠페인 기간
  3. **매체별 상세** (각 1페이지): 매체 사진 · 위치 지도(Kakao 정적 이미지) · 가격 · 가용 일자 · **🛡️ 4단계 배지** · 유동인구 차트 · CPM
  4. **검증 배지 부록**: 4단계 검증의 의미·기준
  5. **계약 안내**: e-서명 링크 · 결제 방법 · 담당자 연락처
- [ ] 공개 웹뷰 `/quote/[id]` (비로그인도 토큰으로 접근 가능)
- [ ] 견적 PDF 다운로드 카운트·만료일(7일) 추적

차별화 AC (P0):
- [ ] **검증 배지 4종**(입지·가시성·조도·경쟁매체)이 각 매체 행에 ●○●○ 형태로 시각화
- [ ] PDF 좌상단에 "Verified by THINKAD" 워터마크 (검증 매체만)
- [ ] 미검증 매체는 "검증 진행 중" 회색 뱃지 + "검증 요청 가능" 안내

PPT 옵션 AC (P1):
- [ ] "PPT로 받기" 옵션 → `pptxgenjs`로 동일 컨텐츠 PPT 생성 (편집 가능)
- [ ] 광고주는 PPT를 받아 자사 슬라이드에 자유롭게 재구성

품질 AC (P0):
- [ ] PDF 용량 < 5MB (이미지 WebP 변환·압축)
- [ ] 한글 자소 분리 없음 (Noto Sans KR 임베드 검증)
- [ ] PDF 메타데이터 (Title·Author·Subject) 자동 채움

**UI/UX**
```
[/quote/new]
┌─────────────────────────────────────────────────────────┐
│  📋 견적 요청서 (3개 매체 선택됨)                       │
├─────────────────────────────────────────────────────────┤
│  캠페인명 [____________________________]                │
│  광고주명 [____________________________]                │
│  희망 기간 [2026-06-01] ~ [2026-06-30]                  │
│  예산 [₩ 50,000,000  ]                                  │
│  연락처 [email________] [phone______]                   │
├─────────────────────────────────────────────────────────┤
│  선택한 매체                                             │
│  ┌──────────────────────────────────────┐              │
│  │ 🖼️ 강남역 DOOH    ₩48M  🛡️4/4    [X] │              │
│  │ 🖼️ 홍대 빌보드    ₩12M  🛡️3/4    [X] │              │
│  │ 🖼️ 잠실 버스쉘터   ₩6M  🛡️4/4    [X] │              │
│  └──────────────────────────────────────┘              │
│  총 견적: ₩66,000,000   예상 노출: 5,200,000회/월       │
├─────────────────────────────────────────────────────────┤
│  ☐ THINKAD 매체본부 검수 추가 (+무료, 2시간 내 회신)    │
│                                                          │
│  [📄 PDF 생성] [📊 PPT 생성] [📩 이메일로 받기]         │
└─────────────────────────────────────────────────────────┘
```

**핵심 인터랙션**
- "PDF 생성" 클릭 → 진행 모달 (단계별: 데이터 수집 → 차트 렌더 → PDF 합성 → 완료)
- 생성 완료 시 자동 다운로드 + "이메일로도 받기" 옵션
- "검수 추가" 체크 시 → 어시스트 트랙으로 자동 분기 (매체본부 Slack 알림)
- 토큰 기반 공유 URL: `/quote/[id]?t=xxxxx` (만료 7일)

**기술 구현**
- 기존 `lib/build-quote-pdf.ts` 확장
  - 검증 배지 렌더링 함수 `renderVerificationBadges(doc, badges)` 신규
  - SVG 아이콘은 `svg2pdf.js` 또는 base64 PNG pre-render
- API: `POST /api/quotes` 신규 (인증) / `GET /api/quotes/[id]/pdf` 다운로드 / `GET /api/quote/[id]?t=token` 공개 웹뷰
- Prisma `OohQuote` 모델 (기존) + `MediaVerificationBadge` (F1.4와 공유)
- Kakao 정적 지도 API: `https://dapi.kakao.com/v2/maps/staticmap?...` (PDF 임베드)
- 차트 (PDF용): `chart.js` headless 또는 `node-canvas`로 PNG 사전 렌더
- 폰트: Noto Sans KR 이미 탑재 (`assets/fonts/`)
- 비동기 처리: 생성이 5초 이상 예상되면 백그라운드 큐 (`/api/cron/generate-quote-pdf`) + Web Push 완료 알림

**의존성**
- F1.1 (장바구니 = 지도/리스트에서 담기 기능)
- F1.4 (검증 배지 데이터)
- 추후 F2.1 (유동인구 차트 자동 삽입)

**측정 지표**
- PDF 생성 → 견적 확정 전환율 (목표 25%+)
- 평균 PDF 생성 시간 (목표 < 30s)
- 검수 옵션 선택률 (어시스트 트랙 트래픽)

---

#### F1.3 매체플래너 (AI 추천 위자드) `P0` `신규`

**User Story**
> OOH 초심자(첫 집행)로서, "예산 5천만원, 서울 2030 여성 타겟, 뷰티 브랜드 인지도"를 입력하면 **AI가 최적의 매체 조합 3안을 10초 내에 제안**하고, 각 안의 근거(예상 리치·CPM·매체별 기여도)를 보여주길 원한다. 그래야 "왜 이 매체인가"를 내부 설득할 수 있다.

**Acceptance Criteria**

기능 AC (P0):
- [ ] `/planner` 7단계 위자드
  1. **목표**: 인지도 / 유입 / 브랜딩 / 프로모션
  2. **타겟**: 성별 · 연령대 · 관심사 (태그)
  3. **지역**: 전국 · 수도권 · 시도 · 구/동 · 반경 지점
  4. **카테고리**: 선호 매체 유형 (복수 선택)
  5. **예산·기간**: 슬라이더 + 기간 입력
  6. **크리에이티브**: 업로드 (이미지/영상) — 옵션
  7. **결과**: AI가 매체 조합 3안 (Conservative / Balanced / Aggressive) 제시
- [ ] 각 안에 대해 표시:
  - 매체 리스트 (5~15개)
  - 총 견적 · 예상 리치 · 예상 CPM
  - 각 매체 기여도 (파이 차트)
  - "왜 이 조합인가" AI 설명 (한 문단)
- [ ] "이 안으로 제안서 받기" → F1.2 장바구니로 자동 이동
- [ ] "전문가 상담 요청" 버튼 → 어시스트 트랙 전환

AI 품질 AC (P0):
- [ ] 추천은 **DB의 실제 매체 데이터 기반** (`fetchPublicMediaCatalog`로 검색, 가상 매체 금지)
- [ ] 환각 방지: Claude `tool use`로 `search_media`, `estimate_reach`, `get_footfall` 호출 강제
- [ ] 결과에 항상 **근거 출처 명시** (예: "강남역 DOOH 선정 이유: 2030 여성 유동인구 비율 62%, 출처 KT 2025-03")
- [ ] 불확실성 정직 노출: 데이터 부족 시 "이 매체는 검증 데이터 없음" 배너

진행 AC (P0):
- [ ] 1~6단계는 localStorage에 자동 저장 (`tkad-planner-plan-v2`)
- [ ] 로그인 사용자는 서버 동기화 (`PlannerPlan` 모델)
- [ ] 단계별 뒤로가기 가능, "다시하기" 버튼
- [ ] 완료율 진행바 (상단 고정)

품질 AC (P1):
- [ ] 추천 생성 시간 < 10초 (p95)
- [ ] 추천 결과는 3안 × 평균 10매체 = 30매체 표시
- [ ] A/B 테스트: AI 추천 vs 인기 조합 (서버 피처 플래그)

**UI/UX**

단계별 레이아웃 (세로 스크롤, 각 단계는 1스크린):
```
[/planner — Step 3/7 지역 선택]
┌─────────────────────────────────────────────────────────┐
│  ●─●─●─○─○─○─○   Step 3: 지역을 알려주세요             │
├─────────────────────────────────────────────────────────┤
│                                                          │
│   [ 🗺️ 지도로 선택 ] [ 📍 목록으로 선택 ]               │
│                                                          │
│   [Kakao Map — 여러 구역 다중 선택 가능]                │
│                                                          │
│   선택된 지역: #강남구  #송파구  #서초구                │
│                                                          │
│   💡 반경 지점으로도 가능 — "강남역 반경 3km"            │
│                                                          │
├─────────────────────────────────────────────────────────┤
│                            [← 이전]  [다음 →]            │
└─────────────────────────────────────────────────────────┘
```

결과 화면:
```
[/planner — 결과]
┌─────────────────────────────────────────────────────────┐
│  💡 AI가 3가지 조합을 제안합니다                         │
├─────────────────────────────────────────────────────────┤
│  [ Conservative ] [ 🌟 Balanced ] [ Aggressive ]        │
├─────────────────────────────────────────────────────────┤
│  🌟 Balanced — 예산 ₩48M / 예상 리치 2.1M               │
│                                                          │
│  AI 설명:                                                │
│  "2030 여성 타겟에 최적화된 강남·홍대 중심 조합입니다.   │
│   DOOH 60%(높은 가독성), 버스쉘터 40%(접근성) 분산으로   │
│   인지도와 전환을 동시에 잡습니다."                      │
│                                                          │
│  매체 리스트 (8):                                        │
│   • 강남역 DOOH  ₩12M  🛡️4/4                           │
│   • 홍대입구 빌보드  ₩8M  🛡️4/4                        │
│   ...                                                    │
│                                                          │
│  [매체별 기여도 파이 차트]                               │
│                                                          │
│  [ 📋 제안서로 받기 ] [ 🙋 전문가 상담 요청 ]           │
└─────────────────────────────────────────────────────────┘
```

**핵심 인터랙션**
- 단계 이동 시 애니메이션 (slide left/right)
- 3안 탭 전환 시 차트·리스트 리렌더 (200ms 페이드)
- 각 매체 호버 시 지도에 해당 핀 하이라이트 (미니 지도 포함 옵션)
- "왜 이 매체?" 각 매체 행에 `ℹ️` → 근거 툴팁 (유동인구·타겟 적합도)

**기술 구현**
- 기존 `lib/ai-content-generator.ts` + `lib/ai-ooh-expert.ts` 확장
- `app/planner/page.tsx` (서버 컴포넌트) + `app/planner/_components/*` (클라이언트)
- 상태 관리: `zustand` 또는 `jotai` (기존 패턴 확인 필요)
- API: `POST /api/planner/recommend` — body: 전체 플랜 입력 → Claude 호출 → 3안 반환
- **Claude tool use**:
  ```ts
  tools: [
    { name: 'search_media', input_schema: { region, category, priceMax, verifiedOnly } },
    { name: 'estimate_reach', input_schema: { mediaIds, duration } },
    { name: 'get_footfall', input_schema: { lat, lng, radiusM } },
  ]
  ```
- **Prompt caching**: 시스템 프롬프트 + OOH 도메인 지식 + 매체 카탈로그 요약을 `cache_control: { type: 'ephemeral' }` (5분 TTL)
- Prisma: `PlannerPlan` 모델 신규 (payloadJson) + 추천 결과 캐시 (`PlannerRecommendation`)
- 크리에이티브 미리보기: F2.3의 매체×크리에이티브 합성 시뮬레이션과 연동

**의존성**
- F1.1 (매체 DB)
- F1.4 (검증 배지 + 유동인구 Phase 2 연동)
- Anthropic API 키 + tool use 지원 SDK 0.88+

**측정 지표**
- 플래너 완주율 (1→7단계) — 목표 60%
- 결과 → 제안서 전환율 — 목표 40%
- "전문가 상담" 전환율 — 목표 10% (어시스트 트랙 유입)
- 평균 추천 생성 시간 (p95 < 10s)

---

#### F1.4 로그인 + My THINKAD 대시보드 `P0` `신규`

**User Story**
> 광고주로서, 로그인하면 **지난 플래너 플랜, 요청한 견적, 진행 중인 캠페인, 즐겨찾기한 매체, 받은 알림**을 한 곳에서 보고 싶다. 비로그인일 때 localStorage에 저장된 플래너는 로그인 시 **자동으로 서버에 동기화**되어야 한다.

**Acceptance Criteria**

인증 AC (P0):
- [ ] 이메일 + 비밀번호 가입 (이메일 인증 필수)
- [ ] 소셜 로그인: Kakao (KR 필수) · Google
- [ ] 비밀번호 재설정 (이메일 토큰)
- [ ] 세션 유지 7일 (refresh token 30일)
- [ ] **비로그인 → 로그인 시 localStorage 플래너 자동 서버 동기화**
- [ ] 로그아웃 / 계정 삭제 (soft delete, 30일 유예)
- [ ] 데이터 내보내기 (JSON 다운로드, PIPA 준수)

대시보드 AC (P0):
- [ ] `/my` 레이아웃: 좌 세로 네비 (200px) + 우 컨텐츠
- [ ] 탭 구성:
  1. **대시보드** (요약 홈): 진행 캠페인 · 저장 플랜 · 미확인 알림 카드 3종
  2. **플래너 저장본**: 저장된 `PlannerPlan` 리스트
  3. **견적 이력**: 요청한 `OohQuote` 상태별 표시
  4. **진행 캠페인**: 계약 후 집행 중인 캠페인 (상태 파이프라인 시각화)
  5. **즐겨찾기**: 저장한 매체 그리드
  6. **알림 센터**: 모든 알림 (F2.2)
  7. **프로필·설정**: 개인정보·알림 설정·비밀번호·계정삭제
- [ ] 각 탭 URL 직접 접근 가능 (`/my/plans`, `/my/quotes`, ...)
- [ ] 상단바 벨 아이콘 · 미읽음 숫자 뱃지

권한 AC (P0):
- [ ] `/my/*` 미들웨어에서 세션 검증, 미인증 시 `/login?redirect=/my/...`
- [ ] 대행사 역할 (`role=agency`)은 `/my` 대신 `/partner` 리다이렉트
- [ ] 매체사 역할 (`role=owner`)은 `/owner` 리다이렉트

품질 AC (P1):
- [ ] 대시보드 첫 로딩 < 1.5s
- [ ] 모바일: 좌 네비가 상단 드로어로 변경

**UI/UX**
```
[/my 대시보드]
┌─────────────────────────────────────────────────────────┐
│ 🏠 대시보드     │ 안녕하세요, 박준호님 👋               │
│ 📋 플래너      │                                        │
│ 📄 견적 이력    │ ┌──────────┬──────────┬──────────┐    │
│ 🚀 캠페인      │ │ 진행 캠페인│ 저장 플랜 │ 미확인    │    │
│ ⭐ 즐겨찾기    │ │    2건   │    5개   │ 알림 3개 │    │
│ 🔔 알림        │ └──────────┴──────────┴──────────┘    │
│ ⚙️ 설정        │                                        │
│                │ 📈 이번 달 활동                        │
│                │ [차트: 견적 3, 제안서 다운 8, 상담 1]   │
│                │                                        │
│                │ 🎯 추천 액션                           │
│                │ • 저장된 플랜 "여름 캠페인" 제안서 요청 │
│                │ • 즐겨찾기 매체 "강남 DOOH" 가격 변동  │
└─────────────────────────────────────────────────────────┘
```

**기술 구현**
- 인증: `next-auth` v5 (App Router 호환) — Credentials · Kakao · Google providers
  - 또는 기존 `AdminUser` 세션 구조 재사용 (Prisma 기반)
- Prisma 신규 모델:
  - `User` (email, passwordHash, name, phone, company, locale, role, emailVerifiedAt, lastLoginAt)
  - `UserSession` (token, userAgent, ip, expiresAt)
  - `UserOAuthAccount` (provider, providerId, accessToken)
  - `UserFavoriteMedia` (userId, mediaId)
  - `PlannerPlan` (userId, name, payloadJson, status)
- API:
  - `POST /api/auth/register` `POST /api/auth/login` `POST /api/auth/logout`
  - `GET /api/auth/session` `POST /api/auth/password/forgot` `POST /api/auth/password/reset`
  - `GET/POST /api/auth/oauth/:provider/start` · `callback`
  - `GET/PATCH /api/my/profile` · `DELETE /api/my/account`
  - `GET/POST /api/my/plans` · `DELETE /api/my/plans/:id`
  - `GET /api/my/favorites` · `POST/DELETE` 추가/삭제
  - `GET /api/my/campaigns` `GET /api/my/quotes` `GET /api/my/export`
- 미들웨어: `middleware.ts`에 `/my/*` matcher 추가
- 소셜 로그인: Kakao OAuth 2.0 + Google OIDC
- CSRF: 기존 Turnstile + SameSite=Lax 쿠키
- 비밀번호 해싱: `argon2id` (OWASP 권장)
- 이메일 발송: 기존 Resend 통합 재활용

**의존성**
- F1.1~F1.3 (저장할 데이터 모델)
- F2.2 (알림 센터)

**측정 지표**
- 가입 → 활성 전환율 (가입 후 7일 내 플래너 또는 견적 사용)
- 로그인 리텐션 (D1/D7/D30)
- localStorage → 서버 동기화 성공률

---

### 2.2 Phase 2 — 차별화 (6개월, HOO 대비 압도)

#### F2.1 유동인구 데이터 자동 삽입 (공공데이터 + 자체 실적) `P1` `신규`

**User Story**
> 광고주·대행사로서, 매체 상세 페이지에서 **KT·SKT·서울시 공공 유동인구 데이터**와 **THINKAD가 지난 3년간 집행한 자체 실적 데이터**를 출처와 함께 비교해보고 싶다. 그래야 "이 매체는 정말 우리 타겟이 많이 보는가"를 숫자로 확신할 수 있다.

**Acceptance Criteria**

데이터 AC (P1):
- [ ] 매체 상세 페이지 "유동인구" 탭
- [ ] 시간대별(0~23시) 히트맵 + 요일별(월~일) 차트
- [ ] 성별·연령대(10~60+) 분포 차트
- [ ] 반경 선택 (300m / 500m / 1km)
- [ ] **출처 명시 필수**: "서울열린데이터광장 · 2025-03 기준" 같이 라벨
- [ ] 데이터 없는 지역은 heuristic 폴백 + "추정값" 뱃지
- [ ] **THINKAD 자체 실적 비교**: "이 매체에서 집행한 과거 캠페인 평균 CTR·체류시간"

PDF 연동 AC (P1):
- [ ] F1.2 PDF에 유동인구 미니 차트 자동 삽입
- [ ] F1.3 플래너 AI 추천 근거로 유동인구 데이터 활용

품질 AC (P1):
- [ ] 차트 렌더 < 300ms
- [ ] 일 1회 공공데이터 동기화 (03:00 cron)
- [ ] API 중단 시 마지막 스냅샷 자동 사용

**UI/UX**
```
[매체 상세 — 유동인구 탭]
┌─────────────────────────────────────────────────────────┐
│  📊 유동인구 분석 (반경: [500m▼])                       │
├─────────────────────────────────────────────────────────┤
│  시간대별 평균                                           │
│  [히트맵: 00시 ~ 23시 × 월~일]                          │
│                                                          │
│  성별·연령대 분포              요일별 평균              │
│  [도넛 차트]                  [막대 차트]               │
│                                                          │
│  📌 THINKAD 집행 실적 (n=12)                            │
│   • 평균 주목률 18% (업계 평균 12%)                     │
│   • 평균 체류 시간 3.2초                                 │
│                                                          │
│  💡 출처: 서울열린데이터광장 · 2025-03 / KT 유동인구    │
└─────────────────────────────────────────────────────────┘
```

**기술 구현**
- `lib/footfall-public-data.ts` 신규 (기존 `footfall-district-heuristic.ts` 폴백 유지)
- Prisma `FootfallSnapshot` 모델: `geohash` · `source` · `observedAt` · `hourOfDay` · `totalCount` · `demographics Json` · `radiusM`
- Cron: `/api/cron/sync-footfall` (일 1회 03:00) — 서울시 OpenAPI · KT/SKT 공공데이터셋
- 지오해시 반경 쿼리 (`ngeohash`) + PostgreSQL 인덱스
- API: `GET /api/public/footfall?lat=&lng=&radiusM=`
- 차트: Recharts `AreaChart` · `Heatmap` · `PieChart`
- 자체 실적 집계: `Campaign` 완료분 집계 쿼리 (`SuccessCaseMetric`)

**의존성**
- F1.1 (매체 위치 데이터)
- 공공데이터 API 계약 체결 선행

**측정 지표**
- 유동인구 탭 조회율
- 탭 조회 → 제안서 담기 전환율

---

#### F2.2 실시간 매체 업데이트 알림 (NEW!/UPDATE!/완판임박) `P1` `신규`

**User Story**
> 광고주로서, 즐겨찾기 매체의 **가격이 바뀌거나 가용성이 열리거나 완판이 임박**하면 즉시 브라우저·이메일로 알림을 받고 싶다. 관심 매체를 "놓치지" 않고 적기에 예약할 수 있어야 한다.

**Acceptance Criteria**

알림 이벤트 AC (P1):
- [ ] 이벤트 유형:
  - `PRICE_CHANGED` — 가격 변동 (±5% 이상)
  - `AVAILABILITY_OPENED` — 신규 가용 기간 오픈
  - `SOLD_OUT_SOON` — 완판임박 (남은 기간 10% 이하)
  - `NEW_MEDIA` — 즐겨찾기 지역에 신규 매체 등록
  - `NEW_PROOF_PHOTO` — 진행 캠페인 증빙 사진 업로드됨
  - `QUOTE_STATUS_CHANGED` — 견적 상태 전환
  - `CAMPAIGN_STATUS_CHANGED` — 캠페인 상태 전환
- [ ] 매체 카드에 **배지**: `NEW!` (7일 이내) · `UPDATE!` (가격/사진 변경) · `완판임박` (가용률 < 10%)

채널 AC (P1):
- [ ] 전달 채널: 브라우저 푸시(Web Push) · 이메일 · 앱 푸시(Phase 3 PWA)
- [ ] 알림 센터 `/my/notifications`: 읽음/미읽음 · 일괄 읽음 · 유형 필터
- [ ] 상단 벨 아이콘 드롭다운 (최신 5개 + "모두 보기")
- [ ] 설정 페이지에서 유형별 on/off

품질 AC (P1):
- [ ] 이벤트 발생 ~ 알림 도달 시간 < 2분 (p95)
- [ ] 이벤트 중복 제거 (같은 매체 가격이 하루 5회 변경 시 마지막만)
- [ ] 구독 해지 원클릭 (이메일 하단 `unsubscribe`)

**UI/UX**
```
[알림 센터 /my/notifications]
┌─────────────────────────────────────────────────────────┐
│  🔔 알림 센터    [모두 읽음으로 표시] [필터▼]           │
├─────────────────────────────────────────────────────────┤
│  오늘                                                    │
│  • 💰 강남역 DOOH 가격 변동 -8% (₩48M → ₩44M) 3분전    │
│  • 🔥 홍대 빌보드 완판임박 (남은 기간 5일)    1시간전    │
│  • 📸 캠페인 "여름 런칭" 증빙 사진 업로드     3시간전    │
│                                                          │
│  어제                                                    │
│  • 🆕 송파구에 신규 버스쉘터 12면 등록                  │
│  ...                                                     │
└─────────────────────────────────────────────────────────┘
```

매체 카드 배지:
```
┌─[썸네일]────────┐
│ [NEW!] [🛡️4/4] │
│ 강남역 DOOH     │
│ ₩44M (-8%↓)     │  ← UPDATE! 뱃지 + 가격 변동 화살표
└────────────────┘
```

**기술 구현**
- Prisma 모델:
  - `NotificationType` enum (상기 7종)
  - `NotificationChannel` enum (`web_push` · `email` · `sms` · `in_app`)
  - `NotificationSubscription` (userId, type, targetId, channels)
  - `Notification` (userId, type, title, body, linkUrl, payload, readAt)
  - `WebPushSubscription` (userId, endpoint, p256dh, auth)
- 이벤트 발생: `/api/admin/medias/[id]` PUT 핸들러에서 `price`/`availability` 변경 감지 → `enqueueNotification()`
- 디스패처 cron: `/api/cron/dispatch-notifications` (1분 주기) — 큐 읽어 Web Push/Resend 발송
- Web Push: `web-push` 라이브러리 + VAPID 키 (`NEXT_PUBLIC_VAPID_PUBLIC_KEY` · `VAPID_PRIVATE_KEY`)
- 실시간성: 초기 30초 폴링, Phase 3에서 SSE(`EventSource`) 또는 Pusher 검토
- 중복 제거: Redis sorted set (`notif:dedup:{userId}:{type}:{targetId}` TTL 1h)

**의존성**
- F1.4 (로그인 유저 대상)
- VAPID 키 발급

**측정 지표**
- 구독 생성률 (즐겨찾기 → 알림 구독 전환)
- 알림 오픈율 (이메일 open · 푸시 CTR)
- 알림 → 제안서 요청 전환율

---

#### F2.3 현장 실사 VR 투어 (360°) `P1` `신규`

**User Story**
> 지방·해외 광고주로서, **실제 현장을 방문하지 않고도 360° VR 투어**로 매체 위치·주변 환경·시야각을 확인하고 싶다. 의심이 남지 않아야 결제 버튼을 누를 수 있다.

**Acceptance Criteria**

기능 AC (P1):
- [ ] 매체 상세 페이지에 "VR 투어" 탭 (보유 매체만)
- [ ] 360° 이미지/영상 렌더 (Marzipano 우선, 대안 `@react-three/fiber`)
- [ ] 매체 위치·주요 시설 핫스팟 (지하철·쇼핑몰·경쟁매체)
- [ ] 핫스팟 클릭 시 카드 팝업 (매체 정보 or 시설 이름·거리)
- [ ] 모바일 자이로스코프 연동 (기기 기울기 반응)
- [ ] **녹화·다운로드 금지** (저작권 보호 — 워터마크 자동 삽입)

Admin AC (P1):
- [ ] `/admin/medias/[id]/vr-tour` 업로드 페이지
- [ ] Cloudinary equirectangular 업로드 (JPEG 4K~8K)
- [ ] 핫스팟 좌표(yaw, pitch) 에디터 (클릭하여 추가)

품질 AC (P1):
- [ ] 첫 프레임 표시 < 2초 (중간 해상도 프로그레시브)
- [ ] iOS Safari · Android Chrome 호환성 (WebGL)

**UI/UX**
```
[매체 상세 — VR 탭]
┌─────────────────────────────────────────────────────────┐
│  🥽 현장 VR 투어                                         │
│  ┌───────────────────────────────────────────────┐       │
│  │                                                │      │
│  │  [360° Marzipano 뷰어]                         │      │
│  │                                                │      │
│  │    ● 강남역 2번 출구 (38m)                     │      │
│  │                                                │      │
│  │                    ● 스타벅스 R점 (62m)        │      │
│  │                                                │      │
│  │  [↻ 360°] [🔍+] [🔍-]  [자이로: ON/OFF]        │      │
│  └───────────────────────────────────────────────┘      │
│  📅 촬영일: 2026-03-15   🎥 촬영: THINKAD 실사팀         │
└─────────────────────────────────────────────────────────┘
```

**기술 구현**
- 촬영 장비: Insta360 X4 / RICOH Theta Z1
- 업로드: Cloudinary `equirectangular` 포맷
- 렌더러: `marzipano` (pure JS, 15KB gzip, IE11까지 지원)
  - 대안: `@react-three/fiber` + `@react-three/drei` (3D 확장성)
- Prisma `MediaVRTour` (mediaId, imageUrl, hotspotsJson, capturedAt)
- API: `POST /api/admin/medias/:id/vr-tour` · `GET /api/public/medias/:id/vr-tour`
- 워터마크: Cloudinary transformation `l_text:Arial_60_bold:THINKAD,o_40,g_south_east`
- 프로그레시브: 저해상도 preload → 고해상도 swap

**의존성**
- Cloudinary 계정 (기존 보유)
- 실사 팀 VR 촬영 SOP 확립

**측정 지표**
- VR 탭 진입율 (매체 상세 방문자 대비)
- VR → 제안서 담기 전환율 (vs 비VR 매체)
- 평균 VR 체류 시간

---

#### F2.4 4단계 검증 배지 시스템 전면 적용 + 상세 리포트 `P0` `신규`

**User Story**
> 매체 운영 담당자(THINKAD 실사팀)로서, **현장 검증 결과를 표준 루브릭으로 입력**하면 배지가 자동 산출되고 PDF 리포트가 나오길 바란다. 광고주는 "이 매체는 왜 4/4인가"를 클릭 한 번으로 볼 수 있어야 한다.

**Acceptance Criteria**

검증 입력 AC (P0):
- [ ] `/admin/medias/:id/verification` 페이지
- [ ] **4개 항목 × 각 0~5점 척도** (총 20점)
  - **입지 (Location)**: 보행량·접근성·주변 앵커 시설
  - **가시성 (Visibility)**: 시야각·장애물·높이·거리
  - **조도 (Illumination)**: 휘도·야간 운영시간·색재현성 (디지털 매체만)
  - **경쟁매체 (Competition)**: 반경 100m 내 동종 매체 수
- [ ] 각 항목마다 **현장 사진 최소 1장 업로드** 필수 (총 4+장)
- [ ] 검증자 서명·날짜 자동 기록
- [ ] 유효기간 6개월 (`expiresAt` 자동 계산)
- [ ] 총점 기반 배지 자동 산출: **16+ Gold · 12+ Silver · 8+ Bronze**
- [ ] 만료 7일 전 Admin 알림 (F2.2 연계)

공개 노출 AC (P0):
- [ ] 매체 카드·상세·비교·PDF 제안서·플래너 결과 모든 곳에 배지 노출
- [ ] "🛡️ 4/4 GOLD" / "🛡️ 3/4 SILVER" 형식
- [ ] 배지 클릭 시 **상세 리포트 다이얼로그**: 4항목 점수·현장 사진·검증자·검증일

리포트 다운로드 AC (P1):
- [ ] "PDF 리포트 다운로드" 버튼 — 검증 전 과정 PDF (8페이지)
- [ ] 브랜드 자산으로 광고주가 내부 공유 가능

품질 AC (P0):
- [ ] 배지 데이터는 `Media` 쿼리에 자동 join (`include: { verificationBadges: true }`)
- [ ] "Verified Only" 필터와 즉시 연동 (추가 차별화 기능)

**UI/UX**
```
[매체 상세 — 상단 배지 영역]
🛡️ THINKAD 4단계 검증 4/4 GOLD  [상세 리포트 보기]
  ● 입지 5/5  ● 가시성 5/5  ● 조도 5/5  ● 경쟁 3/5
  검증일: 2026-03-12 (만료: 2026-09-12)
  검증자: 박실사 (THINKAD 현장실사팀)
```

```
[배지 클릭 다이얼로그]
┌─────────────────────────────────────────────────────────┐
│ 🛡️ THINKAD 4단계 검증 리포트                            │
├─────────────────────────────────────────────────────────┤
│ ● 입지 (Location) 5/5                                   │
│   [현장 사진 1]                                          │
│   "강남역 2번 출구 38m, 직선 보행량 시간당 3,200명"     │
│                                                          │
│ ● 가시성 (Visibility) 5/5                               │
│   ...                                                    │
│                                                          │
│ [📄 PDF 리포트 다운로드]                                 │
└─────────────────────────────────────────────────────────┘
```

**기술 구현**
- Prisma `MediaVerificationBadge`:
  - locationScore · visibilityScore · illuminationScore · competitionScore
  - totalScore · tier (VerificationTier enum: bronze/silver/gold)
  - verifierName · verifiedAt · expiresAt · photosJson · notes
- Admin 입력 폼: Stepper 4단계 + 최종 리뷰 + 사진 업로드 (Cloudinary)
- `lib/verification-scoring.ts` — 총점 → 배지 등급 매핑
- PDF 리포트: `lib/build-verification-report-pdf.ts` 신규
- 모든 공개 API에 배지 include
- 만료 알림: `/api/cron/verification-expiring` 일 1회

**의존성**
- F1.1 · F1.2 · F1.3 (노출 채널)
- Cloudinary 업로드 인프라

**측정 지표**
- 검증 배지 보유 매체 비율 (목표 P2말 60%)
- 배지 클릭률 (리포트 조회)
- Verified Only 필터 활성화율

---

### 2.3 Phase 3 — 풀 플랫폼 (12개월, 양면 시장)

#### F3.1 미디어 오너 등록 포털 `P1` `신규`

**User Story**
> 지방 매체사 대표(이동철, 58세)로서, **매체 240면을 엑셀 한 번 업로드로 등록**하고, 수주 현황·집행·정산을 대시보드로 관리하고 싶다. 매번 전화·카톡으로 대응하던 것을 자동화하고 싶다.

**Acceptance Criteria**

온보딩 AC (P1):
- [ ] `/owner` 별도 포털 (Admin 분리, 디자인 구분)
- [ ] 가입 흐름: 회사 정보 → 사업자등록증·통장사본 업로드 → Admin 심사 → 승인 이메일
- [ ] 승인 후 CEO 계정 생성 → `MediaOwnerMembership`로 직원 추가 가능 (role: ceo/manager/staff)

매체 등록 AC (P1):
- [ ] CSV 일괄 업로드 템플릿 제공 (한글 헤더, 예시 포함)
- [ ] 업로드 시 **주소 자동 지오코딩** (Kakao Local API)
- [ ] 오류 셀 하이라이트 + 다운로드 가능한 오류 리포트
- [ ] 단건 등록도 가능 (폼)
- [ ] 매체 사진 · 조감도 업로드 (Cloudinary)
- [ ] **THINKAD 현장 실사 요청** 버튼 → 실사팀 Slack 알림

운영 AC (P1):
- [ ] 매체별 예약 캘린더 (월/주/일 뷰)
- [ ] 수주 알림 (F2.2 오너용 이벤트)
- [ ] 월간 정산 리포트 PDF (매체별·캠페인별 집계)
- [ ] 집행 증빙 사진 모바일 업로드 (F4.2 PWA 연동)

권한 AC (P1):
- [ ] 미들웨어에서 `role=owner`는 자신의 `ownerId` 매체만 조회·수정
- [ ] 오너는 `Media.priceBase`만 수정 가능 (`verificationBadges`는 Admin만)

**UI/UX**
```
[/owner — 대시보드]
┌─────────────────────────────────────────────────────────┐
│ 🏢 (주)부산미디어 님 — 매체 240면 운영 중               │
├─────────────────────────────────────────────────────────┤
│ ┌─────────┬─────────┬─────────┬─────────┐              │
│ │ 이번달  │ 진행중  │ 공실률  │ 정산예정 │              │
│ │  12건   │  8건   │  22%   │ ₩18.4M  │              │
│ └─────────┴─────────┴─────────┴─────────┘              │
│                                                          │
│ 📅 예약 캘린더 [월/주/일]                               │
│ [캘린더 위젯]                                            │
│                                                          │
│ 🆕 최근 수주                                             │
│ • 강남스타일 뷰티 / 부산역 빌보드 3면 / 2026-06         │
│                                                          │
│ [📥 CSV 업로드] [➕ 매체 추가] [📄 정산 리포트]          │
└─────────────────────────────────────────────────────────┘
```

**기술 구현**
- Prisma `MediaOwner` · `MediaOwnerMembership`
- `Media.ownerId String?` FK 추가
- CSV: `papaparse` 클라이언트 파싱 → 서버 검증 후 저장
- 지오코딩 배치: 기존 `/api/admin/networks/geocode-locations` 재활용
- API: `POST /api/owner/register` · `GET /api/owner/me` · `POST /api/owner/medias/bulk` · `GET /api/owner/bookings` · `GET /api/owner/settlements/:month`
- 정산 PDF: `lib/build-owner-settlement-pdf.ts` 신규

**의존성**
- F1.1 (지오코딩 인프라)
- F2.2 (알림)

**측정 지표**
- 오너 가입 → 승인 전환율
- 오너당 평균 등록 매체 수
- 등록 매체 → 검증 완료 리드 타임

---

#### F3.2 챗봇 + 전문가 하이브리드 컨설턴트 `P1` `신규`

**User Story**
> 새벽 2시에 OOH를 검토하는 CMO로서, **챗봇이 즉시 답변**하다가 복잡한 질문이면 "전문가 연결" 버튼이 뜨길 바란다. 업무 시간엔 10분 내 매체본부가 응답해 자연스럽게 **챗 → 미팅 → 계약**으로 이어지길 원한다.

**Acceptance Criteria**

챗봇 AC (P1):
- [ ] 모든 페이지 우하단 플로팅 챗 위젯 (높이 60px 원형 버튼, amber `#C8913C`)
- [ ] Claude 4.7 Sonnet/Opus 스트리밍 응답
- [ ] **Tool use 강제**: `search_media`, `create_plan_draft`, `check_availability`, `get_footfall`, `book_consultation`
- [ ] 환각 방지: tool 결과 기반 응답, "확실하지 않음" 답변 허용
- [ ] 대화 이력 저장 (로그인 시 DB, 비로그인 시 localStorage)
- [ ] 한국어/영어 자동 감지 (Phase 3 말에 중국어/일본어 확장)

하이브리드 AC (P1):
- [ ] **"전문가 연결" 버튼** — 챗봇 답변 하단에 항상 노출
- [ ] 클릭 → 연락처 수집 폼 → `CrmAccount` 자동 생성 + 매체본부 Slack 알림
- [ ] 업무 시간 (09~18 KST) 접속 시 **"10분 내 매체본부가 답장합니다"** 배지
- [ ] 야간엔 **"내일 오전 첫 응답 예약"** 배지
- [ ] 상담 히스토리는 `/my/consultations`에서 확인

품질 AC (P1):
- [ ] Rate limit: 로그인 60 req/hr · 게스트 10 req/hr
- [ ] 응답 첫 토큰 < 1.5s (Streaming)
- [ ] 상담 응답 SLA: 업무 시간 10분, 야간 익일 10시

**UI/UX**
```
[플로팅 챗 위젯 — 열림 상태]
┌──────────────────────────────┐
│  🤖 THINKAD 어드바이저        │
│  ● 온라인 · 10분 내 전문가   │
├──────────────────────────────┤
│  안녕하세요! OOH 상담을 도와 │
│  드립니다.                    │
│                               │
│  💡 빠른 질문                │
│  [ 예산 상담 ] [ 지역 추천 ] │
│  [ 제안서 요청 ]             │
├──────────────────────────────┤
│  강남 3000만원 매체 추천해줘 │
│                               │
│  🤖 강남 지역 3,000만원 예산 │
│  에 최적화된 3개 조합을 찾았  │
│  습니다:                      │
│  1. DOOH 중심 (리치 극대화)   │
│     ...                       │
│                               │
│  [ 🙋 전문가 연결 ]          │
├──────────────────────────────┤
│  [메시지 입력___________] [↑]│
└──────────────────────────────┘
```

**기술 구현**
- `app/api/chat/route.ts` (기존) 확장
- Anthropic SDK 0.88+ streaming + tool use
- **Prompt caching**: 시스템 프롬프트 + OOH 지식 + 매체 카탈로그 요약을 `cache_control: { type: 'ephemeral' }` (5분 TTL)
- Tool handler: Prisma 쿼리 (DB-backed source of truth)
- Prisma `ChatSession` · `ChatMessage` (role, content, toolCalls, tokensIn/Out)
- `POST /api/chat/sessions/:id/handoff` — CRM 연동 + Slack webhook
- Vercel Edge runtime 또는 Node (Prisma 제약 확인 필요)
- UI: `components/chat-widget.tsx` (portal 렌더)

**의존성**
- F1.1 (매체 검색)
- F1.3 (플래너 템플릿)
- 기존 `CrmAccount` 모델

**측정 지표**
- 챗봇 일 활성 세션 (목표 P3말 500건)
- 챗봇 → 견적 전환율 (목표 15%)
- "전문가 연결" 전환율 (하이브리드 핵심)
- Claude 토큰당 비용 (prompt caching 적용 여부 모니터)

---

#### F3.3 다국어 풀 지원 (EN/CN/JP) + PWA/앱 `P2` `기존 확장`

**User Story**
> 해외 브랜드 매니저로서, **영어·중국어·일본어**로 THINKAD를 탐색하고 **PWA로 홈스크린에 설치**하여 모바일에서 즉시 사용하고 싶다. 매체사 직원은 **현장에서 사진을 찍어 즉시 업로드**할 수 있어야 한다.

**Acceptance Criteria**

다국어 AC (P2):
- [ ] `next-intl` (이미 설치) locale: `ko` · `en` · `zh` · `ja` 풀 지원
- [ ] 매체 이름·설명을 4개 언어로 관리 (`Media.names Json` 추가)
- [ ] 제안서 PDF 언어 선택 (F1.2 확장)
- [ ] 해외 접속 감지 시 Kakao Map → Google Maps 자동 폴백
- [ ] 통화: KRW 기본, USD/CNY/JPY 환산 표시 (한은 환율 API 일 1회)
- [ ] i18n 키 추가 시 **ko/en/zh/ja 모두 반영 필수** (CLAUDE.md 룰)

PWA AC (P2):
- [ ] Next.js 16.2.3 App Router PWA (manifest + service worker, 16.x 호환 라이브러리 확인 — `node_modules/next/dist/docs/` 체크)
- [ ] 오프라인 지원: 매체 카탈로그·즐겨찾기 IndexedDB 캐시
- [ ] 푸시 알림 (F2.2 Web Push 재활용)
- [ ] **카메라 API로 증빙 사진 업로드** (매체사·THINKAD 실사팀)
- [ ] **지오로케이션 API**로 현재 위치 매체 자동 제안
- [ ] iOS Safari · Android Chrome 홈스크린 설치 가이드

AI 번역 AC (P2):
- [ ] Admin 매체 저장 시 Claude 4.7으로 EN/CN/JP 초안 자동 생성
- [ ] 사람 검수 플로우 (`/admin/translations/queue`)

**기술 구현**
- 다국어: `middleware.ts`에서 `Accept-Language` + geo IP → locale 자동 설정
- `Media.names Json` (ko/en/zh/ja) · `descriptions Json`
- Google Maps JS API 조건부 로드 (non-KR IP)
- PWA: `next-pwa` 또는 직접 SW 작성 (Next.js 16.2.3 호환 확인 — AGENTS.md 룰 준수)
- 오프라인: Workbox `StaleWhileRevalidate` · IndexedDB (`idb` 라이브러리)
- 번역 API: `POST /api/admin/translations/generate` (Claude 4.7)
- 환율: 한국은행 공시환율 API 일 1회 cron 동기화

**의존성**
- F1.1~F2.4 (콘텐츠)
- Google Maps API 키
- 전문 번역사 검수 계약 (R15)

**측정 지표**
- 해외 세션 비율 (목표 P4말 20%)
- PWA 설치 수 (목표 10,000)
- 다국어 페이지 SEO 유입

---

#### F3.4 파트너 대행사 네트워크 `P1` `신규`

**User Story**
> 중견 대행사 AE(김미영, 42세)로서, **THINKAD 매체 인벤토리를 자사 브랜드 PDF**로 포장하여 클라이언트에 제안하고, 수주 시 **수수료를 THINKAD로부터 받고** 싶다. 서브도메인으로 자사 브랜드를 유지하고 싶다.

**Acceptance Criteria**

가입 AC (P1):
- [ ] `/partner` 별도 포털 (대행사 전용)
- [ ] 신청 → Admin 심사 → 승인
- [ ] 서브도메인 할당 (`cheil.thinkad.kr` 같이)

화이트라벨 AC (P1):
- [ ] 자사 로고·브랜드 컬러(primary/accent) 업로드
- [ ] 제안서 PDF에 자동 적용 (F1.2 확장)
- [ ] 서브도메인 접속 시 GNB·풋터 로고 자동 교체
- [ ] 대행사 커스텀 도메인 (`cname` 옵션, Phase 4)

수수료 AC (P1):
- [ ] 기본 수수료 5% (협상 가능, 0~15%)
- [ ] OoHQuote `status = payment_confirmed` 시 `AgencyCommission` 자동 생성
- [ ] 월별 정산 대시보드 (수수료 이력·상태 필터)
- [ ] 세금계산서 발행 연계 (Phase 4)

귀속 AC (P1):
- [ ] 클라이언트 귀속 추적: 쿠키 (`tkad_agency=xxx` 30일) + 로그인 후 `User.referrerAgencyId`

**UI/UX**
```
[/partner — 대시보드]
┌─────────────────────────────────────────────────────────┐
│ 🏢 Cheil Worldwide                                      │
│ cheil.thinkad.kr · 서브도메인 활성                       │
├─────────────────────────────────────────────────────────┤
│ ┌─────────┬─────────┬─────────┐                        │
│ │ 이번달  │ 누적    │ 미정산  │                        │
│ │ ₩4.2M  │ ₩31M   │ ₩2.1M  │                        │
│ └─────────┴─────────┴─────────┘                        │
│                                                          │
│ 🎨 브랜딩 설정 [편집]                                    │
│   로고: [cheil_logo.svg]   Primary: #E60012             │
│                                                          │
│ 📊 귀속 클라이언트 (12)                                  │
│ [리스트: 클라이언트명 · 진행건수 · 수수료]              │
└─────────────────────────────────────────────────────────┘
```

**기술 구현**
- Prisma `Agency` · `AgencyCommission`
- `QuoteTemplate.agencyId String?` FK + `@relation("AgencyTemplates")`
- 서브도메인: `middleware.ts`에서 `host.split('.')` → agency 컨텍스트 주입
- 귀속 쿠키: 첫 방문 시 설정, 로그인 시 `User.referrerAgencyId` 업데이트
- 수수료 계산: `payment_confirmed` webhook → `AgencyCommission.create` 트리거
- API: `GET /api/agency/me` · `PATCH /api/agency/branding` · `GET /api/agency/commissions?status=`

**의존성**
- F1.2 (PDF 브랜딩)
- F1.4 (User role=agency)

**측정 지표**
- 파트너 대행사 수 (목표 P3말 20곳)
- 대행사 경유 GMV 비율
- 대행사당 월 평균 귀속 건수

---

### 2.4 추가 차별화 기능

#### D1. Verified Media Only 필터 `P0` `신규` (Phase 1)

**User Story**
> 신중한 광고주로서, 매체 검색에서 **"THINKAD 현장 검증을 통과한 매체만 보기"** 토글 한 번으로 리스트를 좁히고 싶다. 그래야 실수할 확률이 줄어든다.

**Acceptance Criteria**
- [ ] 매체 리스트·지도·플래너·비교 모든 검색 UI에 **"✓ Verified Only"** 토글
- [ ] 기본값: OFF (재고 전부 노출)
- [ ] 토글 ON 시 `MediaVerificationBadge.tier ≠ null` 조건 필터 적용
- [ ] URL 쿼리 `?verifiedOnly=true` 동기화 (공유 가능)
- [ ] 토글 ON 상태에서 결과 수 뱃지 "검증 매체만 342개"
- [ ] 검증 배지 없는 매체는 "검증 진행 중" 회색 표시 (완전 숨김 X)

**기술 구현**
- `fetchPublicMediaCatalog({ verifiedOnly: true })` 옵션 확장
- Prisma: `where: { verificationBadges: { some: {} } }`
- 프런트: 토글 컴포넌트 `components/verified-only-toggle.tsx`
- 랜딩 페이지 Hero에도 "Verified Media Only로 시작하기" 별도 CTA

**측정 지표**
- 토글 활성화율 (목표 35%+)
- Verified Only 세션의 제안서 전환율 (vs 일반)

---

#### D2. 풀서비스 vs 셀프서비스 선택제 (3-Tier) `P0` `신규` (Phase 1)

**User Story**
> 광고주로서, 견적 요청 시 **"Self (무료, 즉시) / Assisted (무료, 2시간 전문가 검수) / Full-Service (유료, 매체본부 전담)"** 중에서 자신에게 맞는 서비스 레벨을 선택하고 싶다.

**Acceptance Criteria**

3-Tier 정의 (P0):
- [ ] **Self** (기본, 무료)
  - 자동 제안서 PDF 즉시 다운로드
  - 챗봇 Q&A 무제한
  - 계약·결제 온라인 완결
- [ ] **Assisted** (무료, 조건부)
  - Self의 모든 것 +
  - 매체본부 전문가 2시간 내 검수 + 1회 수정 제안
  - 가용성 최종 확인 서포트
  - 조건: 예산 1,000만원 이상
- [ ] **Full-Service** (유료, 예산 × 3% 또는 300만원 최소)
  - 전담 PM 배정
  - 크리에이티브 기획 지원
  - 매체 구매 협상 대행
  - 집행 관리·사후 리포트

전환 플로우 AC (P0):
- [ ] 플래너·견적 단계에서 "서비스 레벨 선택" 카드 (3개 비교 테이블)
- [ ] 언제든 업그레이드 가능 (Self → Assisted → Full)
- [ ] 다운그레이드는 안내 후 확인

트래킹 AC (P1):
- [ ] `OohQuote.serviceTier` enum (self/assisted/full) 추가
- [ ] Admin 대시보드에 티어별 통계

**UI/UX**
```
[서비스 레벨 선택 카드]
┌─────────────┬─────────────┬─────────────┐
│   Self      │  Assisted   │ Full-Service│
│   무료      │   무료*     │  3% 수수료  │
├─────────────┼─────────────┼─────────────┤
│ ✓ 자동제안서│ + 2시간 검수│ + 전담 PM  │
│ ✓ 챗봇무제한│ + 1회 수정  │ + 기획 지원│
│ ✓ 온라인계약│ + 가용 확인 │ + 구매대행 │
│             │ *예산 1천만+ │ + 사후리포트│
│             │             │             │
│ [ 선택 ]    │ [🌟 선택 ]  │ [ 선택 ]   │
└─────────────┴─────────────┴─────────────┘
```

**기술 구현**
- Prisma `OohQuote.serviceTier` enum · `assignedConsultantId String?`
- 견적 제출 시 티어 저장 + 어시스트는 매체본부 Slack 알림
- Full 선택 시 `CrmAccount` 자동 생성 + 전담 PM 배정 라운드 로빈

**측정 지표**
- 티어 선택 분포 (Self/Assisted/Full 비율)
- **Self → Assisted → Full 전환율** (풀서비스 전환 퍼널 핵심)
- Full 평균 견적 금액

---

#### D3. 캠페인 성과 보고서 자동화 `P1` `기존 확장` (Phase 2~3)

**User Story**
> 광고주로서, 캠페인 종료 후 **7일 이내에 완성된 성과 보고서 PDF**를 자동으로 받고 싶다. 집행 사진·유동인구 추정 노출·업종 평균 CPM 비교·AI 인사이트가 다 포함되어야 한다.

**Acceptance Criteria**

자동화 AC (P1):
- [ ] `Campaign.status = completed` 전환 시 **7일 후 자동 생성 트리거** (cron)
- [ ] 집행 증빙 사진 자동 수집 (`CampaignProofPhoto`) + 시점별·매체별 분류
- [ ] 유동인구 기반 추정 노출수 산출 (F2.1 데이터 활용)
- [ ] 업종 평균 CPM 비교 그래프 (동종 업계 벤치마크)
- [ ] **AI 요약 섹션**: 핵심 인사이트 3개 + 다음 캠페인 제언

브랜딩 AC (P1):
- [ ] 광고주 로고·브랜드 컬러 맞춤 커버 페이지
- [ ] 대행사 경유 캠페인은 대행사 브랜딩 우선 적용

공유 AC (P1):
- [ ] 이메일 자동 발송 (광고주 + 대행사 + 매체사)
- [ ] `/my/campaigns/[id]/report` 웹뷰 (토큰 공유 가능)
- [ ] PDF 다운로드 + PPT 변환 옵션 (`pptxgenjs`)

성공사례 연동 AC (P1):
- [ ] 보고서 생성 시 `SuccessCase` 초안 자동 생성 (`status: draft`)
- [ ] Admin 검수 후 `/cases/[slug]` 공개

**기술 구현**
- 기존 `lib/build-campaign-completion-pdf.ts` 확장
- `/api/cron/generate-completion-reports` 주 1회 cron
- AI 섹션: Claude 4.7 + 캠페인 데이터 프롬프트 (prompt caching 적용)
- 업종 벤치마크: `IndustryBenchmark` 테이블 (업종별 평균 CPM·리치 공개 데이터 + 자체 집계)
- Prisma `SuccessCase.metricsJson` 표준 스키마 강제 (zod 검증)
- 이메일 발송: Resend HTML 템플릿 재활용

**의존성**
- F2.1 (유동인구)
- F2.4 (증빙 사진)

**측정 지표**
- 캠페인 완료 → 보고서 수령 리드 타임 (목표 7일 이내 90%+)
- 보고서 이메일 open rate
- 재계약 전환율 (보고서 수령 후 90일 내)

---

## 3. 사용자 플로우 & 화면 설계

### 3.1 주요 사용자 플로우 5종

#### Flow A — 셀프서비스 광고주 (첫 집행, Self Tier)

```
랜딩(/) → "매체 둘러보기" CTA
      → /media (지도 뷰, Verified Only ON)
      → 관심 매체 3~5개 "제안서에 담기"
      → /quote/new (캠페인 정보 입력)
      → Self 티어 선택 → "PDF 생성"
      → 30초 내 PDF 다운로드 + 웹뷰 링크
      → [의사결정 1~3일]
      → e-서명 → 결제 (카드/계좌이체)
      → /my/campaigns 진행 확인
      → 캠페인 종료 → 7일 후 자동 성과 보고서 수령
```

**예상 리드 타임**: 탐색 30분 → 결제 3~7일 → 집행 평균 30일 → 보고서 7일

**이탈 방지 포인트**
- 플래너 4단계(예산 입력) 이탈 시 챗봇 트리거 ("예산 감이 안 오세요?")
- PDF 다운로드 후 72h 미결제 시 이메일 리마인드 + "전문가 상담" 제안

---

#### Flow B — 어시스트 전환 (Self → Assisted)

```
/quote/new → Self로 PDF 생성 (예산 2,000만원 확인됨)
          → 하단 배너: "2,000만원 이상이시네요. 전문가 검수 무료!"
          → "검수 추가" 체크 → Assisted 업그레이드
          → 매체본부 Slack 자동 알림 + 담당자 배정
          → 2시간 내 "수정 제안 3건" 매체본부 회신
          → 광고주 수락 → 재생성 PDF
          → 전환: Self → Assisted
```

**핵심 전환율**: Self 요청 중 예산 조건 충족(1,000만원+) 대비 Assisted 전환 (목표 30%+)

---

#### Flow C — 대행사 AE 반복 사용 (Partner)

```
로그인 → /partner 대시보드 (자사 브랜딩)
       → /compare 매체 3개 비교 → 화이트라벨 PDF
       → 클라이언트에 전달 → 수주
       → OohQuote payment_confirmed
       → AgencyCommission 자동 생성
       → /partner/commissions 월별 정산 대시보드
       → 월말 자동 정산
```

**예상 반복 주기**: 월 5~10건 (AE당)

---

#### Flow D — 매체사 온보딩 (Owner)

```
/owner 회원가입 → 사업자등록증 업로드
  → Admin 심사 (영업일 기준 1~2일)
  → 승인 이메일 → CEO 계정 활성
  → CSV 템플릿 다운로드 → 240면 입력 → 업로드
  → 자동 지오코딩 → 오류 5건 수정
  → "THINKAD 실사 요청" → 실사팀 방문 일정 확정
  → 4단계 검증 완료 → 배지 부여 → 판매 개시
  → 수주 알림 (F2.2) → 현장 사진 PWA 업로드 (F3.3)
  → 월말 자동 정산 PDF
```

**예상 온보딩 리드 타임**: 3~4주 (가입 ~ 판매 개시)

---

#### Flow E — AI 챗봇 진입 (하이브리드 컨설팅)

```
임의 페이지 → 플로팅 챗 클릭
  → "3,000만원으로 강남 2030 여성 매체 추천해줘"
  → Claude tool use: search_media(강남, verified, 2030)
  → 매체 카드 3개 인라인 + "플래너로 가져가기"
  → /planner?preset=chatbot_20260420_xyz 딥링크
  → Flow A로 전환

[복잡 질문 시]
  → "강남 타겟 + 부산 확장, 멀티시티 예산 분배 팁"
  → Claude: "이건 매체본부 전문가 상담이 더 적절합니다"
  → "전문가 연결" 버튼 → CrmAccount 생성
  → 업무 시간 10분 내 매체본부 답장
```

---

### 3.2 주요 화면 설계 (8개)

> 각 화면: **목적 · 레이아웃 · 주요 인터랙션 · 반응형 · 핵심 컴포넌트 · 의존 API**

---

#### 화면 1. 홈 (/ 랜딩) — `P0` 기존 강화

**목적**: 신뢰 전달 + 핵심 기능 진입 유도 (현재는 이미 우수, 기능 퍼널만 추가)

**레이아웃 (PC 1440px)**
```
┌─────────────────────────────────────────────────────────┐
│ [GNB: 매체·플래너·견적·비교·인사이트·사례·아카데미]    🔔🌐│
├─────────────────────────────────────────────────────────┤
│                                                          │
│   Hero                                                   │
│   "한국에서 가장 신뢰받는 OOH, 가장 편리한 플랫폼"      │
│   [ 🗺️ 매체 찾기 ]  [ 🤖 AI 플래너로 시작 ]              │
│   ✓ Verified Only 토글                                   │
│                                                          │
│   [배경: 서울 스카이라인 + OOH 매체 오버레이 애니메이션]│
├─────────────────────────────────────────────────────────┤
│   📍 4단계 현장 검증 프로세스 (기존 섹션)                │
│   [입지] [가시성] [조도] [경쟁매체]                     │
├─────────────────────────────────────────────────────────┤
│   📊 TOP3 매체 (실시간 인기)                             │
│   [매체 카드 3개 — 검증 배지·가격·가용률]              │
│   [ 전체 매체 보기 → ]                                   │
├─────────────────────────────────────────────────────────┤
│   🏆 실제 캠페인 성과 (기존)                             │
│   [300%, 200%, 파트너 100+ 카운터]                      │
├─────────────────────────────────────────────────────────┤
│   💬 고객 증언 (기존)                                    │
├─────────────────────────────────────────────────────────┤
│   🆕 신규 등록 매체 / 최근 완판 매체                    │
├─────────────────────────────────────────────────────────┤
│   [Footer]                                               │
└─────────────────────────────────────────────────────────┘
```

**주요 인터랙션**
- Hero CTA 2개 (지도·플래너) → A/B 테스트로 우세 파악
- Verified Only 토글 → `/media?verifiedOnly=true`로 딥링크
- TOP3 매체는 서버 측 실시간 계산 (주간 조회·담기 수 기반)
- 스크롤 시 GNB 고정 + 축소 (64px → 56px)

**반응형**
- 모바일: Hero CTA 2개 세로 스택 (폭 100%)
- 태블릿: TOP3 2열, 모바일 1열
- 모든 섹션 세로 패딩 64/48/32 (PC/태블릿/모바일)

**핵심 컴포넌트**
- `components/home-hero.tsx` (기존 강화)
- `components/top-media-showcase.tsx` 신규
- `components/verified-only-toggle.tsx` 신규

**의존 API**
- `GET /api/public/media-catalog?top=3&sort=trending`
- `GET /api/public/media-catalog?newSince=7d`

---

#### 화면 2. 지도 기반 매체 검색 (/media) — `P0` F1.1

**목적**: 지리적 탐색 + 필터링으로 후보 매체 30초 내 추리기

**레이아웃 (PC 1440px)**
```
┌─────────────────────────────────────────────────────────┐
│ [GNB]                                            [My][장바구니 3]│
├─────────────────────────────────────────────────────────┤
│ [ 🗺️ 지도 ] [ 📋 리스트 ] | 카테고리▼ 가격▼ ✓Verified  │
│                          | 📍 내 위치  🔍 주소 검색     │
├──────────────────────────┬──────────────────────────────┤
│ 매체 리스트 (35%)         │ Kakao Map (65%)              │
│                          │                               │
│ 결과: 342개 매체           │   ● 클러스터 핀 표시         │
│                          │                               │
│ ┌─[썸네일 16:9]──────┐   │   [+] [-]  [📍 현재위치]      │
│ │[NEW!] [🛡️4/4 GOLD] │   │                              │
│ │ 강남역 DOOH         │   │   [← 바텀시트 (모바일)]      │
│ │ ₩48M ~ ₩52M / 월   │   │                              │
│ │ 가용: ◐ (2026-06~) │   │                              │
│ │ [♡] [➕ 제안서에]  │   │                              │
│ └────────────────────┘   │                              │
│ ...                       │                              │
│ [무한 스크롤 trigger]     │                              │
└──────────────────────────┴──────────────────────────────┘
```

**주요 인터랙션**
- 지도 드래그·줌 → URL 자동 업데이트 + 500ms debounce 후 매체 재쿼리
- 핀 hover → 미니 카드 fade in (100ms)
- 핀 클릭 → 좌측 리스트 해당 카드 스크롤 + 하이라이트
- 리스트 카드 hover → 해당 핀 점프 애니메이션
- "제안서에 담기" → 장바구니 +1 (우상단 뱃지 +bounce)
- "♡" 즐겨찾기 → 낙관 업데이트 + 서버 동기화

**반응형**
- **모바일** (< 768px): 상단 70% 지도 · 하단 30% 바텀시트 (드래그로 50% ↔ 80%)
- **태블릿** (768~1023px): 좌 40% 리스트 / 우 60% 지도
- **PC** (1024px+): 35/65 분할
- 모바일 필터는 상단 칩 스크롤 가로바

**핵심 컴포넌트**
- `components/media-map-view.tsx` (Kakao SDK, `ssr:false`)
- `components/media-list-card.tsx`
- `components/filter-bar.tsx` (카테고리·가격 슬라이더·Verified 토글)
- `components/bottom-sheet.tsx` (모바일)
- `components/cart-badge.tsx`

**의존 API**
- `GET /api/public/media-catalog?bbox=&category=&priceMax=&verifiedOnly=`
- `GET /api/public/media/:id/nearby?radius=500`
- `POST /api/my/favorites` (로그인)

---

#### 화면 3. 매체 상세 (/media/[id]) — `P0` F1.1·F2.1·F2.3·F2.4

**목적**: 개별 매체에 대한 모든 정보 한 화면 (검증·유동인구·VR·유사 매체)

**레이아웃**
```
┌─────────────────────────────────────────────────────────┐
│ [Breadcrumb: 매체 > 서울 > 강남구 > 강남역 DOOH]        │
├─────────────────────────────────────────────────────────┤
│ ┌──────────────┬─────────────────────┐                  │
│ │ [히어로 이미지│ 강남역 DOOH                            │
│ │  갤러리·VR버튼│ 주소 · 서울 강남구 역삼동             │
│ │  오버레이]    │                                        │
│ │               │ 🛡️ 4/4 GOLD [상세 리포트]             │
│ │               │ 💰 ₩48M ~ ₩52M / 월                   │
│ │               │ 🎯 디지털 · 64㎡ · 1920×1080           │
│ │               │ ⏰ 24시간 운영 · 15초 × 120롤           │
│ │               │                                        │
│ │               │ [♡즐겨찾기] [➕제안서에] [📊비교]      │
│ └──────────────┴─────────────────────┘                  │
├─────────────────────────────────────────────────────────┤
│ [ 개요 ] [ 유동인구 ] [ VR 투어 ] [ 가격이력 ] [ 유사매체]│
├─────────────────────────────────────────────────────────┤
│   [탭 컨텐츠 — 기본: 개요]                               │
│                                                          │
│   ● 입지 5/5  "강남역 2번 출구 38m, 시간당 3,200명"    │
│   ● 가시성 5/5 "3차선 직선 시야, 정지선 2개"           │
│   ● 조도 5/5  "6,500nit HDR, 24시간"                   │
│   ● 경쟁 3/5  "반경 100m 내 동종 4개"                  │
│                                                          │
│   [위치 Kakao Map 정적 이미지]                          │
│                                                          │
│   📊 집행 실적 (THINKAD 자체)                            │
│   "최근 캠페인 12건 · 평균 주목률 18%"                  │
├─────────────────────────────────────────────────────────┤
│   🔍 유사 매체 추천                                      │
│   [카드 4개 가로 슬라이더]                               │
└─────────────────────────────────────────────────────────┘
```

**주요 인터랙션**
- 히어로 이미지 좌하단 "🥽 VR 투어" 버튼 → 탭 자동 이동 + 360° 뷰어 오픈
- "상세 리포트" → 배지 다이얼로그 (F2.4)
- 가격이력 탭 → 차트 (지난 12개월 가격 스냅샷)
- 유동인구 탭 반경 선택 → 실시간 재쿼리
- 스크롤 60% 도달 시 하단 sticky CTA "제안서에 담기"

**반응형**
- 모바일: 히어로 이미지 100% → 정보 카드 스택
- 탭은 가로 스크롤 (모바일), 세그먼트 컨트롤 (PC)

**핵심 컴포넌트**
- `components/media-hero-gallery.tsx` (키보드·스와이프)
- `components/verification-badge-card.tsx`
- `components/footfall-chart.tsx` (F2.1)
- `components/vr-tour-viewer.tsx` (Marzipano, F2.3)
- `components/price-history-chart.tsx`
- `components/similar-media-slider.tsx`

**의존 API**
- `GET /api/public/medias/:id` (include: verificationBadges, priceHistory)
- `GET /api/public/footfall?lat=&lng=&radiusM=`
- `GET /api/public/medias/:id/vr-tour`
- `GET /api/public/medias/:id/similar?limit=4`

---

#### 화면 4. 매체플래너 위자드 (/planner) — `P0` F1.3

**목적**: 7단계 위자드로 AI 추천 → 매체 조합 3안 도출

**레이아웃 (Step 화면 공통 골격)**
```
┌─────────────────────────────────────────────────────────┐
│ [GNB]                                                    │
├─────────────────────────────────────────────────────────┤
│ ●─●─●─●─○─○─○   Step 4 / 7                              │
│ ┌─────────────────────────────────────────────────┐     │
│ │  💰 예산과 기간을 알려주세요                     │     │
│ │                                                   │     │
│ │  예산 [────●────] ₩50,000,000                   │     │
│ │       1천만 ~ 5억 사이                            │     │
│ │                                                   │     │
│ │  기간 [2026-06-01] ~ [2026-06-30]                │     │
│ │  💡 평균 30일 캠페인 권장                         │     │
│ │                                                   │     │
│ │  ☐ 분할 집행 (2~3개월 분산)                      │     │
│ │                                                   │     │
│ └─────────────────────────────────────────────────┘     │
│                              [← 이전]  [다음 →]          │
└─────────────────────────────────────────────────────────┘
```

**결과 화면 (Step 7)**
```
┌─────────────────────────────────────────────────────────┐
│  💡 AI가 3가지 조합을 제안합니다                         │
├─────────────────────────────────────────────────────────┤
│  [ Conservative ] [ 🌟 Balanced ] [ Aggressive ]        │
├─────────────────────────────────────────────────────────┤
│  🌟 Balanced — ₩48M / 예상 리치 2.1M / CPM ₩22         │
│                                                          │
│  💬 "2030 여성 타겟 강남·홍대 조합. DOOH 60%, 버스쉘터  │
│      40%로 인지도와 전환을 동시에 잡습니다."             │
│                                                          │
│  📊 매체별 기여도          📍 분포 미니맵                │
│  [도넛 차트]              [Kakao 미니맵]                │
│                                                          │
│  📋 매체 리스트 (8)                                      │
│  • 강남역 DOOH    ₩12M  🛡️4/4  ℹ️"2030녀 비율 62%"    │
│  • 홍대 빌보드    ₩8M   🛡️4/4  ℹ️"평일 야간 가시성"   │
│  ...                                                     │
│                                                          │
│  [📋 제안서로 받기]  [🙋 전문가 상담]  [💾 플랜 저장]   │
└─────────────────────────────────────────────────────────┘
```

**주요 인터랙션**
- 단계 네비 (●○) 클릭으로 완료된 이전 단계로 이동 가능
- 단계 이동 애니메이션 (slide left/right 200ms)
- localStorage 자동 저장 (탭 닫아도 다음 방문 시 이어가기)
- 3안 탭 전환 → 차트·리스트 200ms 페이드 리렌더
- 매체 행 ℹ️ → 추천 근거 툴팁 (유동인구·타겟 적합도)
- "💾 플랜 저장" → (비로그인) 로그인 모달, (로그인) `PlannerPlan` 생성

**반응형**
- 모바일: 단계 네비는 상단 진행바만 (●○ 숨김)
- 결과 3안은 세로 스택 (모바일), 가로 탭 (태블릿+)

**핵심 컴포넌트**
- `components/planner-stepper.tsx`
- `components/planner-step-{1..7}.tsx`
- `components/planner-result-card.tsx`
- `components/contribution-pie-chart.tsx`
- `components/recommendation-rationale-tooltip.tsx`

**의존 API**
- `POST /api/planner/recommend` (body: full plan → 3안)
- `POST /api/my/plans` (저장)
- `GET /api/public/footfall` (Tooltip 근거)

---

#### 화면 5. 자동 제안서 생성 (/quote/new) — `P0` F1.2 + D2

**목적**: 장바구니 매체 + 캠페인 정보 → 1클릭 PDF/PPT 생성

**레이아웃**
```
┌─────────────────────────────────────────────────────────┐
│ [GNB]                                                    │
├─────────────────────────────────────────────────────────┤
│  📋 견적 요청서                                          │
│  3개 매체 선택됨 · 총 ₩66M · 예상 리치 5.2M             │
├─────────────────────────────────────────────────────────┤
│  📌 캠페인 정보                                          │
│  캠페인명     [_____________________________]            │
│  광고주명     [_____________________________]            │
│  희망 기간    [2026-06-01] ~ [2026-06-30]               │
│  연락처       [email]   [phone]                          │
├─────────────────────────────────────────────────────────┤
│  🎯 서비스 레벨 선택 (D2)                                │
│  [ Self ] [ 🌟 Assisted ] [ Full-Service ]              │
│  [3-Tier 비교 카드 (D2 참조)]                            │
├─────────────────────────────────────────────────────────┤
│  📦 선택한 매체 (편집 가능)                              │
│  ┌──────────────────────────────────────┐               │
│  │ 🖼️ 강남역 DOOH    ₩48M  🛡️4/4  [X]  │               │
│  │ 🖼️ 홍대 빌보드    ₩12M  🛡️3/4  [X]  │               │
│  │ 🖼️ 잠실 버스쉘터   ₩6M  🛡️4/4  [X]  │               │
│  └──────────────────────────────────────┘               │
│  [ 매체 추가하기 → /media ]                              │
├─────────────────────────────────────────────────────────┤
│  📎 크리에이티브 (옵션)                                  │
│  [📤 이미지/영상 드래그 & 드롭]                          │
│  💡 업로드 시 매체별 시뮬레이션 미리보기 자동 생성       │
├─────────────────────────────────────────────────────────┤
│  ⚙️ 추가 옵션                                            │
│  ☐ PDF에 유동인구 차트 자동 삽입                        │
│  ☐ 광고주 로고 추가 (업로드)                             │
│  ☐ 영문 제안서로 받기                                    │
├─────────────────────────────────────────────────────────┤
│  [📄 PDF 생성] [📊 PPT 생성] [📩 이메일로 받기]         │
│  생성 후 7일간 다운로드 가능                              │
└─────────────────────────────────────────────────────────┘
```

**진행 모달 (PDF 생성 클릭 시)**
```
┌─────────────────────────────────┐
│  📄 제안서 생성 중...            │
│  ●●●●○○○○ 50%                   │
│                                  │
│  ✓ 매체 데이터 수집 완료         │
│  ✓ 유동인구 차트 렌더링          │
│  ⏳ PDF 합성 중...                │
│  ○ 검증 배지 삽입                │
│                                  │
│  예상 시간 12초                   │
└─────────────────────────────────┘
```

**주요 인터랙션**
- 매체 행 [X] → optimistic remove + undo 토스트
- "매체 추가하기" → `/media` 새 탭
- 크리에이티브 업로드 → 즉시 매체 사진과 합성 미리보기 (Cloudinary transformation)
- "PDF 생성" → 진행 모달 → 완료 시 자동 다운로드 + "이메일도 받기" 후속 옵션
- Assisted 선택 시 → "2시간 내 매체본부 회신" 안내 + 폼 추가 (시급한 사유)

**반응형**
- 모바일: 모든 폼 100% 폭, 3-Tier 카드 세로 스택

**핵심 컴포넌트**
- `components/quote-cart-summary.tsx`
- `components/service-tier-selector.tsx`
- `components/creative-upload-dropzone.tsx`
- `components/quote-progress-modal.tsx`

**의존 API**
- `POST /api/quotes` → quoteId 반환
- `POST /api/quotes/:id/pdf` (생성 트리거)
- `POST /api/quotes/:id/pptx`
- `GET /api/quotes/:id/pdf` (다운로드)

---

#### 화면 6. My THINKAD 대시보드 (/my) — `P0` F1.4

**목적**: 로그인 사용자의 모든 활동 한눈에 + 추천 액션

**레이아웃 (PC)**
```
┌─────────────────────────────────────────────────────────┐
│ [GNB]                                          🔔3 박준호▼│
├─────────────────────────────────────────────────────────┤
│ [좌 200px]   │ 안녕하세요, 박준호님 👋                   │
│              │ 마지막 로그인: 2시간 전                   │
│ 🏠 대시보드  │                                            │
│ 📋 플래너 5  │ ┌──────────┬──────────┬──────────┐        │
│ 📄 견적 3    │ │ 진행 캠페인│ 저장 플랜 │ 미확인    │        │
│ 🚀 캠페인 2  │ │    2건   │    5개   │ 알림 3개 │        │
│ ⭐ 즐겨찾 18 │ └──────────┴──────────┴──────────┘        │
│ 🔔 알림 3    │                                            │
│ 💳 결제      │ 🎯 추천 액션                              │
│ ─────        │ ┌────────────────────────────────────┐    │
│ ⚙️ 설정      │ │ 💾 저장된 "여름 캠페인" 플랜       │    │
│ 🚪 로그아웃  │ │   → 제안서 요청해보세요    [요청 →]│    │
│              │ ├────────────────────────────────────┤    │
│              │ │ 🔔 강남 DOOH 가격 -8% 변동         │    │
│              │ │   → 즐겨찾기 매체 확인       [→]  │    │
│              │ ├────────────────────────────────────┤    │
│              │ │ 📊 진행 캠페인 "런칭" 67% 진행    │    │
│              │ │   → 증빙 사진 12장 업로드      [→]│    │
│              │ └────────────────────────────────────┘    │
│              │                                            │
│              │ 📈 이번 달 활동                           │
│              │ [차트: 견적 3, 제안서 다운 8, 상담 1건]   │
└──────────────┴────────────────────────────────────────┘
```

**탭별 화면 구성**

- **/my/plans** — 저장된 플래너 그리드 카드 (썸네일 = 매체 분포 미니맵)
- **/my/quotes** — 견적 이력 테이블 (상태 배지 · 다운로드 · 재요청)
- **/my/campaigns** — 진행 캠페인 카드 (진행도 바 + 다음 액션)
- **/my/favorites** — 즐겨찾기 매체 그리드 (가격 변동 알림 표시)
- **/my/notifications** — 알림 센터 (F2.2)
- **/my/settings** — 프로필 · 알림 설정 · 비밀번호 · 계정 삭제 · 데이터 내보내기

**주요 인터랙션**
- 좌측 네비 카운트는 실시간 업데이트 (SSE Phase 3)
- 추천 액션 카드는 dismiss 가능 (스누즈 7일)
- 캠페인 진행도 클릭 → 상세 진행 화면

**반응형**
- 모바일: 좌 네비 → 상단 햄버거 드로어
- 카드 그리드 1열로 스택

**핵심 컴포넌트**
- `components/my-side-nav.tsx`
- `components/dashboard-summary-cards.tsx`
- `components/recommended-actions-list.tsx`
- `components/monthly-activity-chart.tsx`

**의존 API**
- `GET /api/my/dashboard` (집계 데이터)
- `GET /api/my/plans` `GET /api/my/quotes` `GET /api/my/campaigns`
- `GET /api/notifications?limit=5`

---

#### 화면 7. 캠페인 진행 현황 (/my/campaigns/[id]) — `P1` Phase 1~2

**목적**: 계약 후 집행 ~ 보고서까지 전 과정 가시성

**레이아웃**
```
┌─────────────────────────────────────────────────────────┐
│ ← 캠페인 목록                                            │
├─────────────────────────────────────────────────────────┤
│ 🚀 강남스타일 뷰티 — 2026 여름 런칭                     │
│ 2026-06-01 ~ 2026-06-30 · 3개 매체 · ₩66M               │
├─────────────────────────────────────────────────────────┤
│ 📊 진행 상태                                             │
│ ●─●─●─●─◐─○─○                                            │
│ 계약 결제 입고 검수 집행중 종료 보고서                   │
├─────────────────────────────────────────────────────────┤
│ 📌 다음 액션                                             │
│ "매체본부에서 6/3까지 크리에이티브 최종본 요청"          │
│ [📤 크리에이티브 업로드]                                 │
├─────────────────────────────────────────────────────────┤
│ 📍 매체별 집행 상태                                      │
│ ┌─────────────────────────────────────────────┐         │
│ │ 강남역 DOOH    ✅ 집행 중  📸 12장 ⏰ Day 5 │         │
│ │ [Proof Photo 갤러리 ━━━━━━━━]              │         │
│ │                                              │         │
│ │ 홍대 빌보드    ✅ 집행 중  📸 8장          │         │
│ │ ...                                          │         │
│ └─────────────────────────────────────────────┘         │
├─────────────────────────────────────────────────────────┤
│ 📈 실시간 메트릭 (추정)                                  │
│ 노출수 1.8M / 5.2M (35%) · 진행률 17%                    │
│ [실시간 차트]                                            │
├─────────────────────────────────────────────────────────┤
│ 💬 매체본부 메시지 (3)                                   │
│ [메시지 스레드]                                          │
└─────────────────────────────────────────────────────────┘
```

**주요 인터랙션**
- 진행 상태 단계 클릭 → 해당 단계 상세 (계약서·결제 영수증 등 다운로드)
- Proof Photo 갤러리 → Lightbox + EXIF (촬영 일시·위치) 표시
- 메시지 스레드는 매체본부 ↔ 광고주 양방향 (F3.2 챗봇과 별개)
- 종료 7일 후 → "📄 보고서 다운로드" 버튼 자동 노출 (D3)

**반응형**
- 모바일: 진행 상태는 가로 스크롤 카드
- 매체별 갤러리는 가로 스와이프

**핵심 컴포넌트**
- `components/campaign-pipeline-stepper.tsx`
- `components/proof-photo-gallery.tsx`
- `components/campaign-metrics-chart.tsx`
- `components/agency-message-thread.tsx`

**의존 API**
- `GET /api/my/campaigns/:id`
- `GET /api/my/campaigns/:id/proof-photos`
- `GET /api/my/campaigns/:id/messages`
- `POST /api/my/campaigns/:id/creatives`

---

#### 화면 8. VR 투어 뷰어 (매체 상세 내 탭) — `P1` F2.3

**목적**: 360° 몰입형 현장 확인 → 신뢰 강화 → 결제 전환

**레이아웃**
```
┌─────────────────────────────────────────────────────────┐
│ [← 매체 상세]                                            │
├─────────────────────────────────────────────────────────┤
│  🥽 강남역 DOOH — VR 투어                                │
│  촬영일: 2026-03-15 · 촬영자: THINKAD 실사팀             │
├─────────────────────────────────────────────────────────┤
│ ┌─────────────────────────────────────────────────┐     │
│ │                                                  │     │
│ │   [360° Marzipano 뷰어 (전체 화면 가능)]        │     │
│ │                                                  │     │
│ │       ● 강남역 2번 출구 (38m)                   │     │
│ │                                                  │     │
│ │                  ● 스타벅스 R점 (62m)            │     │
│ │                                                  │     │
│ │       ● [매체 위치 핫스팟]                       │     │
│ │                                                  │     │
│ │  [↻ 360°] [🔍+] [🔍-]  자이로 [ON|OFF]          │     │
│ │  [⛶ 전체화면]  💧 워터마크: THINKAD            │     │
│ └─────────────────────────────────────────────────┘     │
├─────────────────────────────────────────────────────────┤
│  📍 핫스팟 가이드                                        │
│  • 매체 위치 (시야 정면)                                 │
│  • 강남역 2번 출구 (보행 동선)                           │
│  • 스타벅스 R점 (앵커 시설)                              │
│  • 경쟁 매체 4개 (반경 100m)                             │
└─────────────────────────────────────────────────────────┘
```

**주요 인터랙션**
- 마우스 드래그·휠 줌·자이로 (모바일)
- 핫스팟 클릭 → 카드 팝업 (시설명·거리·매체 정보)
- 전체화면 모드 (F11 + 모바일 fullscreen API)
- 우클릭 컨텍스트 메뉴 차단 (저작권 보호)
- 워터마크 자동 합성 (Cloudinary `l_text:THINKAD,o_40`)

**반응형**
- 모바일: 자이로 자동 활성, 전체화면 권장 토스트
- iPad: 양손 핀치 줌

**핵심 컴포넌트**
- `components/vr-tour-viewer.tsx` (Marzipano)
- `components/hotspot-popover.tsx`
- `components/vr-controls.tsx`

**의존 API**
- `GET /api/public/medias/:id/vr-tour` (imageUrl, hotspotsJson)

---

### 3.3 글로벌 디자인 토큰 (tailwind.config.ts 실값 기준)

| 용도 | Tailwind 변수 | HEX |
|---|---|---|
| Primary Navy | `bg-primary` | `#0D1B2E` |
| Primary Light | `bg-primary-light` | `#1E3A5F` |
| Primary Dark | `bg-primary-dark` | `#0A1420` |
| Accent Gold | `bg-accent` | `#C8913C` |
| Silver | `bg-silver` | `#B0B8C4` |
| Background | `bg-background` | `#D6D9E6` |
| CTA | `bg-cta` | `#9B3C31` |
| CTA Hover | `bg-cta-hover` | `#85342A` |

- **타이포**: Pretendard (KO), Inter (EN), Noto Sans KR (PDF)
- **Radius**: 8 (default) · 16 (card) · 24 (modal)
- **Shadow**: `0 1px 2px rgba(13,27,46,.06), 0 4px 12px rgba(13,27,46,.08)`
- **Spacing scale**: Tailwind 기본 (4의 배수)
- **Breakpoints**: sm 640 / md 768 / lg 1024 / xl 1280 / 2xl 1536

### 3.4 반응형 원칙

1. **모바일 퍼스트**: 모든 화면은 모바일에서 먼저 설계, PC에서 확장
2. **터치 타겟 44×44 최소** (iOS HIG 준수)
3. **지도/VR 같은 인터랙티브 요소**는 **항상 모바일 자이로/터치 우선 고려**
4. **PDF/리포트 출력**은 PC 우선, 모바일은 "이메일로 받기" 권장 안내
5. **데이터 그리드**는 모바일에서 카드 스택으로 자동 변환

---








