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

> **"검증된 OOH만. 30분이면 됩니다."**
>
> _Verified OOH. Delivered in minutes._
>
> THINKAD는 OOH 광고의 **신뢰 레이어(Trust Layer)**다. 모든 매체는 현장 검증되고, 모든 견적은 데이터로 뒷받침되며, 모든 캠페인은 결과로 증명된다.

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
> 광고주로서, 마음에 든 매체 3~5개를 장바구니에 담은 뒤 **단 1번의 클릭으로 자사 로고가 박힌 제안서 PDF를 1분 이내(45~60초)에 다운로드**받아 C-레벨에 당일 공유하고 싶다. 제안서 안에 **THINKAD 4단계 검증 배지**가 박혀 있어야 의사결정자가 한눈에 신뢰한다.

**Acceptance Criteria**

기능 AC (P0):
- [ ] 매체 카드·상세·비교 페이지에 "📋 제안서에 담기" 버튼
- [ ] 우상단 장바구니 배지 (담긴 매체 수)
- [ ] `/quote/new` 페이지: 담긴 매체 목록 · 캠페인 정보 폼 (브랜드명·기간·예산·연락처)
- [ ] **"PDF 생성" 1클릭** → **45~60초 내 다운로드** (서버에서 jsPDF + Noto Sans KR · p95 < 60초)
- [ ] PDF 구성 (필수 섹션):
  1. **커버**: THINKAD 로고 · 광고주 로고 · 캠페인명 · 발행일 · QR (웹뷰 URL)
  2. **요약**: 총 매체 수 · 총 예상 노출 · 총 견적 · 캠페인 기간
  3. **매체별 상세** (각 1페이지): 매체 사진 · 위치 지도(Kakao 정적 이미지) · 가격 · 가용 일자 · **🛡️ 4단계 배지** · 유동인구 차트 · CPM
  4. **검증 배지 부록**: 4단계 검증의 의미·기준
  5. **계약 안내**: e-서명 링크 · 결제 방법 · 담당자 연락처
- [ ] 공개 웹뷰 `/quote/[id]?t=<token>` (비로그인도 토큰으로 접근 가능)
- [ ] 견적 PDF 다운로드 카운트·만료일(7일) 추적

공개 웹뷰 보안 정책 AC (P0):
- [ ] **토큰 만료**: 발급 후 7일 TTL · 만료 시 "링크 만료됨 — 견적 재요청" 안내 페이지
- [ ] **토큰 재발급**: 광고주가 `/my/quotes/[id]`에서 1클릭 재발급 (기존 토큰 즉시 무효화)
- [ ] **IP 지역 제한** (옵션, 기본 OFF): 광고주가 설정 시 한국(KR) IP만 허용, 해외 IP는 차단 페이지
- [ ] **IP 기반 rate limit**: `/quote/[id]?t=*` 엔드포인트 IP당 분당 30회 (Upstash Redis)
- [ ] **다운로드 수 상한**: 동일 토큰 PDF 재다운로드 최대 50회 (초과 시 만료)
- [ ] **접근 감사 로그**: `QuoteViewAudit` 테이블 — 토큰·IP·UA·timestamp 저장 (PIPA 대응 + 보안 포렌식)
- [ ] **Referer 기반 hotlink 방지**: PDF 파일 직접 링크는 Cloudinary signed URL (5분 TTL) 재발급 강제
- [ ] **robots.txt + noindex 메타**: `/quote/[id]` 경로 검색엔진 색인 차단
- [ ] **Turnstile 챌린지** (의심 트래픽): 동일 IP가 5분 내 10개+ 다른 토큰 조회 시 CAPTCHA 요구

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
- 평균 PDF 생성 시간 (목표 p95 < 60s, p50 < 45s)
- 검수 옵션 선택률 (어시스트 트랙 트래픽)
- 공개 웹뷰 토큰 평균 재발급 횟수 (보안 운영 지표)
- 토큰 만료·IP 제한 차단 비율 (정상 vs 의심 트래픽)

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

## 4. 기술 아키텍처 & 스택 추천

### 4.1 권장 스택 (프로젝트 실제 버전 기준)

| 영역 | 선택 | 버전/비고 | 선정 이유 |
|---|---|---|---|
| **프레임워크** | Next.js | **16.2.3** (App Router) | 이미 채택. AGENTS.md breaking change 체크 의무 |
| **언어** | TypeScript | 5.x strict | 이미 채택 |
| **스타일링** | Tailwind CSS | 3.x | 이미 채택. `tailwind.config.ts` 브랜드 토큰 유지 |
| **UI 컴포넌트** | shadcn/ui + Radix UI | 기존 패턴 재사용 | 접근성·커스터마이징 |
| **ORM** | Prisma | 7.6.0 | 이미 16개 모델 존재 |
| **DB** | PostgreSQL | 15+ (Supabase 또는 Neon 호스팅) | Prisma 성숙도 + JSON·공간 인덱스 |
| **캐시** | Upstash Redis | Serverless | rate-limit · 세션 · 중복 제거 |
| **파일 저장** | Cloudinary | 이미 채택 | 이미지 변환·equirectangular (VR)·동영상 |
| **인증** | next-auth v5 또는 자체 세션 | App Router 호환 | Kakao/Google OAuth + Credentials |
| **AI** | Anthropic SDK | **0.88.0** (Claude 4.7) | 이미 채택. prompt caching + tool use |
| **지도 (인터랙티브)** | Kakao Map JS SDK | `libraries=clusterer,services` | KR 필수. Naver Map 폴백 |
| **지도 (정적 이미지)** | **Kakao Static Map API** | `https://dapi.kakao.com/v2/maps/staticmap` | **PDF·OG 이미지·이메일 임베드 전용** (JS SDK 대신 서버사이드 렌더) |
| **지도 (글로벌)** | Google Maps Static/JS API | Phase 3~4 해외 접속 시 자동 전환 | 비KR IP에서 Kakao 대신 사용 |
| **i18n** | next-intl | 4.8.3 | 이미 채택. ko/en/zh/ja |
| **이메일** | Resend | HTML 템플릿 | 트랜잭션 · 트렌드 리포트 · 완성 보고서 |
| **푸시** | web-push (VAPID) | 브라우저 표준 | F2.2 알림 · F3.3 PWA |
| **PDF** | jsPDF + Noto Sans KR | 기존 `lib/build-quote-pdf.ts` | 한글 임베드 검증됨 |
| **PPT** | pptxgenjs | 편집 가능한 출력 | 대행사 요구 대응 |
| **VR** | Marzipano | 15KB, WebGL | 가벼움·호환성. 대안 react-three-fiber |
| **차트** | Recharts | 반응형·SSR 호환 | Area/Bar/Heatmap |
| **가상 스크롤** | @tanstack/virtual | 신규 | 매체 리스트 성능 |
| **폼 검증** | zod | 서버·클라이언트 공유 | API 입력 검증 + OpenAPI 자동화 |
| **테스트** | Playwright · Vitest | 기존 | E2E 핵심 플로우 커버 |
| **모니터링** | Sentry · Vercel Analytics | | 에러·퍼포먼스 |
| **이벤트 분석** | PostHog (self-hosted) 또는 Plausible | | KR 법령·개인정보 고려 |
| **배포** | Vercel (primary) | 향후 Railway/Fly.io 이중화 | Next.js 최적화 |
| **배경 작업** | Vercel Cron | `/api/cron/*` | 일·주 단위 동기화 |
| **결제 (Phase 1~3)** | Toss Payments (primary) | KR 카드·계좌이체·간편결제 | KR 내수 커버, 세금계산서 자동 |
| **결제 (Phase 4+)** | **Stripe (primary 전환)** + Toss (KR 잔여) | 해외 카드·PayPal·SEPA | 해외 광고주 비율 20%+ 도달 시 primary 이관 (아래 전환 로드맵 참조) |
| **전자서명** | 모두싸인 또는 이폼사인 | 국내 전자서명법 부합 | 계약 무결성 · Phase 4에 DocuSign 글로벌 병행 |

**사용자 요청 대비 변경 사유**
- 원 요청: "Next.js 15" → **16.2.3** (프로젝트 실제 버전, AGENTS.md 준수)
- 원 요청: "Supabase/Firebase/AWS" → **PostgreSQL + Prisma 유지** (Supabase 호스팅만 채택 검토, 코드는 현재 ORM 유지)
- 원 요청: "GPT/국내 LLM 고려" → **Claude 4.7 단일** (기존 코드 통합 + SDK 0.88 이미 채택)

**결제 PG 전환 로드맵 (Toss → Stripe primary)**

| 단계 | 기간 | Primary | 역할 분담 | 트리거 |
|---|---|---|---|---|
| P1~P2 | 2026-05 ~ 2026-10 | **Toss** | Toss 단일. GMV 99%+ KR | — |
| P3 | 2026-11 ~ 2027-04 | **Toss** | Toss + Stripe 병행 도입 (해외 광고주 옵션 제공) | 해외 광고주 세션 비율 10% 도달 |
| **P4** | **2027-05 ~** | **Stripe (primary)** | Stripe로 기본 체크아웃 전환, Toss는 KR 간편결제 잔여 루트 | 해외 광고주 세션 비율 **20%+** 또는 글로벌 GMV 30%+ |

**전환 시 기술 체크리스트**
- [ ] 추상화 레이어 `lib/payment-provider.ts` Phase 3에 선제 도입 (provider-agnostic 인터페이스)
- [ ] 멀티 currency 지원 (KRW 기본, USD/CNY/JPY 환산) — `Toss`는 KRW only
- [ ] Stripe Radar · 3DS 2.0 · SCA 대응
- [ ] 세금계산서: KR 결제는 Toss가 자동, Stripe KR 건은 자체 발행 시스템 필요 (F4 요구사항)
- [ ] Webhook 병행 운영 기간(P3~P4 초) 대응 — 중복 처리 방지 idempotency key

---

### 4.2 시스템 아키텍처 다이어그램

