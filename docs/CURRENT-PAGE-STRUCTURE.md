# CURRENT PAGE STRUCTURE — 변경 금지 가이드

작성일: 2026-04-26
기준 커밋: `b930b10` (현재 main HEAD = `4d90ab2` 가 가리키는 동일 코드)
목적: 디자인 시스템(토큰/컴포넌트) 점진 적용 시 **IA(섹션 순서·데이터 소스·인터랙션)는 절대 변경하지 않는다**는 기준선을 명시.

이 문서를 위반하는 변경은 디자인 PR 에 포함하지 말 것.
- ✅ 허용: 색/타이포/간격/모서리/그림자/모션/아이콘 스타일
- ❌ 금지: 섹션 순서 변경, 섹션 추가/삭제, 데이터 소스 교체, 인터랙션 변경, 라우트/쿼리 파라미터 변경, localStorage 키 변경, API endpoint 변경

---

## 0. 공통 레이아웃 (전 페이지 공통)

- **`app/[locale]/layout.tsx`** 가 `BrutalNav` (헤더) + `BrutalFooter` (푸터) 를 모든 locale 페이지에 래핑.
- 헤더 IA (b930b10 기준):
  - 매체 검색 그룹: `/media`, `/media/map`, `/media/network`, `/media/keyword-filter`
  - 트렌드 & 학습 그룹: `/cases`, `/insights`, `/academy`
  - 솔루션 그룹: `/recommend`, `/planner`, `/compare`, `/quote`
  - 회사: `/services`, `/contact`
- 모바일 햄버거 = 동일 메뉴 시트.
- i18n: `next-intl`, `[locale]` = `ko` | `en`. 한국어 기본.

---

## 1. 메인 (`/[locale]`)

파일: `app/[locale]/page.tsx` (서버 컴포넌트, 496줄)

### 섹션 순서 (위→아래)
1. **Hero** (풀뷰포트)
2. **검증 프로세스 4단계** (싱커드만의 4단계 매체 검증)
3. **추천 매체 TOP 3** (싱커드 추천 매체 TOP 3)
4. **인기 매체** (지금 가장 주목받는 매체) — 데이터 비어있으면 비표시
5. **왜 싱커드인가?** (3 카드: Eye / BarChart3 / FileCheck)
6. **광고주가 직접 전하는 이야기** (테스티모니얼 캐러셀)
7. **CTA Banner** (hero-bg, /contact 유도)

### 컴포넌트
- 1: `<HeroKenBurns />` (dynamic, client) + `<Button />` × 2 (CTA)
- 2: `<ScrollAnimate />` + `<ProcessStepImage />` + 4개 카드 (1col → 2col → 4col)
- 3: `<HomeMediaCarousel variant="featured" />`
- 4: `<HomeMediaCarousel variant="popular" />`
- 5: `<Card />` × 3 (`<ScrollAnimate />` 래핑)
- 6: `<TestimonialsCarousel />`
- 7: `<ScrollAnimate />` + `<Button />` (CTA)

### 데이터 소스
- 추천 매체: `fetchHomeFeaturedMedia(8)` (Prisma `Media.isFeatured`, `featuredOrder`)
- 인기 매체: `fetchHomePopularMedia(12)` (Prisma `Media.isPopular`, `popularOrder`) — featured 와 dedupe
- 테스티모니얼: `data/testimonials` (정적)
- 카피/CTA 텍스트: `next-intl` 메시지

### 주요 인터랙션
- Hero CTA 2개: 상담신청(`/contact`), 매체검색(`/media`)
- 매체 캐러셀: 가로 스크롤 + 카드 클릭 → `/media/[id]`
- "전체 매체" 링크 → `/media`
- 하단 CTA → `/contact`

### 모바일/데스크탑 차이
- 검증 프로세스 그리드: `1col → 2col(md) → 4col(lg)`. 데스크탑(`lg`+) 에서만 가로 타임라인 라인 표시
- CTA 버튼: 모바일 풀폭, 데스크탑 자동폭
- 캐러셀: 모바일/데스크탑 동일 (가로 스크롤)

---

## 2. 매체 검색 (`/[locale]/media`)

파일:
- 서버: `app/[locale]/media/page.tsx` (9줄, shell)
- 클라이언트: `components/media-browse-client.tsx` (메인 로직)

### 섹션 순서 (위→아래)
1. **Hero Search Section** (네이비 배경): 제목 "매체 검색" + 설명 + 검색 인풋 + CTA "맞춤형 OOH 캠페인 제안 받기"
2. **Tab Switch**: Search ↔ AI 토글 pill
3. **Advanced Filters Panel** (조건부 / 접힘):
   - 데스크탑(`lg`+): 인라인 박스
   - 모바일(`<lg`): 바텀 시트(`<Sheet side="bottom" />`)
4. **Results Summary Bar**: 결과 수 + 활성 키워드 뱃지 + 정렬 드롭다운 + 브라우즈 모드 토글(list/map) + 카드 레이아웃 토글(grid/compact) + per-page 셀렉트 + "전체선택"/"전체삭제" + 검증 뱃지
5. **Filter Status Messages** (조건부): precision relaxed (amber) / lenient search (indigo) / min padding (emerald) / empty state
6. **결과 영역**:
   - List 모드: `MediaCatalogGridCard` 그리드 또는 `MediaCatalogCompactLinkRow` 리스트
   - Map 모드: `<MediaBrowseMap />` (dynamic, ssr:false) + 선택 시 팝업(썸네일 + 3 CTA)
7. **Pagination** (List 모드만): Prev/Next + "X-Y of Z"
8. **Recently Viewed Media** (가로 캐러셀, dynamic, ssr:false)
9. **Compare Bar** (sticky bottom, dynamic, ssr:false)