```
┌─────────────────────────────────────────────────────────────────┐
│                           Clients                                │
│  [PC Web]  [Mobile Web]  [PWA (Phase 3)]  [Partner Subdomain]   │
└────────────────────────────┬────────────────────────────────────┘
                             │ HTTPS
┌────────────────────────────▼────────────────────────────────────┐
│                    Vercel Edge Network (CDN)                     │
│                    + next/image 이미지 최적화                    │
└────────────────────────────┬────────────────────────────────────┘
                             │
┌────────────────────────────▼────────────────────────────────────┐
│              Next.js 16.2.3 (App Router) on Vercel               │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐             │
│  │  Public     │  │  Client     │  │  Admin      │             │
│  │  Routes     │  │  Routes     │  │  Routes     │             │
│  │  /media     │  │  /my/*      │  │  /admin/*   │             │
│  │  /planner   │  │  /quote     │  │             │             │
│  └─────────────┘  └─────────────┘  └─────────────┘             │
│                                                                   │
│  Middleware: i18n · 인증 · 서브도메인 · 레이트리밋              │
│                                                                   │
│  API Routes (/api/*):                                            │
│  • 인증 (/api/auth/*)                                            │
│  • 매체 (/api/public/media-catalog ← fetchPublicMediaCatalog)   │
│  • 견적 (/api/quotes/*)                                          │
│  • 플래너 (/api/planner/recommend)                               │
│  • 챗봇 (/api/chat — streaming)                                  │
│  • 알림 (/api/notifications/*)                                   │
│  • 크론 (/api/cron/*)                                            │
└────┬─────────────┬──────────────┬─────────────┬─────────────────┘
     │             │              │             │
     ▼             ▼              ▼             ▼
┌─────────┐  ┌──────────┐  ┌──────────┐  ┌──────────────────┐
│Postgres │  │Upstash   │  │Cloudinary│  │External APIs     │
│+ Prisma │  │Redis     │  │(이미지·VR)│  │• Anthropic Claude│
│(16+N    │  │(cache,   │  │          │  │• Kakao Map/Local │
│ models) │  │ rate-    │  │          │  │• 서울열린데이터  │
│         │  │ limit)   │  │          │  │• KT/SKT 유동인구 │
│         │  │          │  │          │  │• Resend (이메일) │
│         │  │          │  │          │  │• Toss/Stripe     │
│         │  │          │  │          │  │• 모두싸인 (서명) │
│         │  │          │  │          │  │• Slack Webhook   │
└─────────┘  └──────────┘  └──────────┘  └──────────────────┘

Monitoring: Sentry · Vercel Analytics · PostHog
Background: Vercel Cron (일·주 단위) + 지연 큐 (`NotificationQueue` 테이블)
```

**데이터 흐름 예시 (자동 제안서 생성 — F1.2)**

```
[1] 사용자가 /quote/new에서 "PDF 생성" 클릭
  └→ [2] POST /api/quotes → Prisma에 OohQuote 레코드 생성
    └→ [3] POST /api/quotes/:id/pdf 백그라운드 잡 enqueue
      └→ [4] Worker: fetchPublicMediaCatalog(mediaIds)로 매체 조회 (DB-backed)
        └→ [5] Worker: FootfallSnapshot 집계 + Recharts→PNG pre-render
          └→ [6] Worker: build-quote-pdf.ts로 Noto Sans KR PDF 합성 + 검증 배지 삽입
            └→ [7] PDF를 Cloudinary에 업로드 → URL 저장
              └→ [8] Web Push + 이메일 발송 (완료 알림)
                └→ [9] 클라이언트 폴링 or SSE로 다운로드 URL 수신
```

---

### 4.3 AI 추천 엔진 구현 (Claude 4.7)

**핵심 원칙**: 환각 완전 차단 — 모든 매체·가격·유동인구 수치는 **DB 쿼리 결과만** 사용. LLM은 조합·설명만 담당.

#### 4.3.1 아키텍처

```
[플래너 입력]
    │
    ▼
[시스템 프롬프트 + OOH 도메인 지식]
(cache_control: ephemeral, 5min TTL)
    │
    ▼
[Claude 4.7 Sonnet/Opus]
    │ ── tool_use ──▶  search_media    → Prisma 쿼리
    │ ── tool_use ──▶  estimate_reach  → 유동인구×기간 계산
    │ ── tool_use ──▶  get_footfall    → FootfallSnapshot
    │ ── tool_use ──▶  check_budget    → 가격 합계 검증
    │
    ▼
[3안(Conservative/Balanced/Aggressive) 생성]
    │
    ▼
[응답 검증 레이어]
 • 추천 매체 ID가 실제 DB에 존재하는가
 • 총 견적이 예산 ±10% 내인가
 • 각 매체의 가용 기간이 요청 기간과 겹치는가
    │
    ▼
[PlannerRecommendation 저장 + 사용자에게 응답]
```

#### 4.3.2 도구 스키마 (tool use)

```ts
const tools = [
  {
    name: 'search_media',
    description: '매체 카탈로그 검색 (DB-backed)',
    input_schema: {
      type: 'object',
      properties: {
        region: { type: 'string', description: '지역 (구/동 단위)' },
        categories: { type: 'array', items: { type: 'string' } },
        priceMin: { type: 'number' },
        priceMax: { type: 'number' },
        verifiedOnly: { type: 'boolean' },
        availableFrom: { type: 'string', format: 'date' },
        availableTo: { type: 'string', format: 'date' },
        limit: { type: 'number', default: 20 },
      },
      required: ['region', 'priceMax'],
    },
  },
  {
    name: 'estimate_reach',
    description: '매체 조합의 예상 리치·노출수 추정',
    input_schema: {
      type: 'object',
      properties: {
        mediaIds: { type: 'array', items: { type: 'string' } },
        durationDays: { type: 'number' },
        targetGender: { type: 'string', enum: ['M', 'F', 'ALL'] },
        targetAgeRange: { type: 'array', items: { type: 'string' } },
      },
    },
  },
  {
    name: 'get_footfall',
    description: '반경 유동인구 조회 (출처 포함)',
    input_schema: {
      type: 'object',
      properties: {
        lat: { type: 'number' },
        lng: { type: 'number' },
        radiusM: { type: 'number', default: 500 },
      },
    },
  },
  {
    name: 'check_budget',
    description: '매체 조합 총 견적 검증',
    input_schema: {
      type: 'object',
      properties: { mediaIds: { type: 'array' }, durationDays: { type: 'number' } },
    },
  },
];
```

#### 4.3.3 Prompt Caching 전략

```ts
messages: [
  {
    role: 'user',
    content: [
      {
        type: 'text',
        text: SYSTEM_PROMPT,  // OOH 도메인 지식 (3,000 토큰)
        cache_control: { type: 'ephemeral' },
      },
      {
        type: 'text',
        text: MEDIA_CATALOG_SUMMARY,  // 카테고리별 매체 수·평균가 요약 (1,500 토큰)
        cache_control: { type: 'ephemeral' },
      },
      { type: 'text', text: userInput },  // 플래너 입력 (캐시 X)
    ],
  },
];
```

**기대 효과**
- 캐시 히트 시 비용 **90% 절감** (Sonnet 기준 $3/MTok → $0.3)
- 응답 첫 토큰 지연 **50%+ 감소**
- 단, 캐시 TTL 5분이므로 동시 트래픽 유지 필요

#### 4.3.4 국내 LLM 벤치마크 결론 (원 요청 대비 Claude 채택 근거)

| 후보 | 한국어 품질 | Tool Use | Prompt Caching | 코드 통합 | 비용 |
|---|---|---|---|---|---|
| **Claude 4.7 Sonnet** ✅ | 최상 | ✅ 성숙 | ✅ `ephemeral` | **이미 통합** | 중 |
| GPT-4o | 최상 | ✅ 성숙 | ⚠️ 부분 | 재구축 필요 | 중 |
| HyperCLOVA X | 한국어 특화 | ⚠️ 제한 | ❌ | 재구축 필요 | 저 |
| Solar (Upstage) | 중~상 | ⚠️ 제한 | ❌ | 재구축 필요 | 저 |

**결론**: 현재 기술 부채와 SDK 0.88 기 통합 상태 고려 시 Claude 유지. Phase 3에 A/B 테스트 고려.

#### 4.3.5 환각 방지·품질 레이어

```ts
// app/api/planner/recommend/route.ts
async function validateRecommendation(rec: Recommendation, plan: PlannerPlan) {
  const errors: string[] = [];

  const mediaIds = rec.options.flatMap(o => o.mediaIds);
  const existing = await prisma.media.findMany({
    where: { id: { in: mediaIds } },
    select: { id: true, priceBase: true, availableFrom: true, availableTo: true },
  });

  if (existing.length !== mediaIds.length) errors.push('HALLUCINATED_MEDIA_ID');
  // 추가 검증: 예산 범위·가용 기간·검증 배지

  if (errors.length > 0) {
    await logHallucination(rec, errors);  // Sentry + 모니터
    return retry();                        // 1회 재시도, 이후 휴리스틱 폴백
  }
  return rec;
}
```

---

### 4.4 PDF / PPT 자동 생성

#### 4.4.1 PDF 파이프라인 (jsPDF 기반)

**기존 자산**: `lib/build-quote-pdf.ts` 존재 — Noto Sans KR 임베드 검증됨.

**확장 포인트**

```
[입력]
 • OohQuote (매체 IDs, 캠페인 정보, 서비스 티어)
 • 광고주 로고 URL (선택)
 • 대행사 브랜딩 (선택, Phase 3)
    │
    ▼
[1. 데이터 수집]
 • Prisma: Media + VerificationBadge + PriceHistory
 • FootfallSnapshot 반경 집계
 • Kakao StaticMap API로 매체 위치 이미지
    │
    ▼
[2. 이미지 pre-render]
 • Recharts → react-dom/server → SVG → Canvas → PNG (차트)
 • node-canvas 또는 headless puppeteer 대안
 • Cloudinary에서 썸네일 최적화 URL 생성
    │
    ▼
[3. PDF 합성 (jsPDF)]
 • 커버: 로고·캠페인명·QR·발행일
 • 요약: 총 매체·예상 노출·견적
 • 매체별 1페이지: 사진·지도·배지·유동인구·CPM
 • 검증 부록: 4단계 기준 설명
 • 계약 안내: e-서명 링크·결제·담당자
    │
    ▼
[4. Cloudinary 업로드]
 • 7일 TTL signed URL
 • 다운로드 카운트 추적
```

#### 4.4.2 검증 배지 렌더링 (핵심 차별화)

```ts
// lib/build-quote-pdf.ts
function renderVerificationBadges(
  doc: jsPDF,
  badges: MediaVerificationBadge[],
  x: number, y: number,
) {
  const tier = badges[0]?.tier;  // gold/silver/bronze
  const tierColor = { gold: '#C8913C', silver: '#B0B8C4', bronze: '#A06840' }[tier];

  // Shield + 4 dots
  doc.setFillColor(tierColor);
  doc.circle(x, y, 3, 'F');  // locationScore
  doc.circle(x + 8, y, 3, badges[0].visibilityScore >= 4 ? 'F' : 'S');
  doc.circle(x + 16, y, 3, badges[0].illuminationScore >= 4 ? 'F' : 'S');
  doc.circle(x + 24, y, 3, badges[0].competitionScore >= 4 ? 'F' : 'S');

  doc.setFontSize(9);
  doc.text(`${badges[0].totalScore}/20 ${tier.toUpperCase()}`, x + 32, y + 1);
}
```

#### 4.4.3 PPT 생성 (pptxgenjs)

**용도**: 대행사·광고주가 내부에서 슬라이드를 **편집·재구성**할 수 있도록 제공.

**차이점**: PDF와 동일 구조이지만 **각 슬라이드 요소를 네이티브 도형·텍스트로** 렌더 (PDF는 이미지 고정).

```ts
// lib/build-quote-pptx.ts (신규)
const pptx = new pptxgen();
pptx.defineLayout({ name: 'A4', width: 10, height: 7.5 });

// 커버 슬라이드
const cover = pptx.addSlide();
cover.addImage({ path: thinkadLogo, x: 0.3, y: 0.3, w: 1.5, h: 0.5 });
cover.addText(campaignName, { x: 0.5, y: 2, w: 9, h: 1, fontSize: 36, color: '0D1B2E' });
// ...

// 매체별 슬라이드 반복
for (const media of medias) {
  const slide = pptx.addSlide();
  slide.addImage({ path: media.photoUrl, x: 0.3, y: 0.5, w: 4, h: 3 });
  slide.addText(media.name, { x: 4.5, y: 0.5, fontSize: 24 });
  slide.addChart('bar', footfallData, { x: 4.5, y: 4, w: 5, h: 3 });
}

await pptx.writeFile({ fileName: `${campaignId}.pptx` });
```

#### 4.4.4 성능·안정성

- **큐 기반 비동기 처리**: 생성 예상 시간 5초 이상이면 Vercel Cron이 아닌 **`QueuedJob` 테이블 + worker** 방식. (Vercel 60s 제한 회피)
- **멱등성**: 같은 quoteId 재호출 시 기존 URL 반환 (Cloudinary public_id = `quote_${id}_v${version}`)
- **메모리 관리**: 이미지는 Cloudinary URL만 전달, 로컬 다운로드 → jsPDF 임베드 후 즉시 GC
- **Fallback**: jsPDF 실패 시 서버사이드 puppeteer로 HTML → PDF 폴백

---

### 4.5 VR 투어 구현 (Marzipano)

#### 4.5.1 선택 이유

| 옵션 | 크기 | 라이선스 | 특징 |
|---|---|---|---|
| **Marzipano** ✅ | 15KB gzip | Apache 2.0 | Google 출신, IE11까지 지원, 핫스팟 성숙 |
| @react-three/fiber | 180KB+ | MIT | 3D 확장성 (나중에 AR로 확장 가능) |
| Pannellum | 30KB | MIT | 단순하나 React 통합 불편 |
| Krpano | — | 상용 라이선스 | 품질 최상이나 비용 |

**결론**: P1에선 Marzipano, Phase 3+에서 AR/3D 확장 시 fiber 병행.

#### 4.5.2 촬영·업로드 파이프라인

```
[현장 촬영]
 • Insta360 X4 / RICOH Theta Z1
 • equirectangular 2:1 비율 (4K~8K)
 • 핫스팟 좌표 기록 (yaw, pitch) — 실사팀 SOP
    │
    ▼
[Admin 업로드 /admin/medias/[id]/vr-tour]
 • Cloudinary 직접 업로드 (서명된 URL, 100MB 허용)
 • 자동 transformation: l_text:Arial_60:THINKAD,o_40,g_south_east (워터마크)
 • 자동 썸네일 생성 (정면 preview)
    │
    ▼
[핫스팟 에디터]
 • 클릭으로 핫스팟 추가 → { yaw, pitch, type, refId }
 • refId: 매체 위치 | 시설 POI | 경쟁매체
    │
    ▼
[MediaVRTour 저장]
 • imageUrl, hotspotsJson, capturedAt
```

#### 4.5.3 클라이언트 렌더링

```ts
// components/vr-tour-viewer.tsx
'use client';
import Marzipano from 'marzipano';

export function VRTourViewer({ imageUrl, hotspots }: Props) {
  const viewerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const viewer = new Marzipano.Viewer(viewerRef.current);
    const source = Marzipano.ImageUrlSource.fromString(imageUrl);
    const geometry = new Marzipano.EquirectGeometry([{ width: 4096 }]);
    const limiter = Marzipano.RectilinearView.limit.traditional(1024, 100*Math.PI/180);
    const view = new Marzipano.RectilinearView({ yaw: 0, pitch: 0 }, limiter);
    const scene = viewer.createScene({ source, geometry, view });

    hotspots.forEach(h => {
      const el = document.createElement('div');
      el.className = 'hotspot';
      el.textContent = h.label;
      scene.hotspotContainer().createHotspot(el, { yaw: h.yaw, pitch: h.pitch });
    });

    scene.switchTo();

    // 모바일 자이로
    if (window.DeviceOrientationEvent) {
      viewer.setControlMethodEnabled('deviceOrientation', true);
    }

    return () => viewer.destroy();
  }, [imageUrl, hotspots]);

  return <div ref={viewerRef} className="w-full h-[600px]" />;
}
```

#### 4.5.4 저작권·성능

- **우클릭 차단** + 키보드 스크린샷 단축키 감지 시 토스트 경고
- **프로그레시브 로딩**: 1K 저해상도 먼저 → 고해상도 swap
- **Lazy load**: 탭 진입 시에만 Marzipano import (`dynamic import`)
- **iOS 자이로 권한**: `DeviceOrientationEvent.requestPermission()` 호출 플로우 구현

---

### 4.6 실시간 알림 (Web Push + 이메일 + 인앱)

#### 4.6.1 아키텍처

```
[이벤트 소스]                             [큐]                 [디스패처]
┌────────────────────────────┐         ┌──────────┐         ┌──────────────┐
│ Admin: Media 가격 수정      │─────▶  │          │─────▶  │ /api/cron/   │
│ Admin: Campaign 상태 변경   │         │Notification│       │ dispatch-    │
│ Cron: 완판임박 감지         │─────▶  │Queue 테이블│       │ notifications│
│ Cron: 유동인구 신규 집계     │         │          │         │ (1min cron)  │
│ Cron: 검증 배지 만료 7일 전 │─────▶  │          │         │              │
└────────────────────────────┘         └──────────┘         └──────┬───────┘
                                                                    │
                          ┌───────────────────┬─────────────────────┤
                          ▼                   ▼                     ▼
                    ┌──────────┐        ┌──────────┐         ┌──────────┐
                    │Web Push  │        │Resend    │         │In-app    │
                    │(web-push)│        │(이메일)  │         │(폴링/SSE)│
                    └──────────┘        └──────────┘         └──────────┘
```

#### 4.6.2 이벤트 방출 (예: 가격 변경)

```ts
// app/api/admin/medias/[id]/route.ts
export async function PUT(req: Request, { params }: { params: { id: string } }) {
  const body = await req.json();
  const before = await prisma.media.findUnique({ where: { id: params.id } });
  const updated = await prisma.media.update({ where: { id: params.id }, data: body });

  // 가격 ±5% 이상 변동 시 알림 큐 생성
  if (Math.abs(updated.priceBase - before.priceBase) / before.priceBase >= 0.05) {
    await enqueueNotification({
      type: 'PRICE_CHANGED',
      targetId: updated.id,
      payload: { before: before.priceBase, after: updated.priceBase },
    });
  }
  return NextResponse.json({ ok: true, data: updated });
}

// lib/notification-queue.ts
async function enqueueNotification(event: NotificationEvent) {
  // 구독자 조회 (NotificationSubscription)
  const subs = await prisma.notificationSubscription.findMany({
    where: { type: event.type, OR: [{ targetId: event.targetId }, { targetId: null }] },
  });

  for (const sub of subs) {
    // 중복 제거 (Redis: notif:dedup:{userId}:{type}:{targetId}, TTL 1h)
    const dedupKey = `notif:dedup:${sub.userId}:${event.type}:${event.targetId}`;
    if (await redis.set(dedupKey, '1', { NX: true, EX: 3600 })) {
      await prisma.notificationQueue.create({ data: { ... } });
    }
  }
}
```

#### 4.6.3 Web Push (VAPID)

```ts
// app/api/notifications/webpush/subscribe/route.ts
import webpush from 'web-push';

webpush.setVapidDetails(
  'mailto:admin@thinkad.kr',
  process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!,
  process.env.VAPID_PRIVATE_KEY!,
);

export async function POST(req: Request) {
  const { subscription } = await req.json();
  const userId = await getUserId(req);

  await prisma.webPushSubscription.upsert({
    where: { endpoint: subscription.endpoint },
    create: {
      userId,
      endpoint: subscription.endpoint,
      p256dh: subscription.keys.p256dh,
      auth: subscription.keys.auth,
    },
    update: {},
  });

  return NextResponse.json({ ok: true });
}

// 디스패처에서
await webpush.sendNotification(subscription, JSON.stringify({
  title: '강남역 DOOH 가격 변동',
  body: '₩48M → ₩44M (-8%)',
  icon: '/icon-192.png',
  data: { url: `/media/${mediaId}` },
}));
```

#### 4.6.4 Service Worker (푸시 수신)

```js
// public/sw.js
self.addEventListener('push', event => {
  const data = event.data.json();
  event.waitUntil(
    self.registration.showNotification(data.title, {
      body: data.body,
      icon: data.icon,
      badge: '/badge-72.png',
      data: data.data,
    })
  );
});

self.addEventListener('notificationclick', event => {
  event.notification.close();
  event.waitUntil(clients.openWindow(event.notification.data.url));
});
```

#### 4.6.5 실시간성 업그레이드 경로

| 단계 | 방식 | 지연 | 비고 |
|---|---|---|---|
| **MVP (Phase 1)** | 1분 cron | < 2분 | 가장 간단, 비용 최소 |
| **Phase 2** | 30초 폴링 (인앱) | < 30초 | EventSource/SSE 고려 |
| **Phase 3** | SSE 또는 Pusher | < 2초 | `/api/sse/notifications` |
| **Phase 4** | WebSocket (필요 시) | 실시간 | 양방향 (챗봇 강화) |

---

### 4.7 보안 (Security)

#### 4.7.1 인증·세션

- **비밀번호**: argon2id 해싱 (OWASP 권장, bcrypt보다 GPU 공격 내성 강함)
- **세션 토큰**: 랜덤 256비트, DB 저장 + httpOnly·Secure·SameSite=Lax 쿠키
- **세션 IP 바인딩** (Phase 3+): 세션 생성 IP와 요청 IP가 다르면 재인증 요구 (중요 작업만)
- **OAuth state/nonce**: Kakao/Google OAuth는 state 파라미터로 CSRF 차단
- **이메일 인증**: 가입 시 필수, 미인증 계정은 견적·계약 불가