### 컴포넌트
- `<MediaKeywordSearchHero />`, `<SolutionCtaButton />`
- `<MediaPrecisionFiltersAssistant />`, `<SheetContent />`
- `<PerPageSelect />`, `<MediaCatalogGridCompactToggle />`
- `<MediaCatalogGridCard />`, `<MediaCatalogCompactLinkRow />`
- `<MediaBrowseMap />`, `<RecentlyViewedMedia />`, `<CompareBar />`
- 그리드 클래스 상수: `MEDIA_CATALOG_GRID_CLASS`, `MEDIA_CATALOG_COMPACT_GRID_CLASS`, `FLOATING_SELECTION_BAR_BOTTOM_SPACER_CLASS`

### 데이터 소스
- 카탈로그: `fetchPublicMediaCatalog()` (lib/public-media-catalog) — DB 진실 (CLAUDE.md mock 금지 규칙 적용)
- 필터 상태: `useMediaCatalogFilters()` (lib/use-media-catalog-filters) — localStorage 영속
- localStorage 키:
  - `mediaBrowseMode` (list/map)
  - `mediaCatalogLayout` (grid/compact)
  - 비교 카트(별도 store)
  - 최근 본 매체 ID 배열
- 매칭 함수: `matchesMediaTextQuery()`, `passesMediaAdvancedFilters()`, `passesMediaPrecisionFilters()`

### 주요 인터랙션
- 키워드 검색 (200ms 디바운스)
- Advanced filter 토글 (모바일=시트, 데스크탑=인라인)
- 정렬: default / newest / priceAsc / priceDesc / trafficDesc
- 브라우즈 모드 토글: list ↔ map
- 카드 레이아웃 토글: grid ↔ compact (list 모드만)
- per-page 셀렉트: 12 / 24 / 48
- 카드 체크박스 → 비교 카트 토글 (max 4)
- 맵 팝업 3 CTA (Detail / Compare / Quote)
- 페이지네이션 prev/next

### 모바일/데스크탑 차이
- Advanced filters: 모바일=바텀 시트, 데스크탑=인라인 박스
- 그리드 컬럼: `1 → 2(md) → 3(lg) → 4+(xl)`
- Compare bar: sticky bottom 양쪽 동일 (모바일은 컴팩트 레이아웃)

---

## 3. 매체 상세 (`/[locale]/media/[id]`)

파일: `app/[locale]/media/[id]/page.tsx` (서버 컴포넌트, 929줄)

### 섹션 순서 (위→아래)
1. **Hero Gallery** (풀폭 + 다크 오버레이):
   - 좌상단 "돌아가기" 버튼
   - 우상단 admin actions (조건부)
   - 좌측: h1 매체명, 가용성 뱃지, 시인성 뱃지, hero 태그(size/type/targetAge), 위치+타입+features
   - 우측 aside (라운드 박스, 다크 bg): 2×2 `CoreFact` (가격 / 월 통행량) + `MediaStickyCta` 버튼
2. **Sticky Info Bar** (모바일=fixed top, 데스크탑=static): 체크 아이콘 + 힌트 "관심 가는 매체라면 견적서에 담아보세요" + 즐겨찾기 + 카트 추가
3. **Main Content Section** (`bg-background`):
   - **Extras**: 주소 + Kakao/Google maps 임베드 + 지역 라벨
   - **Roadview Card** (lat/lng 있을 때만)
   - **Premium Points** (keywordFilter 있을 때만)
   - **Keyword Search Hints** (keywordFilter 있을 때만)
   - **Core Info** (h2 + 2×2 그리드: Size / Resolution / Price / Foot Traffic)
   - **Price Options** (priceOptions 있을 때만; 카드 그리드)
   - **Specs** (h2 + dl 2-col: brightness, operating hours, install year, target age, status, exposureTime, duration)
   - **Performance Metrics** (`<MediaDetailPerformance />`)
   - **Traffic Charts** (`<TrafficCharts />` — trafficPattern 있으면 실제, 없으면 추정 + "추정치" 뱃지)
   - **Description Section** (border-t):
     - h3 "배치 위치 및 개요"
     - h3 "광고 집행 이력"
     - h3 "주변 시설"
     - h3 "효과 메모" (`<EffectMemoCallout />` 박스 포함)
   - **Related Cases** (relatedCases 있으면)
   - **Case Study Gallery** (caseStudyItems 있으면; 라이트박스)
   - **Similar Media Carousel** (`<MediaSimilarCarousel sortable />`)
4. **Sticky CTA**: 모바일 = `<MediaDetailStickyCta />` (fixed bottom), 데스크탑 = `<components/media-detail/sticky-cta />`. 3종: Planner / 비교 / 견적

### 데이터 소스
- 메인: `resolveMediaForDetail(id)` (lib/public-media-catalog)
- 유사 매체용: `fetchPublicMediaCatalog()`
- 사례: `getSuccessCasesForMedia(media.id)` (lib/public-content-queries)
- 성능: `resolvePerformanceMetrics(media)` (lib/media-performance)
- 갤러리: `buildCaseStudyGalleryItems()`, `getMediaDetailGalleryUrls()` (lib/media-data)
- 트래픽 추정: `lib/media-traffic-estimate.ts` (DB `Media.trafficPattern` JSONB 미입력 시 폴백)
- SEO JSON-LD: `buildMediaPlaceJsonLd`, `buildMediaBreadcrumbJsonLd` (lib/structured-data)

### 주요 인터랙션
- 갤러리 라이트박스
- 즐겨찾기 토글 (`<MediaFavoriteButton />`)
- 카트 추가 (`<MediaDetailAddToCart />`)
- 맵/로드뷰 임베드 (사용자 클릭 후 iframe 로드 — 성능)
- 비슷한 매체 정렬 토글 (score / distance / price / visibility)
- Sticky CTA: Planner 진입은 `/planner?addMedia=<id>` 패턴 — 변경 금지

### 모바일/데스크탑 차이
- Sticky info bar: 모바일 fixed top (top:72px), 데스크탑 static
- Sticky CTA: 모바일 fixed bottom, 데스크탑 = `components/media-detail/sticky-cta.tsx`
- Core Info / Price Options 그리드: 모바일 1col, 데스크탑 2col
- 설명 prose: 모바일 풀폭, 데스크탑 max-width 제약

---

## 4. AI 추천 (`/[locale]/recommend`)