#### 4.7.2 API 보호

```ts
// middleware.ts
import { NextResponse } from 'next/server';
import { rateLimit } from '@/lib/rate-limit';

export async function middleware(req: Request) {
  // 1. Rate limit (Upstash Redis)
  const ip = req.headers.get('x-forwarded-for') ?? 'unknown';
  const { success } = await rateLimit({ key: ip, limit: 100, window: 60 });
  if (!success) return new NextResponse('Too many requests', { status: 429 });

  // 2. Origin 검증 (CSRF)
  if (req.method !== 'GET') {
    const origin = req.headers.get('origin');
    const allowed = [process.env.APP_URL, ...PARTNER_SUBDOMAINS];
    if (!allowed.includes(origin)) return new NextResponse('Forbidden', { status: 403 });
  }

  // 3. 인증 경로 보호
  if (req.url.includes('/my/')) {
    const session = await getSession(req);
    if (!session) return NextResponse.redirect(new URL(`/login?redirect=${req.url}`));
  }

  return NextResponse.next();
}
```

#### 4.7.3 데이터 보호 (PIPA 준수)

- **암호화 저장**: 개인정보(이름·전화·주소)는 AES-256-GCM, 키는 AWS KMS 또는 환경변수
- **서명된 PDF**: 계약 PDF는 암호화하여 Cloudinary 저장, 접근 로그 기록
- **감사 로그**: `AuditLog` 테이블 — Admin 작업·민감 데이터 조회 전부 기록 (actorId, action, target, timestamp, ip)
- **계정 삭제**: 30일 soft delete 후 물리 삭제 (완전 익명화)
- **데이터 내보내기**: `GET /api/my/export` JSON 다운로드 (PIPA 제35조 준수)
- **쿠키 동의**: 마케팅·분석 쿠키 분리 동의 (최초 방문 시 배너)

#### 4.7.4 업로드 보안

- **MIME 타입 화이트리스트**: 이미지(`image/jpeg|png|webp`) · PDF · CSV만 허용
- **파일 크기 제한**: 이미지 10MB, VR 100MB, CSV 5MB
- **Cloudinary 서명된 URL**: 클라이언트 직접 업로드 시 서버에서 서명 생성
- **악성 스크립트 차단**: SVG 업로드 시 `<script>` 태그 제거 (`dompurify`)

#### 4.7.5 취약점 대응

- **CSP 헤더** (`next.config.ts` `headers()`):
  ```
  default-src 'self';
  script-src 'self' 'nonce-{...}' https://dapi.kakao.com;
  img-src 'self' data: https://res.cloudinary.com https://dapi.kakao.com;
  connect-src 'self' https://api.anthropic.com;
  ```
- **SQL Injection**: Prisma ORM 사용으로 원천 차단 (raw query 금지)
- **XSS**: React 기본 이스케이프 + `dangerouslySetInnerHTML` 금지 룰 (ESLint)
- **Dependency 감사**: `npm audit` CI 자동화, GitHub Dependabot
- **SOC 2 / ISMS-P**: Phase 3 말 착수 목표

---

### 4.8 스케일링 & 성능

#### 4.8.1 DB 스케일링 로드맵

| 단계 | 매체 수 | 트래픽 | 전략 |
|---|---|---|---|
| **Phase 1** | ~5,000 | 100 req/s | 단일 Postgres + Prisma + 공간 인덱스 |
| **Phase 2** | ~15,000 | 500 req/s | 읽기 replica 1대 추가 (카탈로그는 replica) |
| **Phase 3** | ~30,000 | 2,000 req/s | PostGIS 이관 (지리쿼리 최적화) + replica 2대 |
| **Phase 4** | ~50,000+ | 5,000+ req/s | Shard 고려 (지역별) + CDN 캐시 |

#### 4.8.2 캐싱 전략

- **Edge Cache (Vercel)**: 정적 페이지(랜딩·인사이트) `stale-while-revalidate` 60s
- **Next.js `unstable_cache`**: 매체 카탈로그 리스트 60s (태그 기반 invalidation)
- **Redis**:
  - rate-limit (IP·userId 별)
  - 세션 조회 (DB 부하 감소)
  - Claude 응답 캐시 (동일 플랜 입력 15분 TTL)
  - 알림 dedup
- **React Server Components**: 공용 데이터(카테고리·지역 목록)는 서버 캐시

#### 4.8.3 프런트 성능 목표

| 지표 | 목표 (p75) | 측정 도구 |
|---|---|---|
| LCP | < 2.5s | Vercel Analytics · web-vitals |
| INP | < 200ms | 동일 |
| CLS | < 0.1 | 동일 |
| Lighthouse Perf (mobile) | ≥ 90 | CI 자동 측정 |

**최적화 기법**
- `next/image` + Cloudinary transformation (WebP/AVIF)
- 지도·VR은 `next/dynamic` `ssr: false` + Intersection Observer (뷰포트 진입 시만 로드)
- 가상 스크롤 (`@tanstack/virtual`) — 매체 리스트 1,000개+
- 폰트 Preload (Pretendard), `font-display: swap`
- Anthropic streaming → 첫 토큰까지 < 1.5s

#### 4.8.4 모니터링·알람

- **Sentry**: 클라이언트·서버 에러, 릴리즈별 그룹화, 에러율 > 0.5% 시 Slack 알림
- **Vercel Analytics**: Web Vitals + 라우트별 p95 트래킹
- **PostHog**: 이벤트 퍼널 (랜딩→플래너→제안서)
- **헬스체크**: `/api/health` 엔드포인트 — DB·Redis·Cloudinary 핑 → UptimeRobot 1분 간격
- **비용 알람**: Anthropic 월 사용량 80% 도달 시 알림 (리스크 R2)

#### 4.8.5 장애 복구

- **PITR 백업**: Supabase/Neon PITR 7일 보존
- **주간 외부 덤프**: S3에 `pg_dump` 저장 (30일)
- **Vercel Instant Rollback**: 1클릭 이전 배포 복귀
- **Prisma Migration 원칙**: 되돌림 가능한 변경만 (컬럼 추가 OK, 삭제는 2단계: `deprecate` → 1개월 후 제거)
- **Runbook**: `docs/runbook.md` — 장애 유형별 대응 절차 (DB 다운, Vercel 다운, API 키 만료 등)

---

## 5. 개발 로드맵 (Phase별 스프린트)

### 5.1 마일스톤 개요

| Phase | 기간 | 주요 목표 | 릴리즈 | 팀 규모 |
|---|---|---|---|---|
| **Pre-sprint** | 2026-04-21 ~ 2026-04-30 | 킥오프·계약·환경 준비 | — | 현재 팀 |
| **Phase 1 (MVP)** | 2026-05 ~ 2026-07 | 지도·제안서·플래너·회원 | **2026-07-31 베타** | FE×2, BE×2, 디자인×1, PM×1 |
| **Phase 2 (차별화)** | 2026-08 ~ 2026-10 | 유동인구·알림·VR·배지 전면 | **2026-10-31 정식** | + 데이터엔지니어×1 |
| **Phase 3 (플랫폼)** | 2026-11 ~ 2027-04 | 챗봇·오너·대행사·자동보고서 | **분기별 마일스톤** | + AI엔지니어×1 |
| **Phase 4 (글로벌)** | 2027-05 ~ | 다국어·PWA·이벤트 | **반기별** | + 글로벌 GTM×1 |

### 5.2 MVP 최소 기능 정의 (2026-07-31 베타 출시 기준)

**반드시 포함 (P0)**
- [x] F1.1 지도 기반 매체 검색 (클러스터·필터·반경)
- [x] F1.2 자동 제안서 PDF 생성 (검증 배지 포함)
- [x] F1.3 매체플래너 위자드 + Claude AI 추천
- [x] F1.4 이메일/Kakao 회원제 + My THINKAD 기본 탭
- [x] F2.4 검증 배지 데이터 모델 + 카드·PDF·플래너 노출 (P2 관리 UI만 Phase 2)
- [x] D1 Verified Only 필터
- [x] D2 3-Tier 서비스 선택 UI (Self·Assisted는 실제 운영, Full은 "문의" 폼으로 시작)
- [x] 모바일 반응형 (특히 지도·플래너)

**베타 출시에서 제외 (다음 스프린트 이관)**
- Full-Service 완전 자동화 (Phase 2 Sprint 7~8)
- 유동인구 공공데이터 연동 (Phase 2)
- VR 투어 (Phase 2)
- 대행사·매체사 포털 (Phase 3)
- 챗봇 UI (내부 API만 활용, Phase 3)

**베타 품질 게이트 (출시 기준)**
- [ ] Lighthouse Performance ≥ 85 (모바일)
- [ ] E2E 테스트 (Flow A 전체) 통과
- [ ] 에러율 < 1% (Sentry)
- [ ] 개인정보보호법·전자상거래법 준수 검토 완료
- [ ] PDF 한글 폰트 렌더링 100% 검증

### 5.3 Pre-sprint (출범 전 10일, 2026-04-21 ~ 2026-04-30)

**목적**: MVP 착수 전 의사결정·계약·환경 준비

- [ ] 킥오프 워크숍 (경영진·매체본부·개발팀)
- [ ] Kakao 디벨로퍼스 API 키 발급 (`KAKAO_MAP_KEY`, `KAKAO_LOGIN_KEY`)
- [ ] Anthropic 프로덕션 API 키 확보 + 월 예산 Cap 설정
- [ ] Cloudinary Plan 업그레이드 (변환·equirectangular 대응)
- [ ] Resend 프로덕션 도메인 인증 (SPF·DKIM·DMARC)
- [ ] Upstash Redis 인스턴스 생성
- [ ] VAPID 키 쌍 생성 (Web Push)
- [ ] 모두싸인 계약 (전자서명 · Phase 1 후반 사용)
- [ ] Toss Payments 가맹점 심사
- [ ] 브랜드 가이드 최종 확정 (tailwind.config.ts 반영)
- [ ] Figma 디자인 시스템 컴포넌트 정리 (shadcn 매핑)
- [ ] Playwright E2E 시나리오 초안 작성 (기존 `docs/e2e-test-scenarios.md` 확장)

### 5.4 Phase 1 스프린트 (12주 / 6 스프린트, 2주 단위)

#### Sprint 1 (W1-2): 인증 기반 + 회원 모델
**목표**: `/my` 진입 가능, 로그인/가입 정상 동작

- [ ] Prisma 신규 모델 마이그레이션: `User`, `UserSession`, `UserOAuthAccount`, `UserFavoriteMedia`, `PlannerPlan`
- [ ] `next-auth` v5 또는 자체 세션 구현 (Credentials + Kakao + Google)
- [ ] `app/(auth)/login`, `app/(auth)/register`, `/forgot-password` 페이지
- [ ] 이메일 인증 (Resend 템플릿)
- [ ] 미들웨어 `/my/*` 보호
- [ ] `/my` 기본 레이아웃 + 빈 탭들

**산출물**: 로그인 → `/my` 대시보드 진입, 회원가입 → 이메일 인증 → 로그인

#### Sprint 2 (W3-4): 지도 MVP
**목표**: `/media` 지도 뷰에서 매체 탐색·핀 클릭·필터 작동

- [ ] Kakao Map SDK 통합 + `ssr:false` dynamic import
- [ ] `components/media-map-view.tsx` + 클러스터러
- [ ] `fetchPublicMediaCatalog` 확장 (bbox/radius 파라미터)
- [ ] `Media.@@index([latitude, longitude])` 추가 마이그레이션
- [ ] 필터 바 + URL 쿼리 동기화
- [ ] 바텀시트 (모바일)
- [ ] "제안서에 담기" 장바구니 (localStorage + 로그인 시 서버 동기화)

**산출물**: `/media` 지도/리스트 토글, 1,000개 더미 데이터로 60fps 검증

#### Sprint 3 (W5-6): My THINKAD + 장바구니
**목표**: 플래너 저장·즐겨찾기·견적 이력 기본 탭 동작

- [ ] `localStorage tkad-planner-plan-v2` ↔ `PlannerPlan` 서버 동기화 훅
- [ ] `/my/plans` 저장된 플랜 그리드 카드
- [ ] `/my/favorites` 즐겨찾기 그리드
- [ ] `/my/quotes` 견적 이력 (Phase 1 초기 : 빈 상태)
- [ ] 대시보드 요약 카드 (집계 API)
- [ ] 좌측 세로 네비 (모바일은 드로어)

**산출물**: 비로그인 플래너 저장 → 로그인 시 자동 동기화 시나리오 E2E 검증

#### Sprint 4 (W7-8): 플래너 위자드 + Claude 추천
**목표**: 7단계 위자드 작동, AI 3안 추천 완주율 60%+

- [ ] Prisma `MediaVerificationBadge` 모델 + 시드 데이터 (실제 매체 30개 4단계 점수 입력)
- [ ] `/planner` 7단계 UI (Stepper + 각 단계 컴포넌트)
- [ ] `/api/planner/recommend` — Claude tool use 구현
- [ ] `search_media`, `estimate_reach`, `get_footfall`, `check_budget` 도구 핸들러
- [ ] Prompt caching 적용 (시스템 프롬프트 + 매체 카탈로그 요약)
- [ ] 결과 3안 화면 (Conservative/Balanced/Aggressive)
- [ ] "제안서로 받기" → 장바구니 자동 이동
- [ ] localStorage 단계별 저장 + 이어가기

**산출물**: 플래너 완주 → 3안 표시 → 제안서 장바구니 진입 (전체 E2E)

#### Sprint 5 (W9-10): 자동 제안서 PDF + 검증 배지 UI
**목표**: 1클릭 PDF 생성 45~60초 이내(p95 < 60s) + 검증 배지 시각화 + 공개 웹뷰 보안 정책 적용

- [ ] `lib/build-quote-pdf.ts` 확장 (검증 배지 · Kakao 정적 지도 · 유동인구 자리표시)
- [ ] `POST /api/quotes` + `POST /api/quotes/:id/pdf` 비동기 잡
- [ ] 진행 모달 + 완료 시 자동 다운로드
- [ ] `/quote/[id]?t=<token>` 공개 웹뷰 (토큰 기반, 7일 TTL)
- [ ] **공개 웹뷰 보안 정책**: 토큰 재발급 · IP geo-restriction 옵션 · Redis rate-limit · 다운로드 50회 상한 · `QuoteViewAudit` 로깅 · Cloudinary signed URL · `noindex` · Turnstile 챌린지 (의심 트래픽)
- [ ] 카드·상세·비교·PDF에 검증 배지 공통 컴포넌트 노출
- [ ] D1 "Verified Only" 토글 구현
- [ ] D2 3-Tier 서비스 선택 UI (Self·Assisted 분기 처리)

**산출물**: 플래너 → 제안서 담기 → PDF 다운로드 전체 플로우 E2E (보안 정책 포함)

#### Sprint 6 (W11-12): 안정화 + 베타 준비
**목표**: 베타 출시 품질 게이트 통과

- [ ] Playwright E2E 확장: Flow A·B 전체 커버
- [ ] Lighthouse 모바일 ≥ 85 달성 (이미지·폰트·스크립트 최적화)
- [ ] Sentry 통합 · 모니터링 알람 세팅
- [ ] 법무 검토: 개인정보처리방침 v2026 · 이용약관 · 전자상거래 고지
- [ ] 결제 연동 (Toss Payments 실결제 테스트)
- [ ] 베타 사용자 30명 모집 (기존 광고주 풀)
- [ ] 내부 QA 워크숍 → 크리티컬 버그 수정
- [ ] **2026-07-31 베타 공개**

**산출물**: 베타 URL `beta.thinkad.kr` 공개 + 초기 사용자 피드백 수집 시작

---

### 5.5 Phase 2 스프린트 (12주, 2026-08 ~ 2026-10)

#### Sprint 7 (W13-14): 유동인구 데이터 파이프라인
- [ ] 공공데이터 API 계약·호환성 테스트 (서울열린데이터광장·KT/SKT)
- [ ] `FootfallSnapshot` 모델 + `geohash` 인덱스
- [ ] `lib/footfall-public-data.ts` 일일 수집 cron
- [ ] heuristic 폴백 유지

#### Sprint 8 (W15-16): 유동인구 UI + PDF 통합
- [ ] 매체 상세 유동인구 탭 (Recharts)
- [ ] `GET /api/public/footfall?lat&lng&radiusM`
- [ ] PDF 차트 자동 삽입 (F1.2 Sprint 5의 자리표시 실데이터화)
- [ ] 플래너 결과에 유동인구 근거 툴팁

#### Sprint 9 (W17-18): 실시간 알림 시스템
- [ ] Prisma `Notification`, `NotificationSubscription`, `NotificationQueue`, `WebPushSubscription`
- [ ] Admin PUT 훅에서 `enqueueNotification()` 트리거
- [ ] `/api/cron/dispatch-notifications` 1분 cron
- [ ] Web Push + Resend 이메일 발송
- [ ] `/my/notifications` 알림 센터 UI

#### Sprint 10 (W19-20): 검증 배지 관리 + 리포트 PDF
- [ ] `/admin/medias/[id]/verification` Stepper 입력 UI
- [ ] `lib/verification-scoring.ts` 점수 → 등급 매핑
- [ ] 현장 사진 업로드 (Cloudinary, 최소 4장)
- [ ] `lib/build-verification-report-pdf.ts` 신규
- [ ] 배지 만료 7일 전 알림 cron

#### Sprint 11 (W21-22): VR 투어 파일럿
- [ ] Cloudinary equirectangular 업로드 + 워터마크 자동화
- [ ] `/admin/medias/[id]/vr-tour` 핫스팟 에디터
- [ ] `components/vr-tour-viewer.tsx` (Marzipano)
- [ ] 파일럿 10개 매체 촬영·업로드 (실사팀)
- [ ] 매체 상세 "VR" 탭

#### Sprint 12 (W23-24): 성공사례 메트릭 자동화 + 정식 출시 준비
- [ ] `Campaign.status=completed` 시 `SuccessCase` 초안 자동 생성
- [ ] `SuccessCase.metricsJson` zod 스키마
- [ ] 트렌드 리포트 월 1일 자동 초안 생성 (Claude)
- [ ] `/insights/trend-reports/[month]` 페이지
- [ ] **2026-10-31 정식 출시** (`beta.` → 루트 도메인 승격)

**Phase 2 산출물**: HOO 대비 8축 압도 포지셔닝 완성, GMV 월 3억+ 돌파 기반

---

### 5.6 Phase 3 스프린트 (24주, 2026-11 ~ 2027-04)

#### Sprint 13-16 (W25-32): AI 챗봇 컨설턴트 (F3.2)
- [ ] `app/api/chat/route.ts` Anthropic streaming + tool use 확장
- [ ] `ChatSession`, `ChatMessage` 모델 + 게스트 localStorage 동기화
- [ ] 플로팅 챗 위젯 UI (`components/chat-widget.tsx`)
- [ ] Tool: `search_media`, `create_plan_draft`, `check_availability`, `book_consultation`
- [ ] "전문가 연결" → CrmAccount 생성 + Slack 알림
- [ ] 업무 시간/야간 배지 분기
- [ ] Rate limit (60 req/hr 로그인, 10 req/hr 게스트)

#### Sprint 17-20 (W33-40): 매체사 포털 (F3.1) + 대행사 포털 (F3.4)
- [ ] `MediaOwner`, `MediaOwnerMembership`, `Agency`, `AgencyCommission` 모델
- [ ] `Media.ownerId` FK 추가 + 권한 미들웨어
- [ ] `/owner` 포털: 가입·CSV 업로드·대시보드·정산
- [ ] `/partner` 포털: 화이트라벨·수수료·귀속
- [ ] 서브도메인 라우팅 (`*.thinkad.kr` middleware)
- [ ] 월간 정산 PDF (오너 · 대행사 각각)
- [ ] 파일럿: 매체사 3곳 + 대행사 2곳 초청 온보딩

#### Sprint 21-22 (W41-44): 캠페인 성과 보고서 완전 자동화 (D3)
- [ ] `/api/cron/generate-completion-reports` 주 1회
- [ ] 업종 평균 CPM 벤치마크 테이블 시드
- [ ] AI 인사이트 섹션 (Claude + 캠페인 데이터)
- [ ] 광고주·대행사 브랜딩 맞춤 커버
- [ ] 자동 이메일 발송 (Resend)

#### Sprint 23-24 (W45-48): 성능·보안 감사 + SOC 2 준비 킥오프
- [ ] PostgreSQL PostGIS 이관 검토 (지리쿼리 최적화)
- [ ] 읽기 replica 2대 구성
- [ ] 외부 보안 감사 (OWASP Top 10 + BDA)
- [ ] ISMS-P 인증 준비 자료 수집
- [ ] SOC 2 Type I 킥오프 미팅