파일:
- 서버: `app/[locale]/recommend/page.tsx` (9줄)
- 클라이언트: `app/[locale]/recommend/recommend-page-client.tsx` (387줄)

### 페이즈(=섹션) 순서 (위→아래)
페이지 상태 머신: `phase: "form" → "loading" → "dashboard" | "noResults" → "list"`

1. **Hero Section**: "AI 매체 탐험가" 뱃지 + 제목 "TKAD Bot과 함께 매체 탐험 시작!" + 부제
2. **Form Phase** (`phase === "form"`): `<MediaAiRecommendForm />` (입력 폼)
3. **Loading Overlay** (`phase === "loading"`): 6단계 진행 메시지 + 애니메이션 그라디언트 바 + "TKAD bot" 이모지 아바타
4. **Dashboard Phase** (`phase === "dashboard"`): `<MediaAiRecommendDashboard />` (TOP 3 + 상세 분석)
5. **No Results Fallback** (`phase === "noResults"`): amber alert 카드 + "Back to Form" 버튼
6. **Full List Phase** (`phase === "list"`): 결과 수 + Back 버튼 + TOP 3 하이라이트 박스 + 결과 카드 그리드(2col)
7. **Sticky Cart Bar**: `<RecommendCartBar />` (dynamic, ssr:false) — bottom sticky

### 데이터 소스
- 카탈로그: `fetchPublicMediaCatalog()` (서버에서 prefetch → 클라이언트로 전달)
- 스코어링: `recommendMedia(input, baseCatalog, paddingSource)` (lib/ai-media-recommend) → `ScoredMedia[]`
- 헬퍼: `filterCatalogByRegionCodes()`, `matchesMediaTextQuery()`, `mediaItemDetailPath()`
- 카트 상태: 로컬 `useState<MediaItem[]>` (max 12)
- i18n: `useTranslations("recommend")`

### 주요 인터랙션
- Form submit → `runAnalysis()` (900ms 지연 후 phase 전환)
- Remix 버튼: 예산 +10% 후 재실행
- Add to cart (Dashboard 내부): max 12
- View full list: phase = "list"
- Quote 진입: `/quote?media=<id1>,<id2>...`

### 모바일/데스크탑 차이
- Cart bar: bottom sticky (비어있으면 hidden, h-20 spacer)
- Form: 풀폭, 반응형 텍스트
- 결과 그리드: 모바일 1col, 데스크탑 2col (`sm:grid-cols-2`)

### 변경 금지 포인트
- 페이즈 머신 5단계(form/loading/dashboard/noResults/list) 순서/이름
- 카트 max 12
- Quote 진입 쿼리 형식 `?media=id1,id2,...`

---

## 5. 플래너 (`/[locale]/planner`)

파일:
- 서버: `app/[locale]/planner/page.tsx` (21줄)
- 클라이언트: `app/[locale]/planner/planner-page-client.tsx` (1331줄)
- 공유 페이지: `app/[locale]/planner/shared/[id]/page.tsx`

### 아키텍처
- 상태: Zustand `lib/planner/store.ts` (`usePlannerStore`)
- localStorage key: **`tkad-planner-plan-v2`** (절대 변경 금지)
- persist 대상: `campaignGoal, regions, categories, budget, months, ageKey, industryKey, campaignMediaIds, creativeUploadedUrl, mediaPlacements`
- non-persist: `wizardStep`, `creativeObjectUrl`
- 단계 상수 (`lib/planner/types.ts`): `PLANNER_LAST_INPUT_STEP = 6`, `PLANNER_RESULT_STEP = 7`
- 검증: `canProceedFromStep()` (`lib/planner/validation.ts`) — 단계 변경 시 반드시 경유
- 추천: `lib/planner/recommend.ts` 5가중치 스코어링 (`WEIGHTS_BY_GOAL`)

### 7 단계 순서 (고정)

#### Step 1 — 캠페인 목표
- 컴포넌트: `<PlannerCampaignStep1 />`
- 입력: 5개 goal 버튼 (brand, launch, event, sales, local)
- 저장: `campaignGoal`

#### Step 2 — 타깃·지역
- 컴포넌트: `<PlannerRegionMap />` + 카테고리 토글 + 프리셋 카드 + age/industry 버튼 그룹
- 입력:
  - **Categories** (≥1): catDigital / catStatic / catMobile
  - **Regions** (≥1): 인터랙티브 맵
  - **Presets**: premium / national / value (카테고리·지역 묶음)
  - **Age**: `PLANNER_AGE_KEYS` (ageAll, age20s, age30s, age40s, age50plus 등)
  - **Industry**: `PLANNER_INDUSTRY_KEYS` (indFb, indRetail, indTech, indFinance, indEnt, indOther)
- 저장: categories, regions, ageKey, industryKey

#### Step 3 — 예산·기간
- 컴포넌트: 카드 + 예산 슬라이더 + 입력 + 기간 버튼
- 입력:
  - 예산 슬라이더: min 500, max 100,000 (만원), step 500
  - 예산 텍스트 인풋 (₩ prefix, `selectBudgetNum()` 정규화)
  - 기간 버튼: `PLANNER_PERIOD_OPTIONS` (1 / 3 / 6 개월)
  - 예산 blurb (필터된 매체 ≥1 시 샘플 계산 표시)
- 저장: budget (string), months (number)

#### Step 4 — 매체 선택
- 컴포넌트: `<PlannerRecommendationPanel />` (AI 추천) + `<PlannerMediaSelector />` (매체 그리드)
- 입력: 카테고리 + 지역 + 예산 필터된 매체에서 체크박스 선택; 선택 순서 보존 (`campaignMediaIds[]`)
- 쿼리 진입: `?addMedia=<id>` 자동 추가 + step 4 점프

#### Step 5 — 로고 + 합성 미리보기
- 컴포넌트: `<PlannerSimulationStep3 />` + `<components/planner/composite-preview.tsx />`
- 입력: 파일 업로드(드래그/클릭) → Cloudinary signed upload (`/api/planner/creative/sign`, 폴더 `tkad/planner/creative`) → CSS 오버레이 기반 드래그/리사이즈로 매체별 좌표 저장
- 저장: `creativeObjectUrl` (세션 한정 Object URL), `creativeUploadedUrl` (Cloudinary), `mediaPlacements: Record<mediaId, CompositeLogoPlacement>`
- 업로드 헬퍼: `lib/planner/creative-upload.ts`