**Phase 3 산출물**: 양면 시장 (매체사·대행사) 확보, 챗봇 DAU 500+, MCC 150건/월

---

### 5.7 Phase 4 (12개월+, 2027-05 ~)

- **다국어 풀 지원** (EN/CN/JP): 매체 번역 파이프라인, 전문 번역사 검수 루프
- **PWA + 모바일 앱**: 오프라인, 카메라 증빙, 지오로케이션 매체 제안
- **Stripe 글로벌 결제**: 해외 카드·PayPal
- **웨비나·세미나 예약** 모듈
- **ISMS-P 인증 취득** → B2B 엔터프라이즈 영업 가능

---

### 5.8 인적 리소스 계획

| 역할 | Phase 1 | Phase 2 | Phase 3 | Phase 4 |
|---|---|---|---|---|
| **Product Manager** | 1 | 1 | 1~2 | 2 |
| **Frontend Engineer** | 2 | 2~3 | 3 | 3~4 |
| **Backend Engineer** | 2 | 2~3 | 3 | 3 |
| **Data Engineer** | 0 | 1 | 1 | 1 |
| **AI Engineer** | 0 | 0 | 1 | 1 |
| **Designer (UX/UI)** | 1 | 1 | 1~2 | 2 |
| **QA Engineer** | 0.5 (개발 겸임) | 1 | 1~2 | 2 |
| **매체본부 (도메인)** | 2 (기존) | 3 (검증 전담) | 4 (어시스트·풀서비스) | 5+ |
| **DevOps / SRE** | 0.5 (외주) | 1 | 1 | 1~2 |
| **글로벌 GTM** | 0 | 0 | 0 | 1 |
| **합계** | **9** | **12** | **16** | **20+** |

**핵심 채용 우선순위**
- Phase 2 시작 시점: **Data Engineer** 채용 (공공데이터 파이프라인)
- Phase 3 시작 시점: **AI Engineer** 채용 (Claude tool use·RAG·프롬프트 엔지니어링)

### 5.9 릴리즈 & 배포 전략

- **브랜치 전략**: `main` (prod) / `staging` / feature 브랜치 (`feat/*`, `fix/*`)
- **Preview Deploy**: PR마다 Vercel 자동 배포 + URL 자동 코멘트
- **릴리즈 케이던스**: **격주 금요일 오전** 정기 배포 + 긴급 hotfix 즉시 (ChatOps `/deploy hotfix`)
- **롤백**: Vercel Instant Rollback + Prisma migration은 되돌림 가능한 변경만
- **Feature Flag**: `FeatureFlag` 테이블 (Phase 2 도입) — 점진적 롤아웃·카나리·kill-switch
- **사용자 커뮤니케이션**: 배포 후 `/changelog` 페이지 자동 업데이트 + My THINKAD 인앱 공지

---

## 6. 차별화 전략 & 성공 지표 (OKR)

### 6.1 HOO 압도 전략 — 8축 실행 계획

| # | 축 | HOO 현황 | **THINKAD 실행 전략** | 확보 일정 |
|---|---|---|---|---|
| 1 | **매체 검증** | 등록 심사만 | 4단계 현장 실사 배지 + Verified Only 필터 (D1) + PDF 배지 노출 | Phase 1 ~ Phase 2 |
| 2 | **제안서 속도** | 24~48시간 | **30분 자동 PDF + 2시간 전문가 검수 (Self/Assisted)** | Phase 1 |
| 3 | **데이터 근거** | 매체사 자료 | 공공 유동인구 + 자체 실적 + POI, **출처 필수 표기** | Phase 2 |
| 4 | **가격 투명성** | 호가만 | 가격 이력 스냅샷 공개 + 실시간 가용성 | Phase 1 매체상세 |
| 5 | **AI 활용** | 없음/제한 | 플래너 추천 + 챗봇 + 트렌드 리포트 + 완료 리포트 인사이트 | Phase 1 ~ Phase 3 |
| 6 | **집행 증빙** | 매체사 선택 | 필수 + 캠페인 종료 7일 내 자동 PDF 보고서 (D3) | Phase 2 ~ Phase 3 |
| 7 | **다국어** | KO 중심 | KO/EN/CN/JP 풀 지원 + 제안서 PDF 언어 선택 | Phase 3 ~ Phase 4 |
| 8 | **서비스 모델** | 셀프 단일 | **Self / Assisted / Full 3-Tier** — 전환 퍼널로 LTV 극대화 (D2) | Phase 1 |

**HOO가 따라오기 어려운 구조적 해자 (Moat)**

1. **현장 실사팀 = 물리적 자산**: HOO가 자본으로 못 사는 조직. Phase 2까지 전국 15,000 매체 검증 달성 목표.
2. **3년치 자체 캠페인 데이터**: CPM·리치·업종별 벤치마크 → HOO는 0년차.
3. **매체본부 도메인 지식** → 챗봇·AI 추천의 시스템 프롬프트 특화 (prompt engineering moat).
4. **대행사 네트워크**: 파트너 대행사 수수료 구조는 전환 비용이 높아 lock-in 강함.

---

### 6.2 북극성 지표 (North Star Metric)

> ### **"월간 결제 확정 캠페인 수 (MCC, Monthly Confirmed Campaigns)"**

**이유**
- 매출·재고 회전·고객 만족·매체사 수익 모두와 **양의 상관관계**
- 단일 숫자로 팀이 집중 가능
- Vanity metrics (가입자 수 등) 와 달리 **실제 매출 창출 행위**

**보조 지표**
- **Activation Rate**: 가입 → 첫 제안서 요청 (목표 40%+)
- **Conversion Rate**: 제안서 → 결제 확정 (목표 25%+)
- **Average Deal Size**: 평균 캠페인 견적 (목표 Phase 2말 5천만원+)

---

### 6.3 3개월 OKR (Phase 1 MVP · 2026-05 ~ 2026-07)

#### O1 · "MVP 출시하여 사용자 손에 쥐어준다"

| KR | 측정 | 목표 | 기준선 | 담당 |
|---|---|---|---|---|
| KR1.1 | **베타 정식 출시**일 (지도·제안서·플래너·회원) | 2026-07-31 | — | PM |
| KR1.2 | Playwright **Flow A 전체 E2E 통과율** | ≥ 95% | 0% | FE/QA |
| KR1.3 | **Lighthouse Performance** (모바일) | ≥ 85 | — | FE |
| KR1.4 | **에러율** (Sentry 5xx) | < 1% | — | BE |
| KR1.5 | 법무 검토 (개인정보·전자상거래·전자서명) | 100% 완료 | — | PM |

#### O2 · "베타 사용자 사로잡는다 (Product-Market Fit 신호 확인)"

| KR | 측정 | 목표 | 기준선 | 담당 |
|---|---|---|---|---|
| KR2.1 | 베타 가입 유저 | **1,000명** | 0 | 마케팅 |
| KR2.2 | **MCC** (월간 결제 확정 캠페인) | **20건/월** | 0 | 전체 |
| KR2.3 | 플래너 완주율 (1→7단계) | **60%** | — | Product |
| KR2.4 | 제안서 생성 → 결제 전환율 | **25%** | — | Product |
| KR2.5 | **NPS** (베타 사용자 대상) | ≥ 30 | — | Product |
| KR2.6 | 제안서 생성 평균 소요 시간 | **< 30초** | 3일 (Before) | BE |

#### O3 · "검증 배지를 차별화 무기로 세운다"

| KR | 측정 | 목표 | 담당 |
|---|---|---|---|
| KR3.1 | 검증 배지 보유 매체 수 | **300개+** (시드 30 → 300) | 매체본부 |
| KR3.2 | Verified Only 필터 활성화 세션 비율 | **35%+** | Product |
| KR3.3 | 제안서 PDF에 검증 배지 노출률 | **100%** | BE/Product |

---

### 6.4 6개월 OKR (Phase 2 · 2026-08 ~ 2026-10)

#### O4 · "HOO 대비 8축 압도 포지셔닝 완성"

| KR | 측정 | 목표 |
|---|---|---|
| KR4.1 | **MCC** | 60건/월 |
| KR4.2 | 유동인구 데이터 보유 매체 비율 | 70%+ |
| KR4.3 | 검증 배지 보유 매체 | 2,000개+ |
| KR4.4 | VR 투어 보유 매체 (파일럿) | 50개 |
| KR4.5 | 실시간 알림 구독 사용자 | 2,500명 |

#### O5 · "재방문·리텐션 구조 확립"

| KR | 측정 | 목표 |
|---|---|---|
| KR5.1 | WAU/MAU | 40% |
| KR5.2 | 가입 D7 리텐션 | 25% |
| KR5.3 | 가입 D30 리텐션 | 15% |
| KR5.4 | 매체 상세 평균 체류시간 | 3분+ |

#### O6 · "콘텐츠 허브로 SEO 유입 확보"

| KR | 측정 | 목표 |
|---|---|---|
| KR6.1 | 월간 오가닉 검색 유입 세션 | 15,000 |
| KR6.2 | 트렌드 리포트 월 구독자 | 3,000명 |
| KR6.3 | 성공사례 페이지 평균 CTR | 8%+ |

---

### 6.5 12개월 OKR (Phase 3 · 2026-11 ~ 2027-04)

#### O7 · "플랫폼 전환 — 양면 시장 확보"

| KR | 측정 | 목표 |
|---|---|---|
| KR7.1 | **MCC** | 150건/월 |
| KR7.2 | 매체사 포털 등록 매체 (오너 직접 등록) | 5,000면+ |
| KR7.3 | 활성 파트너 대행사 | 20곳 |
| KR7.4 | 대행사 경유 GMV 비율 | 30%+ |

#### O8 · "AI 챗봇 핵심 유입 채널화"

| KR | 측정 | 목표 |
|---|---|---|
| KR8.1 | 챗봇 일 활성 세션 (DAU) | 500건 |
| KR8.2 | 챗봇 → 제안서 전환율 | 15% |
| KR8.3 | "전문가 연결" 전환율 (하이브리드 핵심) | 10% |
| KR8.4 | 챗봇 Claude 평균 비용 / 세션 | < $0.05 (prompt cache) |

#### O9 · "풀서비스 전환 퍼널 정착"

| KR | 측정 | 목표 |
|---|---|---|
| KR9.1 | Self → Assisted 전환율 | 30% (예산 1천만+) |
| KR9.2 | Assisted → Full 전환율 | 20% |
| KR9.3 | Full-Service 평균 견적 금액 | 1억원+ |

---

### 6.6 24개월 OKR (Phase 4 · 2027-05 ~ )

| KR | 측정 | 목표 |
|---|---|---|
| KR10.1 | **MCC** | 300건/월 |
| KR10.2 | 해외 광고주 세션 비율 | 20% |
| KR10.3 | PWA 설치 수 | 10,000 |
| KR10.4 | 다국어 페이지 SEO 유입 | 월 50,000 세션 |
| KR10.5 | GMV | 월 50억원+ |
| KR10.6 | ISMS-P 인증 취득 | 2027-12까지 |

---

### 6.7 제품 헬스 & 비즈니스 지표

**제품 헬스 (상시 모니터링)**
- P95 API 응답시간 < 300ms
- 에러율 < 0.5% (5xx)
- 빌드 성공률 ≥ 98%
- E2E 커버리지 (핵심 플로우) ≥ 90%

**비즈니스 (분기 리뷰)**
- GMV · Take Rate (8~12%) · CAC · LTV/CAC (> 4)
- 매체사 공실률 개선 (평균 -10%p)
- 자동 제안서 생성 수 (월)
- Claude API 비용 / MCC (Unit Economics)

---

## 7. 추가 제언

### 7.1 놓쳤을 수 있는 중요 기능 5가지 (제품 관점)

#### 🎯 제언 1. 크리에이티브 시뮬레이터 — "내 광고가 이 매체에서 어떻게 보일까?"

**문제**: 초심자는 "이 빌보드에 내 크리에이티브가 실제로 어떻게 보일지" 상상이 안 된다. 이게 결제 버튼을 누르는 가장 큰 심리적 장벽이다.

**해결**: 광고주가 이미지·영상을 업로드하면 **매체 실제 사진과 합성하여 3초 내 미리보기** 생성. Cloudinary transformation (`l_fetch:<base64>,g_north,w_500`)으로 서버리스 구현 가능.

**예상 효과**
- 결제 전환율 **+15~25%p** (심리 장벽 제거)
- 크리에이티브 수정 사이클 단축 (대행사·인하우스 모두)
- **F1.3 플래너 결과 화면, F1.2 제안서 PDF 모두에 자동 삽입** → 차별화 극대화

**실행 시점**: Phase 1 Sprint 5 (이미 파이프라인이 유사)

---

#### 🎯 제언 2. 네거티브 인벤토리 (Competitor Block) — "경쟁사 금지 매체"

**문제**: 광고주가 "경쟁사 A 브랜드가 같은 매체에 노출 중이면 절대 안 됨"이라는 요구가 실제로 많다. HOO에는 없는 기능.

**해결**:
- 광고주 프로필에 **"금지 경쟁사 리스트"** 등록 필드
- 플래너·카탈로그에서 해당 경쟁사 **집행 이력이 있는 매체는 자동 제외**
- 또는 "경쟁사 집행 종료 후 N일 후 가능" 필터

**예상 효과**
- B2B 기업·유통·금융 업종에서 유료 전환 트리거
- **프리미엄 티어 기능**으로 월 구독 모델 가능 (Unit Economics 개선)

**실행 시점**: Phase 2 (`CampaignHistory` 집계 활용)

---

#### 🎯 제언 3. 캠페인 협업 (다중 승인자) — "CMO·재무·법무 동시 검토"

**문제**: 3천만원+ 캠페인은 **CMO + 재무팀 + 법무팀** 3자 승인이 필요한데, 지금은 PDF를 이메일로 돌려서 한 달씩 걸린다.

**해결**:
- `/quote/[id]` 웹뷰에 **승인자 초대·코멘트·승인 버튼**
- 각 승인자 상태 대시보드 (Pending / Approved / Rejected + 코멘트)
- 모든 승인 완료 시 "계약 진행" 버튼 활성화 + 슬랙 알림

**예상 효과**
- B2B 엔터프라이즈 (1억+ 캠페인) 의사결정 리드 타임 **30일 → 7일**
- Phase 4 글로벌 확장 시 필수 (본사-지사 승인 구조)

**실행 시점**: Phase 3 Sprint 21 전후

---

#### 🎯 제언 4. 매체 가용성 "대기줄(Waitlist)" — "완판된 매체에 대기 등록"

**문제**: 인기 매체(강남역 DOOH 등)는 자주 완판되고, 다시 오픈되면 기존 광고주가 선점. 새 고객은 기회를 못 잡음.

**해결**:
- 완판 매체 상세에 "대기줄 등록" 버튼 (무료)
- 가용 기간 오픈 시 **대기줄 선착순**으로 Web Push + 이메일
- 대기 중 상태를 `/my/waitlist`에서 확인

**예상 효과**
- 인기 매체 재고 회전 극대화
- 매체사 공실률 추가 **-5%p**
- F2.2 알림 시스템 자연스러운 확장

**실행 시점**: Phase 2 Sprint 9 (알림 인프라 재사용)

---

#### 🎯 제언 5. THINKAD 아카데미 (B2B 인증 프로그램) — "OOH 전문가 자격증"

**문제**: 광고주 실무자 대부분 OOH 지식이 디지털 광고보다 얕다. 교육이 곧 lock-in이다.

**해결**:
- `/academy` 기존 구조를 **수료증 발급 프로그램**으로 고도화
- 8주 커리큘럼 (매체 유형·검증 기준·캠페인 설계·성과 분석)
- 수료 시 "THINKAD Certified OOH Planner" 뱃지 + LinkedIn 공유
- 인증자에게 **제안서 수수료 할인 or 프리미엄 기능 무료**

**예상 효과**
- 영업 채널 역전: "Certified 광고주만 10,000명 보유" → HOO 신규 고객 유입 차단
- 컨텐츠 SEO 유입 폭발 (교육 콘텐츠는 검색 수요 큼)
- 매체사·대행사도 참여시키면 **삼면 네트워크 효과**

**실행 시점**: Phase 3 ~ Phase 4 (F4.3 웨비나와 결합)

---

### 7.2 주요 리스크 5가지 & 미티게이션

#### ⚠️ 리스크 1. HOO의 가격 덤핑 또는 독점 매체 계약 `영향:높음 · 확률:중`

**구체 시나리오**
- HOO가 Series B~C 자금 조달 후 매체사에 "수수료 무료 + 보증금 지급" 조건으로 독점 계약 요구
- 주요 매체 10~20%가 "THINKAD 판매 금지" 조항 포함 재계약

**미티게이션**
1. **매체사와 비독점 장기 계약 선점** (Phase 1 매체본부 우선 과제)
2. **검증 배지 가치 제공 lock-in**: 배지 유지는 6개월 재검증 조건, 독점으로 이동 시 배지 자동 만료
3. **매체사 포털 + 대행사 네트워크**로 전환 비용 상승 (Phase 3)
4. 특정 매체 못 팔게 되어도 **검증 매체 "큐레이션" 가치**로 대응 (재고 양 경쟁 피함)

**조기 경보 지표**: 매체사 이탈율 > 5% / 분기

---

#### ⚠️ 리스크 2. Claude API 비용 폭증 `영향:중 · 확률:높음`

**구체 시나리오**
- 챗봇 출시 후 광고주가 아닌 일반 유저(학생·경쟁사)가 자유 질문 폭증
- Prompt caching 없이 매 요청 3,000 토큰씩 재전송
- 월 청구서가 매출 대비 비현실적 (20%+)

**미티게이션**
1. **Prompt caching 전면 적용** (`cache_control: ephemeral`) — 90% 절감
2. **Rate limit 이중화**: IP 기반(10 req/hr 게스트) + userId 기반(60 req/hr 로그인)
3. **사용자별 월 quota**: 무료 100 req/월 + 초과 시 유료 전환
4. **비용 대시보드**: Anthropic 월 사용량 80% 도달 시 Slack 알림 + 자동 model fallback (Opus → Sonnet → Haiku)
5. **캐시 친화적 설계**: 시스템 프롬프트·매체 카탈로그 요약 구조 고정

**조기 경보 지표**: 월 Anthropic 비용 / MCC > $10

---

#### ⚠️ 리스크 3. AI 환각에 의한 잘못된 매체·가격 추천 `영향:높음 · 확률:중`

**구체 시나리오**
- Claude가 실제로 존재하지 않는 매체 ID("강남역 A-101") 추천
- 가격 1억을 5천만으로 답변 → 광고주 클레임 → 법적 분쟁
- 가용 기간 겹치지 않는 매체를 "예약 가능"으로 답변

**미티게이션**
1. **Tool use 강제**: LLM이 직접 가격·가용성을 "답변"하지 못함 — DB 쿼리 결과만 가공
2. **응답 검증 레이어** (§4.3.5): 모든 추천 매체 ID가 실제 DB 존재 여부 확인, 예산 범위·가용 기간 재검증
3. **환각 로깅**: 검증 실패 시 Sentry + 별도 `HallucinationLog` 테이블 → 매주 리뷰
4. **UI 투명성**: 모든 AI 답변 하단에 "이 정보는 DB를 확인하세요" + 관련 매체 카드 링크
5. **법적 보호**: 이용약관에 "AI 추천은 참고용, 최종 가격·가용성은 견적서 기준" 명시

**조기 경보 지표**: 환각 발생률 > 1% / 전체 추천

---

#### ⚠️ 리스크 4. 개인정보보호법 / PIPA 위반 `영향:치명 · 확률:중`

**구체 시나리오**
- 광고주 가입 시 마케팅 수신 동의를 필수 체크로 처리 (불법)
- 대행사 파트너에 광고주 정보 무단 공유
- AWS KMS 키 관리 실패로 암호화된 개인정보 유출

**미티게이션**
1. **동의 분리**: 가입·마케팅·3자 제공 동의를 **완전 분리**. 필수와 선택 명확히.
2. **AuditLog 전면 적용**: Admin의 개인정보 접근을 모두 기록 (actorId·target·timestamp·ip)
3. **데이터 내보내기 / 삭제 API**: PIPA 제35조·제36조 준수 — `GET /api/my/export`, `DELETE /api/my/account`
4. **암호화 저장**: 이름·전화·주소는 AES-256-GCM + KMS 키 회전
5. **법무 정기 감사**: 분기 1회 외부 법무 자문
6. **Phase 3 ISMS-P 인증 착수** (R11 + 보험 동시 가입)

**조기 경보 지표**: 개인정보 관련 민원 / 월 · 감사 로그 이상 패턴

---

#### ⚠️ 리스크 5. 매체사 온보딩 병목으로 재고 부족 `영향:높음 · 확률:높음`

**구체 시나리오**
- Phase 1 베타 출시 후 사용자는 몰리는데 매체 500개만 존재 → 재고 부족으로 이탈
- 매체사 가입·검증 과정이 3주+ 걸려 공급이 따라가지 못함
- 매체본부 인력은 제한적