#### Step 6 — 보고서
- 컴포넌트: `<PlannerReportStep />`, `<PlannerReportPdfCompact />`, `<PlannerReportPreview />` (logoUrl + mediaPlacements 전달, 썸네일에 합성 로고 포함)
- PDF: `lib/html-to-pdf.ts` (html2canvas + jsPDF, onclone 색상 정규화)
- "View Effect Dashboard" 버튼 → Step 7

#### Step 7 — 결과 대시보드 (PLANNER_RESULT_STEP, 입력 단계 아님)
- 차트 7종:
  - `<PlannerImpressionsLineChart />` (월별 누적 노출)
  - `<PlannerRoiLineChart />` (3 시나리오: conservative/expected/optimistic)
  - `<PlannerDailyReachBarChart />` (카테고리별 일일 노출)
  - `<PlannerReachDonutChart />` (코어 % / 확장 %)
  - `<PlannerBudgetPieChart />` (카테고리별 예산 비율)
  - `<PlannerCpmCompareChart />` (카테고리별 CPM)
  - `<PlannerMonthCompareChart />` (1/3/6개월 총 노출)
- KPIs: Impressions / Reach (impressions × 0.75) / CPM / ROI (expected)
- Portfolio 그리드: 합성 미리보기 포함된 매체 카드 3/6개
- CTAs: "Save Plan" (POST `/api/planner/save`) + "Quote with Plan" + "Contact"
- Save: Prisma `SavedPlannerPlan` (30일 TTL); 성공 시 emerald 배너에 만료일 + 클립보드 자동 복사
- 공개 공유: `/api/planner/shared/[id]`, `/[locale]/planner/shared/[id]`

### 공통 UI
- `<PlannerStepper />`: Steps 1–6 만 표시 (Step 7 에서는 숨김)
- `<PlannerTips />`: 단계별 tipKey 매핑 (`components/planner-tips.tsx`) — 단계 순서 변경 시 동기화 필수

### 주요 인터랙션
- 단계 변경 시 `canProceedFromStep()` 검증 후 `goNext()`/`goBack()` (스크롤 top)
- Step 1: goal 필수
- Step 2: regions ≥1 + categories ≥1 + age + industry
- Step 3: budget ≥ `PLANNER_BUDGET_MIN` (500)
- Step 4: 쿼리 자동 추가 + 수동 선택
- Step 7: "Edit Inputs" → Step 2 로 복귀; Save/Quote/Contact CTA

### 모바일/데스크탑 차이
- Stepper Step 7 에서 숨김
- Step 4/5/6: `max-w-6xl`, Step 1~3: `max-w-3xl`
- 차트 그리드: 1col → 2col (`sm`) → 3col (`lg`) (차트 종류별 상이)
- CTA: `flex-col-reverse → sm:flex-row justify-between`

### 변경 금지 포인트
- 7 단계 순서/번호/`PLANNER_LAST_INPUT_STEP=6`, `PLANNER_RESULT_STEP=7`
- localStorage key `tkad-planner-plan-v2`
- API: `/api/planner/save`, `/api/planner/shared/[id]`, `/api/planner/creative/sign`
- 쿼리 진입 `?addMedia=<id>`
- Cloudinary 폴더 `tkad/planner/creative`

---

## 6. 비교 (`/[locale]/compare`)

파일: `app/[locale]/compare/page.tsx` (39줄, 서버) + `components/compare-spec-table.tsx` 등

### 섹션 순서 (위→아래)
1. **Hero**: 제목 "매체 비교" + "BETA" 뱃지 + 부제
2. **Card Grid** (그리드/컴팩트 레이아웃 토글): `<MediaCatalogGridCard />` 또는 `<MediaCatalogCompactLinkRow />`
3. **Spec Table**: `<CompareSpecTable />` (PDF/이미지 캡처 ref 래핑)
4. **CTA Row**: "Request Quote" + "Download PDF" + "Save Image" 버튼

### 데이터 소스
- 서버 prefetch: `fetchPublicMediaCatalog()`; `?ids=` 쿼리 없으면 랜덤 12
- localStorage 카트 키: **`tkad-compare-cart-v1`** (변경 금지)
- 진입 패턴: `/compare?ids=<id1>,<id2>,...`
- Export 헬퍼: `downloadPdfFromHtmlElement()`, `captureElementAsPng()` (lib/html-to-pdf)

### Spec Table 행 구조 (순서 고정)
각 행: `key, label, cell, numVal, better("higher"|"lower")`. 행 순서:
`price → size → foot → impressions → cpm → visibility → targetAge → region → availability`

#### Diff highlighting
- `getBestIdx()`: 행별 단일 최적값 인덱스 계산 (better=higher 면 최대, lower 면 최소)
- 동률(2+ 동값) 시 하이라이트 없음
- 베스트 셀: 상단 컬러 바(gold/emerald/sky) + 강조
- 행 배경: white / slate-50 alternating

### 주요 인터랙션
- 레이아웃 토글: Grid (3col) ↔ Compact (테이블형 row)
- Quote 링크: `/quote?media=<ids>` (전체 사전선택)
- PDF 다운로드: `comparePdfRef` → `thinkad-media-compare-<date>.pdf`
- 이미지 캡처: PNG → `싱커드_매체비교_<dateNoHyphen>.png`
- 매체명 클릭 → `/media/<id>`
- 스펙 테이블 헤더 "Planner 시작" 칩 → `/planner?addMedia=<id>`

### 모바일/데스크탑 차이
- 카드 그리드: 모바일 1col → `sm` 2col → `lg` 3col
- Compact 그리드: 풀폭 row
- CTA 버튼: `flex-col → sm:flex-row` 중앙 정렬
- Spec table: 좌측 메트릭명 컬럼 sticky, 모바일 가로 스크롤

### Empty State
- 선택된 매체 < 2 개: "2개 이상 선택" 메시지 + `/media` 링크

### 변경 금지 포인트
- localStorage `tkad-compare-cart-v1`
- 진입 쿼리 `?ids=...`
- Spec table 행 순서 9개
- Diff 하이라이트 규칙(단일 최적값, 동률 비강조)

---

## 7. 사례 (`/[locale]/cases`)

파일:
- 서버: `app/[locale]/cases/page.tsx` (7줄, shell)
- 클라이언트: `app/[locale]/cases/cases-page-client.tsx` (328줄)
- 상세: `app/[locale]/cases/[slug]/` (page.tsx, case-detail-client.tsx, layout.tsx, opengraph-image.tsx)

### 섹션 순서 (위→아래)
1. **Hero Banner** (네이비 배경, "BETA" 뱃지 + 제목 + 부제) — 빈 상태/일반 상태 둘 다 노출
2. **(빈 상태 전용) Report Features** — 3카드 그리드, 베네핏 설명
3. **(빈 상태 전용) Sample Report Preview** — 점선 보더 목업 카드
4. **(빈 상태 전용) CTA** — "요청하기" gold 버튼 → `/quote`
5. **List Intro Text** (사례 존재 시)
6. **Filters Section**:
   - 산업 필터 버튼 (데이터에서 자동 생성, 한국어 정렬)
   - 검색 인풋 + 아이콘 + 리셋 버튼
   - 결과 수 텍스트
7. **Cases Grid** — `md:2col / lg:3col`, 카드 호버 lift
   - 카드 구성: 썸네일(또는 `<TrendingUp />` 아이콘) / 산업 뱃지(우상단) / 제목 / 요약 / 매체 칩
   - 액션 2개: "상세 보기" (gold) → `/cases/[slug]`, "유사 사례" (outline) → `/contact?case=[id]`
8. **Bottom CTA** — 네이비/골드 그라디언트 박스 + "전문가와 상담" → `/contact`

### 데이터 소스
- 서버: `getPublishedSuccessCases()` → `PublicSuccessCaseListItem[]`
- 매체 매핑: `SuccessCase.mediaIds: String[]` ↔ `getSuccessCasesForMedia()` (양방향)
- 카피: i18n

### 주요 인터랙션
- 산업 필터(state) + 텍스트 검색(실시간) 콤보 필터
- 리셋 버튼
- 카드 클릭 → `/cases/[slug]`
- "유사 사례" → `/contact?case=[id]`

### 모바일/데스크탑 차이
- 그리드: `md:2col → lg:3col`
- 검색 박스: `flex-col → sm:flex-row`

### 변경 금지 포인트
- 슬러그 라우팅 `/cases/[slug]`
- "유사 사례" 진입 쿼리 `?case=[id]`
- 빈 상태 4섹션 구성

---

## 8. 트렌드 리포트 (`/[locale]/insights`)