**미티게이션**
1. **Pre-sprint에 기존 거래 매체사 200곳 CSV 일괄 등록** (매체본부 수작업)
2. **자동 지오코딩·자동 배지 초기값** (실사 전에도 등록·노출 가능, 배지 "pending")
3. **Phase 1 말 "Founders Program"**: 초기 매체사 20곳 수수료 3개월 면제 + 현장 실사 우선
4. **매체사 직접 입력**을 Phase 3가 아닌 **Phase 2 Sprint 7에 앞당김** (권한만 제한)
5. **재고 대시보드**: 주간 "매체사 가입 수 / 승인 수 / 등록 매체 수" KPI 경영진 공유

**조기 경보 지표**: 검색 결과 "결과 없음" 비율 > 10%

---

### 7.3 리스크 체크리스트 (경영진 월간 리뷰)

- [ ] 매체사 이탈 모니터링 (R1)
- [ ] Anthropic 월 비용 / MCC (R2)
- [ ] AI 환각 발생 건수 (R3)
- [ ] 개인정보 민원 · 감사 로그 (R4)
- [ ] 매체 재고 vs 트래픽 비율 (R5)
- [ ] 법무 자문 진행 상황 (분기)
- [ ] 보안 감사·ISMS-P 진도 (분기)

---

### 7.4 Phase 1 MVP를 가장 빠르고 효과적으로 출시하는 방법 (12주 실행 전략)

#### 원칙 — "Fake It Till You Make It, But Never Fake Data"

- **목표**: 2026-07-31 베타 출시
- **금기**: 공개 매체 경로는 **절대 mock 데이터 금지** (AGENTS.md · fetchPublicMediaCatalog DB-backed 유지)
- **허용**: UI 셸·플레이스홀더·관리자 내부 작업 우회

---

#### ⚡ 전략 1. "Concierge MVP"로 시작 — Assisted 트랙이 처음엔 수작업

**Self 티어는 완전 자동화**하되, **Assisted는 처음 2~3개월 매체본부 수작업**으로 운영.
이유: Assisted 트랙의 진짜 병목은 **"매체본부가 어떻게 리뷰하는가"의 SOP 정립**이다. 코드로 자동화하기 전에 사람 손으로 운영하며 패턴을 찾아야 한다.

**실행**
- 광고주가 "검수 추가" 체크 → Slack `#assist-queue` 채널 + 담당자 할당 (라운드 로빈 수동)
- 매체본부가 구글 시트에 리뷰 기록 → Phase 2에 `AssistReview` 모델로 코드화
- 2~3개월 후 패턴 정리되면 부분 자동화 (가용성 체크·단가 산정 자동)

**기대 효과**: Assisted 정책·품질 기준을 현장 데이터 기반으로 확립

---

#### ⚡ 전략 2. "데이터 3단 폴백"으로 유동인구·검증 데이터 부족 극복

Phase 1은 Full-Verified 매체 300개로 시작 → **13,000 매체는 "배지 Pending"** 상태. 이걸 어떻게 보일 것인가?

**3단 폴백**
1. **Verified (Gold/Silver/Bronze)**: 실사 완료 + 배지
2. **Pending**: 매체본부 실사 대기 — "검증 요청 가능" 뱃지 + 신청 폼
3. **Self-reported**: 매체사 자체 등록 (Phase 2 포털 오픈 후) — "매체사 정보" 뱃지

이 구분을 **Verified Only 필터**(D1)로 숨길 수 있게 해, 신중한 광고주는 300개만 보고 광범위 탐색자는 전체를 본다.

---

#### ⚡ 전략 3. "스프린트 0 병렬 트랙" — 출시 전 4주를 3개 팀이 병렬 실행

Sprint 1 시작 전(Pre-sprint 10일 + Sprint 1) 4주간 **3개 독립 트랙 병렬**:

| 트랙 | 담당 | 산출물 |
|---|---|---|
| **Track A — Infra** | BE 2명 + DevOps | 인증·DB 마이그레이션·CI/CD·Sentry·Redis |
| **Track B — Design System** | 디자인·FE 1 | Figma → shadcn 컴포넌트·색·폰트·Tailwind 토큰 |
| **Track C — Data** | 매체본부 + BE 1 | 기존 매체 200곳 CSV 마이그레이션·검증 배지 시드 30곳 |

4주차에 3트랙 합류 → Sprint 2(지도 MVP)부터 **전속력 기능 개발 가능**.

---

#### ⚡ 전략 4. "베타 사용자 30명 사전 섭외"

**공개 모집이 아닌 Founders 프로그램**:
- 기존 THINKAD 거래 광고주 20명 + 대행사 파트너 10곳 직접 초청
- **베타 3개월 수수료 면제** + **"Founding Customer" 영구 뱃지**
- 주 1회 PM 직접 피드백 콜 (30분)
- Notion 공개 로드맵 + 기능 투표

**기대 효과**
- Sprint 6 종료 직후 **MCC 20건 즉시 달성** (실제 캠페인 기반)
- NPS·피드백 정성 데이터 확보
- 베타 종료 후 성공 사례 3~5건 자동 확보 → 마케팅 자산

---

#### ⚡ 전략 5. "엔드투엔드 E2E 먼저 · 유닛 테스트는 핵심만"

12주 안에 품질과 속도 둘 다 잡으려면:
- **Playwright E2E**: Flow A 전체(랜딩→지도→플래너→제안서→결제)를 Sprint 3부터 **반드시 통과**하는 GitHub Actions 게이트
- **Vitest 유닛**: PDF 렌더링·검증 점수 계산·유동인구 지오해시 등 **핵심 로직만**
- **Storybook**: 디자인 시스템 컴포넌트만 (화면 전체 아님)

**근거**: 단기간 MVP에선 "기능 하나가 망가져도 플로우 전체는 돈다"가 중요. 유닛 100% 커버리지보다 E2E 3~5개 시나리오 100% 통과가 훨씬 가치 있음.

---

#### ⚡ 전략 6. "Feature Flag 기반 점진 공개" — 베타 내 A/B 테스트

- `FeatureFlag` 테이블을 Pre-sprint에 도입 (Phase 2 로드맵 원래 일정보다 앞당김)
- 베타 30명을 2그룹으로 랜덤 분할
  - A: Verified Only 기본 ON
  - B: 기본 OFF
- 2주 후 MCC·제안서 전환율 비교 → 데이터 기반 기본값 확정

동일 방식으로 Self vs Assisted 기본 선택, 플래너 자동 저장 on/off 등 테스트.

---

#### ⚡ 전략 7. "랜딩은 유지, 플랫폼 진입을 강화"

현재 랜딩이 "매우 잘 다듬어진 마케팅 페이지"라는 점은 **강점**. 재작업 금지.

대신:
- Hero CTA를 **"매체 찾기" / "AI 플래너로 시작"** 2개로 재배치
- Hero 하단에 Verified Only 토글 + "검증 매체만 342개" 라이브 숫자
- 스크롤 진입 시 **"최근 30일 MCC: 20건 · 베타 참여자 147명 증가 중"** 실시간 배지
- TOP3 매체 실시간 인기 섹션 신설

**랜딩 개선만으로도 플랫폼 진입율 +30% 기대**

---

### 7.5 종합 체크리스트 — 베타 출시 4주 전 (2026-07-01) 점검

**기술**
- [ ] Sprint 1~5 모든 P0 AC 통과
- [ ] Playwright Flow A E2E 95%+ 통과
- [ ] Lighthouse Performance ≥ 85 (모바일)
- [ ] Sentry 에러율 < 1%
- [ ] PDF 생성 p95 < 30초
- [ ] Claude 추천 p95 < 10초
- [ ] Kakao Map 1,000 매체 60fps

**제품·운영**
- [ ] Verified 매체 300개 시드 완료
- [ ] 결제 (Toss) 실제 결제 테스트 통과
- [ ] 전자서명 (모두싸인) 계약서 템플릿 확정
- [ ] 매체본부 Assisted SOP 문서화
- [ ] 베타 30명 섭외 완료

**법무·컴플라이언스**
- [ ] 개인정보처리방침 v2026 확정
- [ ] 이용약관 (셀프·대행사 각각) 검토
- [ ] 전자상거래법 고지 (청약철회 예외 포함)
- [ ] 전자서명법 검토 (무결성 보증)
- [ ] PIPA 동의 분리 UI 최종 확인

**마케팅**
- [ ] `/changelog` 초기 콘텐츠
- [ ] Founders 프로그램 초청 메일
- [ ] 베타 런칭 공식 보도자료
- [ ] LinkedIn / 업계 커뮤니티 티저 3건

---

### 7.6 한 줄 요약 — 이 문서의 핵심 메시지

> **"THINKAD의 진짜 경쟁력은 '현장 검증 조직'이라는 물리적 자산이다. 이것을 배지·PDF·필터·리포트로 디지털화하여 플랫폼 곳곳에서 보여주는 것 — 이게 HOO가 절대 복제할 수 없는 해자를 만드는 유일한 길이다. 자동화·속도는 HOO도 따라올 수 있지만, 검증팀은 따라올 수 없다."**

---

### 부록 A — 용어 정의

- **OOH**: Out-of-Home advertising (옥외광고)
- **DOOH**: Digital Out-of-Home
- **CPM**: Cost per Mille (1,000회 노출당 비용)
- **MCC**: Monthly Confirmed Campaigns (월간 결제 확정 캠페인)
- **GMV**: Gross Merchandise Value (총거래액)
- **Take Rate**: GMV 중 THINKAD 수익 비율
- **HOO**: House of OOH (경쟁 마켓플레이스)
- **JTBD**: Jobs-to-be-Done
- **4단계 검증**: 입지 · 가시성 · 조도 · 경쟁매체
- **3-Tier 서비스**: Self / Assisted / Full-Service
- **PWA**: Progressive Web App

### 부록 B — 관련 문서

- `docs/THINKAD-PLATFORM-PRD.md` (v1, 1,410줄, 역사적 레퍼런스)
- `docs/deployment-checklist.md`
- `docs/e2e-test-scenarios.md`
- `docs/page-design-and-media-search-spec.md`
- `AGENTS.md` (Next.js 16 breaking change 룰)
- `CLAUDE.md` (프로젝트 지침)

---

> **문서 작성일**: 2026-04-20
> **버전**: v2.0 (7섹션 통합 제품 기획 · 전면 재작성)
> **다음 리뷰**: Phase 1 Sprint 3 완료 시점 (2026-06-중순)
> **담당**: Product Team





