파일:
- 서버: `app/[locale]/insights/page.tsx` (9줄, force-dynamic)
- 클라이언트: `app/[locale]/insights/insights-page-client.tsx` (584줄)
- 상세: `app/[locale]/insights/[slug]/page.tsx` (PR #53 — AI 자동 발행 시스템 — 변경 금지)

### 섹션 순서 (위→아래)
1. **Hero Banner** (네이비) — "Monthly · Quarterly" + "OOH" + "BETA" 뱃지 + 제목 + 부제
2. **Value Strip** — 3-col 그리드, 호버 효과:
   - Trends (앵커 `#reports`)
   - PDF Download (앵커 `#reports`)
   - Custom Request (앵커 `#custom-report`)
3. **Reports Section** (`id="reports"`, `scroll-mt-24`):
   - 빈 상태: "파일을 준비 중입니다" 카드
   - 정상:
     - Period 필터 탭: All / Monthly / Quarterly
     - Vertical 필터 탭: All / Fashion / Auto / FB
     - 결과 수
     - **Grid 2-col** `<ReportCard />` (flex-col):
       - 헤더: Period 뱃지(navy) + Label 뱃지(outline) + Vertical 태그(gold/navy)
       - 제목 + 발행 ISO 날짜
       - 요약(BarChart 아이콘 + 불릿)
       - DOOH 미리보기(MonitorPlay 아이콘)
       - Vertical 블록(BookOpen 아이콘)
       - 버튼 2개: "다운로드 PDF" (gold) + "보기" (outline; slug 있으면 `/insights/[slug]`, 없으면 모달)
4. **Custom Request Form** (`id="custom-report"`, `scroll-mt-24`):
   - Send 아이콘 + Card
   - 2-col 폼: Company / Email / Industry select / Period preference select / Notes textarea
   - Submit (navy) + `/contact` 링크 (outline)
5. **PDF Viewer Modal** — slug 없는 리포트는 iframe + PDF blob 모달

### 데이터 소스
- 서버: `getPublishedInsightReports()` (force-dynamic)
- 자동 발행 시스템 (HANDOFF-insights-2026-04-25.md PR #49~53):
  - Cron: `vercel.json` 월/목 09:00 KST
  - API: `/api/cron/generate-trend-report`, `/api/admin/ai/validate-trend-report`
  - 검증: `lib/insights/validators/auto-validator.ts` (4축 25점)
  - 알림: `lib/insights/notifiers/slack.ts`
  - 외부 출처: `lib/insights/sources/tavily.ts`, `lib/insights/sources/internal.ts`
  - 마크다운 렌더: `components/insights/markdown-body.tsx`
  - AI 배너: `components/insights/ai-generation-banner.tsx`
  - 출처: `components/insights/sources-section.tsx`
- RSS: `app/feed.xml/route.ts`
- Sitemap: `app/sitemap.ts` (slug 동적 포함)

### 주요 인터랙션
- Period 필터 + Vertical 필터 (클라이언트 콤보)
- PDF 다운로드 (토스트)
- "보기": slug 있으면 라우팅, 없으면 모달
- Custom request 폼 검증 + submit (토스트)

### 모바일/데스크탑 차이
- 리스트 그리드: 2col 유지
- 폼: `sm:grid-cols-2` 스택
- 필터 버튼: 줄바꿈

### 변경 금지 포인트
- AI 자동 발행 인프라 (cron, validator, slack, sitemap, rss) 절대 변경 금지
- `/insights/[slug]` 라우트 + JSON-LD
- `/feed.xml` Content-Type
- 앵커 `#reports`, `#custom-report`

---

## 9. 아카데미 (`/[locale]/academy`)

파일:
- 서버: `app/[locale]/academy/page.tsx` (9줄, force-dynamic)
- 클라이언트: `app/[locale]/academy/academy-page-client.tsx` (537줄)

### 섹션 순서 (위→아래)
1. **Hero Banner** — 네이비, GraduationCap 아이콘 + "BETA" 뱃지 + 제목 + 부제
2. **Value Strip** — 4-col 그리드, 앵커 링크:
   - Basics (`#academy-basics`)
   - Webinars
   - Downloads (`#academy-downloads`)
   - Consultation (`#academy-consult`)
3. **Academy Basics** (`id="academy-basics"`, `scroll-mt-24`):
   - 빈 상태: "아카데미 강의를 준비 중입니다"
   - 정상: 3-col 그리드 `<LessonCard />`
     - 듀레이션 뱃지(gold outline) + 제목 + 설명 + "비디오 보기" (outline) + "개요 다운로드" (gold)
     - 비디오 클릭 → 모달(iframe)
4. **Academy Webinars** — 2-col 그리드, 정적 `academyWebinars`
   - "LIVE" 뱃지 + 제목 + 설명 + When/Seats/Level 디테일 + "등록하기" (navy → `#academy-register` 스크롤)
5. **Academy Downloads** (`id="academy-downloads"`, `scroll-mt-24`):
   - 3-col (md:2 → lg:3)
   - 카드: 아이콘(FileSpreadsheet/Presentation/MonitorPlay) + 제목 + 설명 + 다운로드 버튼
6. **Webinar Registration Form** (`id="academy-register"`, `scroll-mt-24`):
   - 카드 + 2-col 폼: Webinar select(풀폭) / Name / Email / Company(풀폭)
   - Submit (navy) + 검증 + 토스트
7. **Consultation CTA** (`id="academy-consult"`, `scroll-mt-24`):
   - 네이비+골드 그라디언트 박스 + 제목 + gold 버튼 → `/contact?topic=academy`
8. **Video Modal** — 강의별 임베드 또는 데모 비디오

### 데이터 소스
- 서버: `getPublishedAcademyLessonsForUi()` (force-dynamic)
- 정적: `academyWebinars`, `academyDownloads` (lib)
- 다운로드: `downloadAcademyAssetPdf`, `downloadAcademyOutlinePdf`

### 주요 인터랙션
- 강의 비디오 모달
- 개요/에셋 PDF 다운로드 (loader state)
- 웨비나 등록 폼 스크롤 + 제출 (토스트)
- PPT 다운로드 (토스트)

### 모바일/데스크탑 차이
- Value strip: `sm:2col → lg:4col`
- 강의/다운로드 그리드: `md:2col → lg:3col`
- 폼: `sm:grid-cols-2`

### 변경 금지 포인트
- 앵커 `#academy-basics / #academy-webinars / #academy-downloads / #academy-register / #academy-consult`
- Consultation 진입 쿼리 `?topic=academy`
- 정적 데이터 import 경로 (`academyWebinars`, `academyDownloads`)

---

## 10. 견적 (`/[locale]/quote`)

파일:
- 서버: `app/[locale]/quote/page.tsx` (9줄)
- 클라이언트: `app/[locale]/quote/quote-page-client.tsx` (1858줄, 4-step 위저드)
- 상세(완료 후): `app/[locale]/quote/[id]/`

### 아키텍처
- 4-step 위저드: state `step` (1~4)
- 클라이언트 state: `selectedIds(Set)`, `period`, `template`, 폼 필드, `logoDataUrl`
- 서버 prefetch: `fetchPublicMediaCatalog()` → 클라이언트 prop

### 섹션 순서 (위→아래)
1. **Hero Header** (제목/부제 + BETA 뱃지)
2. **Wizard Progress** — 4단계 시각화, 클릭 네비게이션, "X of 4" 라벨
3. **Main Content Card** (단계별 콘텐츠) + **Sidebar Cost Summary**
4. **Floating Selection Bar** (Step 1, fixed bottom)

### Step 1 — 매체 선택
- `<MediaSearchAutocomplete />` (ref key reset)
- `<MediaCatalogFiltersBar />` (type / region / price slider / advanced)
- 결과 카운터 + 정렬 + Grid/Compact 토글 + per-page select + 전체선택/해제 + 검증 뱃지
- 그리드:
  - Grid view: `MEDIA_CATALOG_GRID_CLASS` + `<MediaCatalogGridCard />`
  - Compact view: `MEDIA_CATALOG_COMPACT_GRID_CLASS` + 썸네일+이름+위치+가격
- 매체별 조건부 인풋:
  - **Network 매체**: `networkUnits` (number) + `networkRegion` (select)
  - **Non-network + priceOptions 있음**: `priceOptionLabel` (select by index)
- 페이지네이션 prev/next + summary

### Step 2 — 기간 및 예산
- Period select: `1month / 3months / 6months / 12months` (i18n `quote.periods.{period}`)
- 설명 힌트: `quote.periodBudgetPdfHint`
- 예산 자동 계산 (선택 매체 합 × 기간 개월)

### Step 3 — 템플릿 및 로고
- Template picker (라디오 카드 2종): `default` (LayoutTemplate) / `premium` (Sparkles)
- 로고 업로드:
  - PNG/JPEG, max **600KB** (`LOGO_MAX_BYTES`)
  - 미리보기(max-h-24, max-w-200px) + 제거 버튼
  - state: `logoDataUrl` (data URI)

### Step 4 — 검토 및 제출
- **A. PDF Preview**: `<QuotePdfPreview />` (template, customerLogoSrc, company, name, phone, email, periodLabel, rows, subtotal, VAT 10%, grandTotal, issuedAt)
- **B. Review Checklist**: 매체 수 / 기간 / 예산 / 템플릿 / 로고
- **C. PDF Actions**: Download PDF (navy) + Capture as PNG (outline)
- **D. Email PDF** (gold/5 bg 카드): honeypot + 이메일 input + 전송 버튼 → `/api/quote/email-pdf`
- **E. Contact Form**:
  - honeypot: `website` (hidden)
  - 2-col grid: company / name(필수) / phone(필수) / email
  - message textarea (rows=4, 필수)
  - 검증: `name` `phone` 필수, phone regex `/^[\d\-+() ]{8,}$/`
  - Submit POST `/api/quote` body: `{ company, name, phone, email, mediaIds, period, budgetMin, budgetMax, estimatedCost, message, website, pdfTemplate, locale, networkSelections }`
  - 성공: 토스트 + `/quote/{quoteId}` 리디렉션 또는 success state
- **F. Success State**: Green check + 제목 + 설명

### 데이터 소스
- 서버: `fetchPublicMediaCatalog()`
- 계산: monthlyCost = Σ(선택가격 × period months); VAT +10%
- POST: `/api/quote`, `/api/quote/email-pdf`
- 진입 쿼리:
  - `?media=id1,id2,id3` → 매체 사전선택
  - `?po=n` → priceOption 인덱스 사전선택 (단일 매체일 때)

### 주요 인터랙션
- 4-step 위저드 (저장 없음, 매체 선택 시 뒤로 이동 가능)
- 실시간 비용 계산
- Network 매체: 단위 수 + 지역 선택
- Non-network: priceOption 선택
- PDF 미리보기 라이브 업데이트 (로고/템플릿)
- Email PDF + Quote 제출 (honeypot, 검증, 토스트)

### 모바일/데스크탑 차이
- 모바일:
  - Floating bottom bar (Step 1, 선택 시) 2-col 버튼
  - Compact 그리드, 썸네일 4.5rem
  - 단일 컬럼 폼
- 데스크탑:
  - Sidebar Cost Summary (`order-1`) ↔ Main Card (`order-2`)
  - 풀사이즈 그리드, 2-col 폼

### 변경 금지 포인트
- 4-step 순서: 매체 → 기간 → 템플릿/로고 → 검토 제출
- 진입 쿼리 `?media=`, `?po=`
- POST endpoint `/api/quote`, `/api/quote/email-pdf`
- 로고 600KB 제약
- VAT 10% 계산식
- 성공 후 `/quote/{quoteId}` 라우트

---

## 11. 서비스 (`/[locale]/services`)

파일: `app/[locale]/services/page.tsx` (271줄, 서버 컴포넌트, 마케팅 랜딩)

### 섹션 순서 (위→아래)
1. **Hero** (네이비 그라디언트): `heroBadge` + h1 `heroTitle` + `heroSubtitle` + CTA 2개 (`/quote` gold + `/media` outline)
2. **3 Service Pillars** (white bg, `md:grid-cols-3`):
   - `<AnimatedCard />` × 3 (delay-staggered)
   - 아이콘: Lightbulb / MapPinned / Radio
   - 데이터: `pillars` 배열 (i18n)
3. **5-Step Process** (slate-50 bg):
   - Eyebrow `processBadge` + 제목 `processTitle` + 인트로 `processIntro`
   - **모바일**: flex column, `<AnimatedCard />` per step + 번호 뱃지
   - **데스크탑(`md`+)**: `<Timeline />` 컴포넌트 (수평)
4. **4 Differentiators** (white bg, rounded):
   - "Why us" 이브로우 + `diffTitle`
   - 2-col 리스트 (`sm:grid-cols-2`)
   - 아이콘: ShieldCheck / TrendingUp / Award / HeadphonesIcon
5. **FAQ**: `<ServicesFaq />` (4 Q&A 쌍, i18n)
6. **Bottom CTA** (네이비 그라디언트):
   - ClipboardList 아이콘 + h2 `ctaTitle` + 부제
   - CTA 2개: `/quote` (gold) + `/media` (outline)

### 컴포넌트
`<SectionHeading />`, `<AnimatedCard />`, `<Timeline />`, `<ServicesFaq />`, `<Card />`, `<Badge />`, `<Button />`

### 데이터 소스
- 전부 i18n namespace `"servicesPage"` (pillars / steps / differentiators / FAQ)
- 외부 데이터 없음

### 주요 인터랙션
- Hero/Bottom CTA 링크
- AnimatedCard 인뷰 애니메이션
- FAQ 토글

### 모바일/데스크탑 차이
- Process: 모바일 = AnimatedCard 컬럼 / 데스크탑 = Timeline 수평
- Pillars/Differentiators 그리드: 반응형 컬럼

### 변경 금지 포인트
- 6 섹션 순서
- CTA 링크 두 곳: `/quote`, `/media`
- i18n namespace `servicesPage`

---

## 12. 문의 (`/[locale]/contact`)

파일:
- 서버: `app/[locale]/contact/page.tsx` (22줄, locale resolve + i18n + `<ContactPageHero />` + `<ContactPageContent />`)
- 클라이언트: `app/[locale]/contact/contact-client.tsx` (455줄)

### 섹션 순서 (위→아래)
1. **Hero** (`<ContactPageHero />`, locale prop)
2. **Main Layout** (`lg`+ 2-column grid, 모바일 stacked):
   - **A. Form Section** (`lg:col-span-3`):
     - 카드(rounded + border + shadow) + h2 `contact.formTitle`
     - **Referral Banners** (URL params 기반 조건부):
       - `?ref=case-study&case=<제목>` → 파란 배너, 메시지 사전 채움
       - `?ref=academy` → 황색 배너, 메시지 사전 채움
     - **폼 필드**:
       - 이름 (필수, 빨간 별표)
       - 전화 (필수, regex `/^[\d\-+() ]{8,}$/`)
       - 문의 유형 select: `media / campaign / quote / partnership / other`
       - 예산 select: `under10m / 10to50m / 50to100m / over100m`
       - 메시지 textarea (필수, min-h-120px)
       - Turnstile 캡차
       - honeypot: `website` hidden
       - Submit (gold CTA, 제출 중 disabled)
     - **검증/에러 처리**: 이름·전화·메시지 필수, phone regex, Turnstile 토큰; HTTP 429/403/400/503 케이스별 사용자 메시지
     - **POST**: `/api/contact` body `{ name, phone, inquiryType, budget, message, cfTurnstileToken, website }`
     - **성공 state**: 체크 아이콘 + 제목 + 메시지
   - **B. Info Sidebar** (`lg:col-span-2`):
     - h3 `contact.infoTitle`
     - 4 항목(아이콘 + 텍스트):
       - 전화: `contact.phoneNumber`
       - 이메일: `contact.emailAddress`
       - 위치: `contact.address`
       - 시간: `contact.hours`
     - Divider + 안내 (지하철/버스/주차):
       - `contact.subway` + `subwayDesc`
       - `contact.busTitle` + `busDesc`
       - `contact.parkingTitle` + `parkingDesc`

### 컴포넌트
`<ContactPageHero />`, `<ScrollAnimate />`, `<TurnstileWidget />` (Cloudflare), `<Button />`, `<Input />`, `<Textarea />`, 토스트

### 데이터 소스
- URL 검색 파라미터: `ref`, `case` (decodeURIComponent)
- i18n namespace `"contact"`
- DB 직접 read 없음 (제출만)
- POST: `/api/contact`

### 주요 인터랙션
- Referral 사전 채움 (사례/아카데미 페이지 링크에서 진입 시)
- 실시간 검증 (touched state)
- 전화 regex 검증
- Turnstile 검증 필수
- 429 / 403 / 400 / 503 사용자 메시지 분기
- honeypot 스팸 방지
- 성공 토스트 + 폼 reset 또는 success card

### 모바일/데스크탑 차이
- 모바일: 단일 컬럼 (폼 풀폭, 인포 아래)
- 데스크탑(`lg`): 그리드 (폼 3col + 인포 2col)

### 변경 금지 포인트
- POST endpoint `/api/contact`
- Turnstile 의존성 (Cloudflare)
- honeypot 필드명 `website`
- Referral 진입 쿼리 `?ref=case-study&case=...`, `?ref=academy`, `?topic=academy`
- 인콰이어리/예산 select 옵션 키 (백엔드 매핑)

---

## 부록 A — 변경 금지 종합 체크리스트

디자인 PR 검수 시 아래 항목이 손상되지 않았는지 확인:

### 라우트
- `/[locale]` (홈)
- `/[locale]/media`, `/[locale]/media/[id]`, `/[locale]/media/map`, `/[locale]/media/network`, `/[locale]/media/keyword-filter`
- `/[locale]/recommend`
- `/[locale]/planner`, `/[locale]/planner/shared/[id]`
- `/[locale]/compare`
- `/[locale]/cases`, `/[locale]/cases/[slug]`
- `/[locale]/insights`, `/[locale]/insights/[slug]`
- `/[locale]/academy`
- `/[locale]/quote`, `/[locale]/quote/[id]`
- `/[locale]/services`
- `/[locale]/contact`

### 진입 쿼리 파라미터
- `/planner?addMedia=<id>`
- `/quote?media=<ids>` `&po=<n>`
- `/compare?ids=<ids>`
- `/contact?ref=case-study&case=<title>`
- `/contact?ref=academy`
- `/contact?topic=academy`
- `/contact?case=<id>` (cases 카드 "유사 사례" 진입)

### localStorage 키
- `tkad-planner-plan-v2` (플래너 입력)
- `tkad-compare-cart-v1` (비교 카트)
- `mediaBrowseMode` (검색 모드)
- `mediaCatalogLayout` (그리드/컴팩트)
- 최근 본 매체 ID 배열
- (planner 비persist: `wizardStep`, `creativeObjectUrl`)

### API endpoints (절대 변경 금지)
- `/api/contact` POST
- `/api/quote` POST
- `/api/quote/email-pdf` POST
- `/api/planner/save` POST
- `/api/planner/shared/[id]` GET
- `/api/planner/creative/sign` (Cloudinary signed)
- `/api/cron/generate-trend-report` (Vercel cron)
- `/api/admin/ai/validate-trend-report` POST

### 데이터 소스 (DB 진실 — mock 금지)
- 매체 목록/상세: `fetchPublicMediaCatalog()`, `resolveMediaForDetail(id)`
- 홈 매체: `fetchHomeFeaturedMedia()`, `fetchHomePopularMedia()`
- 사례: `getPublishedSuccessCases()`, `getSuccessCasesForMedia(id)`
- 인사이트: `getPublishedInsightReports()`
- 아카데미: `getPublishedAcademyLessonsForUi()`

### 핵심 상수/식별자
- `PLANNER_LAST_INPUT_STEP = 6`, `PLANNER_RESULT_STEP = 7`
- `LOGO_MAX_BYTES = 600KB` (quote)
- `PLANNER_BUDGET_MIN = 500` (만원)
- VAT 10% (quote)
- Reach 환산 = impressions × 0.75 (planner)
- Cloudinary 폴더 `tkad/planner/creative`

---

## 부록 B — 디자인 적용 순서 (운영 보호 정책)

1. **메인 (`/`)** — 가장 외부 노출, 토큰만 우선 적용
2. **매체 검색 (`/media`)** — 카드 컴포넌트 일관성
3. **매체 상세 (`/media/[id]`)** — 가장 무거운 페이지, 트래픽 차트 영역 주의
4. **AI 추천 (`/recommend`)** — 페이즈 머신 + 카드
5. **플래너 (`/planner`)** — 7단계 + 7개 차트, **차트 색상 토큰 호환 필수 검증**
6. 나머지 7개 (compare → cases → insights → academy → quote → services → contact)

각 페이지 적용 후:
- Vercel Preview 배포
- 사용자 검수 + 명시적 OK
- 다음 페이지 진행 (절대 묶음 진행 금지)

---
