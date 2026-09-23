# `/ko/media/map` 지도 페이지 — Phase 0 전수 진단 보고서

- 작성일: 2026-09-22
- 대상: `app/[locale]/(site)/media/map` + `components/media-map/**` + `components/public-map/**` + `lib/media-map/**` + `app/api/media/map/route.ts`
- 범위: **코드 변경 없음 · 정적 코드 분석 기반 진단**
- 표기 규칙: 실측하지 못한 항목은 **(추정)** 으로 명시. 난이도는 S(1일 이내) / M(2~4일) / L(1주 이상).

---

## 0. 지시서 전제 정정 (먼저 확인 필요)

지시서 배경에 적힌 전제 중 **코드와 다른 것**이 두 가지 있다. 이후 항목은 실제 코드 기준으로 작성했다.

| 지시서 전제 | 실제 코드 | 근거 |
|---|---|---|
| "매체 데이터 전체 1회 로드" | **뷰포트 기반 fetch + 줌별 핀 상한**이 이미 구현돼 있다 | `app/api/media/map/route.ts:216`, `lib/media-map/map-pin-response-limit.ts:25-36` |
| "지도 스택 = Leaflet + Carto" | 맞다. 단 **라이트 모드는 VWorld(WMTS) 우선**, 키 없으면 Carto voyager, Carto 키도 없으면 OSM 폴백 | `lib/public-dark-map-config.ts:77-90`, `lib/public-vworld-map-config.ts:1-12` |

반대로 지시서가 지적한 **"서버 HTML에 매체 데이터 0건"** 은 **사실이며 가장 큰 문제**다 (§H-28).
또 `components/media-map/kakao-map-view.tsx` 는 **매체 상세 페이지 전용**이고 `/media/map` 은 쓰지 않는다 (`components/media-detail/media-detail-kakao-map.tsx:14`). 즉 서비스 안에 **Kakao SDK 지도와 Leaflet 지도 두 스택이 공존**한다.

---

## A. 데이터 로딩·성능

### 1. 매체 데이터 로딩 방식 / 응답 크기 / 필드 목록

**현황**
- 전량 1회 로드가 아니다. 클라이언트가 지도 bounds + 필터 + zoom 을 쿼리로 보내 `/api/media/map` 를 호출한다 (`components/media-map/media-map-page-client.tsx:488-620`).
- 진입 직후 1회는 **전국 개요 bounds**(`KOREA_MAP_OVERVIEW_BOUNDS`, lat 33~38.8 / lng 124.5~132)로 seed 검색해서 빈 지도를 막는다 (`media-map-page-client.tsx:142-147`, `645-660`).
- 서버는 매 요청마다 **DB 전체 카탈로그를 메모리에 올려** 필터링한다. 60초 프로세스 내 TTL 캐시가 있다 (`lib/public-media-map-catalog-cache.ts:7-24`, `lib/public-media-map-catalog.ts:53-70` — `findMany` 에 `where: publicActiveMediaWhere()` 만 있고 `select`/`take` 없음).
- 응답 필드(항목당 25개): `id, name, location, region, city, district, type, subCategory, price, pricePeriod, catalogPrice, catalogPricePeriod, createdAt, lat, lng, image, availability, visibilityScore, dailyFootTraffic, impressions, cpm, isVerified, isInstantBooking, installLocations[], mapDisplayMode, serviceRegionLabel, locationUnknown, coverageDistrictCodes[]` (`app/api/media/map/route.ts:76-124`).
- 응답 크기 실측(대표 필드값으로 생성한 합성 페이로드, Node `zlib`):

| 항목 수 | raw | gzip | brotli |
|---|---|---|---|
| 50 (zoom≥10 상한) | 34.3 KB | 4.7 KB | 3.5 KB |
| 80 (기본 상한) | 54.9 KB | 7.0 KB | 5.2 KB |
| 150 (zoom≤5 상한) | 103.0 KB | 12.5 KB | 9.1 KB |
| 865 (전량 가정) | 596.9 KB | 68.3 KB | 49.6 KB |

**(추정)** — 실제 DB 값 분포가 아닌 대표값 기반. 프로덕션 실측은 `curl -s -H 'accept-encoding: gzip' '…/api/media/map?...' | wc -c` 로 확인 필요.

**문제**
- 네트워크 페이로드는 이미 충분히 작다(핀 상한 덕분). **진짜 비용은 서버 쪽**이다. 요청마다 `Media` 전 행 + `MEDIA_TRANSLATIONS_FOR_MEDIA_INCLUDE` + `attachPublicMediaCatalogExtras` 를 메모리에 로드 → 캐시 미스 시 TTFB 스파이크.
- `dynamic = "force-dynamic"` + `cache: "no-store"` 라 CDN 캐시가 전혀 없다 (`route.ts:22`, `media-map-page-client.tsx:512`).
- 캐시가 프로세스 로컬(서버리스 인스턴스별)이라 콜드 인스턴스마다 전량 쿼리가 반복된다.

**권장안** — 응답에 `Cache-Control: public, s-maxage=60, stale-while-revalidate=300` 부여(필터/bounds 조합별 CDN 캐시), Prisma `select` 로 지도에 필요한 컬럼만 조회, 카탈로그 캐시를 Redis/Vercel KV 등 공유 캐시로 승격.
**난이도**: M

---

### 2. 마커 필수 필드만 내려가는가 / 상세 lazy 로드

**현황**
- 마커 렌더에 실제로 쓰는 필드는 `id, name, lat, lng, price, type, visibilityScore` 5~7개뿐이다 (`components/public-map/map-types.ts:1-11`).
- 그런데 API 는 항목당 25필드를 모두 내려준다 (`route.ts:76-124`). 목록 패널과 마커가 **같은 배열을 공유**하기 때문이다.
- 상세는 lazy 하다: 마커 클릭 시 `/api/public/media/{id}/availability` 를 별도 호출 (`components/media-map/media-map-detail-sheet.tsx:279-290`).

**문제**
- 지도 핀과 목록 카드의 데이터 요구가 다른데 한 엔드포인트가 둘 다 책임진다. 항목당 ~700B 중 마커에 필요한 건 ~90B.
- `installLocations`, `coverageDistrictCodes` 는 배열이라 항목별 크기 편차가 크다.

**권장안** — 현 규모(865건, 상한 150)에서는 분리 이득이 gzip 기준 수 KB 수준이라 **지금 당장은 불필요**. 매체가 5,000건을 넘거나 `?fields=pin` 같은 경량 모드가 필요해지는 시점에 분리.
**난이도**: S(분리 시)

---

### 3. 마커 렌더러 / 클러스터링

**현황**
- **DOM 마커**다. `L.marker` + data-URI SVG 아이콘 (`lib/map-pin-styles.ts:26-47`, 아이콘 캐시 있음).
- 클러스터링: **`leaflet.markercluster` 사용 중** (`components/public-map/dark-map-markers-layer.tsx:246-256`).
  - `maxClusterRadius`: zoom≤11 → 110px, ≤13 → 90px, 그 외 72px (`dark-map-markers-layer.tsx:48-52`)
  - `disableClusteringAtZoom: 16`, `spiderfyOnMaxZoom: true`, `chunkedLoading: true` (`dark-map-markers-layer.tsx:252`)
  - 마커 1개일 때는 클러스터 비활성 (`dark-map-view.tsx:389`)
- 핀 이름 라벨은 zoom≥17 & 뷰포트 내 핀 ≤18개일 때만 일괄 표시 (`lib/map-pin-labels.ts:4-9`).

**문제**
- 마커 아이콘은 `L.icon`(img) 이라 **핀 전체 재빌드 시 30~150개 `<img>` 교체**가 발생한다. 현 상한(≤150)에서는 체감 가능한 수준은 아니다 **(추정)**.
- `disableClusteringAtZoom: 16` 인데 핀 이름 라벨은 zoom≥17 부터다. zoom 16 구간에서 **클러스터도 없고 라벨도 없는 무명 핀 밭**이 생긴다.

**권장안** — 라벨 최소 zoom 을 16 으로 내려 클러스터 해제 시점과 맞춤. 현 규모에서 Canvas 전환은 불필요(§마지막 절).
**난이도**: S

---

### 4. 모바일 실측 (Lighthouse LCP·INP·TBT, 첫 상호작용 시점, 프레임드랍)

**현황 — 실측 불가 (이번 진단은 정적 분석 범위)**
- 코드에는 자체 계측 훅이 이미 있다: `tkad-map-init` → `tkad-map-usable` performance mark/measure (`lib/media-map/map-performance.ts:1-40`, 호출부 `media-map-page-client.tsx:412-421`). 주석에 "4× CPU throttle 회귀 체크용" 이라 명시.
- `tkad-map-usable` 은 `!loading && items.length > 0` 시점에 찍힌다 → **지도 타일이 아니라 첫 핀 데이터 도착 시점**을 잰다.

**문제**
- LCP/INP/TBT 수치가 레포 어디에도 기록돼 있지 않다(`reports/`, `docs/` 확인). 회귀 기준선이 없다.
- 구조적으로 LCP 후보가 나쁘다: 서버 HTML 에 콘텐츠가 없어(§28) LCP 는 **클라이언트 JS → Leaflet chunk → 타일 → 스켈레톤 해제**에 전적으로 의존한다.
- TBT 위험 지점: 진입 시 `MapChunkPrefetch` 가 `dark-map-view` + `media-map-page-client` 두 청크를 즉시 import (`components/media-map/map-chunk-prefetch.tsx:8-10`) + `leaflet` + `leaflet.markercluster` + CSS 3종이 같은 청크에 있음 (`dark-map-view.tsx:4-8`).

**권장안** — Phase 0.5 로 **모바일 Lighthouse(4× throttle) 3회 중앙값**을 측정해 `docs/audit/` 에 기준선 커밋. 측정 없이 성능 PR 을 시작하지 말 것.
**난이도**: S (측정) / M (개선)

---

### 5. Leaflet 번들이 다른 페이지로 새지 않는가

**현황**
- `/media/map` 에서 `DarkMapView` 는 `dynamic(..., { ssr: false })` 로 분리돼 있다 (`media-map-page-client.tsx:111-118`).
- `leaflet` / `react-leaflet` 을 **정적 import** 하는 파일은 8개뿐이고 전부 `components/public-map/**` + `lib/map-pin-styles.ts` + `lib/public-map/seoul-metro-overlay-styles.ts` 로, `dark-map-view` 서브트리에 갇혀 있다.
- 지하철 오버레이는 추가로 lazy 분리돼 있다 (`components/public-map/lazy-seoul-metro-overlay-layer.tsx`).

**문제**
- `components/home/home-hero-map-card.tsx` 가 `leaflet/dist/leaflet.css` 와 `react-leaflet` 을 **정적 import** 하는데 **어디서도 import 되지 않는 죽은 파일**이다(전역 grep 결과 자기 정의 라인만 매치). 살아나는 순간 홈 번들에 Leaflet 이 딸려 들어간다.
- `/media` 목록 페이지도 `MapChunkPrefetch` 를 쓴다(`map-chunk-prefetch.tsx` 주석) → 지도를 안 쓸 수도 있는 사용자에게 Leaflet 청크를 선다운로드.

**권장안** — `home-hero-map-card.tsx` 삭제 또는 dynamic 화. `/media` 의 prefetch 는 `requestIdleCallback` + 데이터 세이버/저사양 가드 뒤로 (`prefetchOnIdle` 이 `lib/lazy-chunk-prefetch.ts:24-38` 에 이미 있음).
**난이도**: S

---

### 6. 타일 소스 / 한국어 라벨 품질 / 요청 수 / 캐시 헤더

**현황**
- 라이트 모드: `NEXT_PUBLIC_VWORLD_API_KEY` 있으면 **VWorld Base**(한국어 POI·도로명), 없으면 **Carto voyager**, Carto 키도 없으면 **OSM** (`lib/public-dark-map-config.ts:36-49`, `77-90`).
- 다크 모드: VWorld 에 dark 변형이 없어 **항상 Carto dark_all** (`public-dark-map-config.ts:79-81`).
- 소스 주석에 명시: **"Production: 운영키 미등록 (TODO)"** (`lib/public-vworld-map-config.ts:12-16`).
- 타일 maxZoom: VWorld 19 / OSM 19 / Carto 20 (`components/public-map/dark-map-tile-layer.tsx:56-66`). 지도 자체 maxZoom 은 18 (`dark-map-view.tsx:409`).
- 타일 캐시 헤더: 외부 CDN(VWorld/Carto/OSM) 소관이라 코드에서 제어하지 않음.

**문제**
- **프로덕션은 현재 한국어 라벨 품질이 가장 낮은 조합**일 가능성이 높다. VWorld 운영키 미등록 + Carto 키 유무에 따라 Carto voyager(영문 혼재) 또는 OSM.
- 다크 모드는 키 유무와 무관하게 Carto dark — 국내 지도 UX 기준(호갱노노·네이버지도)에서 지명/역명 가독성이 떨어진다.
- 타일 요청 수는 코드로 제한하지 않는다. 뷰포트 × zoom 변경마다 표준 XYZ 요청 **(추정)**.

**권장안** — **VWorld 운영키 발급·등록이 최우선(비용 0, 체감 효과 큼)**. 다크 모드는 VWorld `midnight`(라벨 없음) + 별도 라벨 오버레이 조합을 검토하거나, 지도 다크모드를 포기하고 라이트 고정.
**난이도**: S (키 등록) / M (다크 대안)

---

## B. 지도 ↔ 목록 동기화

### 7. 목록 패널 / 뷰포트 내 매체만 표시

**현황**
- 있다. 데스크톱은 좌측 고정 패널 440px(lg 520px) (`media-map-page-client.tsx:1388`), 모바일은 바텀시트 (`components/media-map/media-map-list-sheet.tsx`).
- 목록·마커는 **같은 `items` 배열**을 공유한다. bounds 필터는 서버에서 적용 (`route.ts:56-74`, `mediaItemIntersectsMapBounds`).
- 단, **모든 항목이 bounds 필터를 받지는 않는다**: `mapDisplayMode` 가 `service_region`(이동형·네트워크) 또는 `location_unknown` 인 항목은 **bounds 무관하게 항상 목록에 포함**된다 (`route.ts:56-74`).

**문제**
- "지도 영역 안 매체만"이 부분적으로만 참이다. 강남을 보고 있어도 전국 이동형 매체가 목록에 섞인다. 이건 의도된 설계(이동형은 좌표가 없음)지만 **사용자에겐 "왜 여기 부산 버스가?"** 로 읽힌다.
- 완화 장치는 있다: 카운트 라벨이 핀/목록/이동형을 분리 표기하고(`formatMapViewCountPinList`), 비핀 배너(`MediaMapNonPinBanner`)와 peek 칩(`MediaMapPeekDiscoverabilityChips`)이 안내한다.

**권장안** — 목록을 "이 영역 N건" / "이동형·전국 M건" **두 섹션으로 시각 분리**. 현재는 같은 그리드에 섞여 있다.
**난이도**: S

---

### 8. 자동 갱신 vs "이 지역에서 다시 검색"

**현황** — **둘 다 있고, 사용자가 토글로 고른다.**
- 기본값 `auto` (`media-map-page-client.tsx:181`), localStorage 에 저장 (`lib/media-map/map-area-search-mode.ts`).
- auto: pan/zoom 종료 후 **800ms debounce + bounds 면적 변화 ≥10%** 일 때만 재조회 (`lib/media-map/map-bounds-change.ts:4-7`, `media-map-page-client.tsx:783-830`). 우상단에 "지역 데이터 갱신 중…" 스피너.
- manual: 상단 중앙에 "이 지역에서 검색" pulse 버튼 + 5초 후 1회성 토스트 넛지 (`media-map-page-client.tsx:1141-1153`, `1281-1320`).
- 프로그램적 이동(지역칩·검색결과 fitBounds)은 `viewportDirty` 로 구분해 자동검색 대상에서 제외 (`dark-map-view.tsx:196-218`).

**문제** — 없음. 이 항목은 **국내 경쟁 서비스 대비 오히려 앞선 구현**이다.

**권장안** — 유지. 다만 zoom 변경만으로도 별도 재조회가 한 번 더 걸린다(`media-map-page-client.tsx:634-643` 의 zoom-tier effect) → auto 모드에서 pan+zoom 시 중복 fetch 가능 **(추정)**. 두 경로를 하나의 debounce 로 합치는 게 안전하다.
**난이도**: S

---

### 9. 목록 hover ↔ 마커 하이라이트 양방향

**현황** — **양방향 구현돼 있다.**
- 전역 hover bridge(`lib/media-map/map-hover-bridge.ts`, `useSyncExternalStore`)로 React 트리를 건너뛰고 연결.
- 목록 → 마커: `onMouseEnter/Leave/Focus/Blur` → `setMapHoveredMediaId` (`components/media-map/media-map-item-list.tsx:99-108`).
- 마커 → 목록: `selectedId` 변경 시 해당 카드로 `scrollIntoView` (`media-map-page-client.tsx:752-777`).
- 복수 설치 지점(`mediaId-install-N`) 도 매칭된다 (`lib/media-detail-map-markers.ts:9-25`).

**문제**
- **마커 hover → 목록 하이라이트는 없다.** 반대 방향만 있다. 마커에 `mouseover` 리스너가 없다 (`dark-map-markers-layer.tsx:343` — `click` 만 바인딩).
- 목록 hover 시 마커는 아이콘만 커지고(30→34px) **지도가 패닝하지 않아** 뷰포트 밖 마커면 아무 일도 안 일어난 것처럼 보인다.

**권장안** — 마커 `mouseover/mouseout` → `setMapHoveredMediaId` 추가(코드 3줄, 브리지가 이미 양방향 지원).
**난이도**: S

---

### 10. 결과 0건 빈 상태

**현황**
- 지도 위 floating 카드: "이 화면에 매체가 없습니다 / 지도를 이동하거나 필터를 조정해 보세요" (`components/media-map/media-map-floating-empty.tsx`).
- 데스크톱 목록에도 `DiscoveryEmptyState` (`media-map-item-list.tsx:110-124`).
- 모바일 시트 헤더는 "이 영역 0개 · 지도 이동·필터 조정" (`media-map-page-client.tsx:1258-1270`).

**문제**
- **전부 안내문뿐, 행동 가능한 제안이 없다.** 주변 추천도, 필터 완화 원클릭도, "가장 가까운 매체로 이동" 도 없다.
- 빈 상태에서 어떤 필터가 결과를 0으로 만들었는지 알려주지 않는다 (활성 필터 칩은 있으나 빈 상태와 연결 안 됨).

**권장안** — 빈 상태 카드에 ① "필터 초기화"(`clearMapBrowseFilters` 이미 존재) ② "반경 확대해 N건 보기"(bounds 2배) ③ 가장 가까운 매체 3건 미니 리스트.
**난이도**: M

---

## C. 검색·필터

### 11. 지원 검색 종류 / 지오코딩 공급자

**현황**
- 검색창 placeholder: "매체명·지역·유형" (`components/media/media-manual-browse-filters.tsx:1210-1219`).
- 동작: `q` 를 서버로 보내 **카탈로그 텍스트 매칭**(`filterMediaByDiscoveryChips`). 텍스트 검색 시 bounds 를 버리고 **전국 스코프**로 전환 (`lib/media-map/browse-filters.ts:98-131`).
- 질의가 지역명/코드/별칭과 **정확히 일치**하면 region 필터로 승격 + 지도 이동 (`lib/media-map/text-query-region.ts:20-63`).
- 결과가 현재 뷰포트와 겹치지 않으면 결과 bounds 로 `fitBounds`(maxZoom 12) (`media-map-page-client.tsx:330-367`).

**문제 — 이 페이지의 가장 큰 기능 공백**
- **POI·주소 검색이 전혀 없다.** "강남역", "코엑스", "테헤란로 123" 을 넣으면 매체명/주소 문자열에 우연히 포함된 경우에만 걸린다.
- 레포에 지오코딩 라이브러리가 **이미 있는데 지도 페이지는 안 쓴다**: `lib/kakao-address-geocode.ts`, `lib/kakao-local-keyword-search.ts`, `lib/kakao-nearby-pois.ts`, `lib/google-places-search.ts` — 전부 어드민/매체 등록 파이프라인 전용.
- 역명 검색은 지하철 오버레이(`subwayOverlayEnabled`)와도 연결되지 않는다.

**권장안** — PR-4. `lib/kakao-local-keyword-search.ts` 를 공개 API 라우트로 감싸 검색창에 **자동완성 드롭다운(매체 / 지역 / 장소 3섹션)** 추가. 장소 선택 시 해당 좌표로 이동 + 반경 필터.
**난이도**: M

---

### 12. 필터 목록 / UI 위치 / 개수 표시·초기화

**현황**
- 필터: `q`, `mainCategory`, `subCategory`, `target`, `regionMain`, `regionSub`, `priceMin/Max`, `features`, `sort` (`lib/media-map/browse-filters.ts:5-16`).
- UI 위치: **지도 위가 아니라 페이지 최상단 고정 툴바**. `/media` 와 동일한 `MediaManualBrowseFilters` 컴포넌트를 `unifiedToolbar` + `mapPageViewModes` 모드로 재사용 (`media-map-page-client.tsx:1195-1249`).
- 활성 필터 칩 스트립 + 개별 제거 + 전체 초기화 존재 (`lib/media-map/active-filter-chips.ts`, `clearMapBrowseFilters`).
- 가격은 4단 프리셋(~50만 / 50~200만 / 200~500만 / 500만~) (`lib/media-map/price-presets.ts:16-44`).
- 정렬: popular / newest / price_asc / price_desc (`map-toolbar-sort-dropdown.tsx`).

**문제**
- 필터 바가 **지도 위 오버레이가 아니라 지도 높이를 깎아먹는 고정 헤더**다. 모바일에서 지도 가용 높이가 `100dvh - 헤더 - 탭바 - 필터바` 까지 줄어든다 (`app/globals.css:1196-1207`).
- 지도 전용 필터(가시성 점수, 즉시예약, 검증)가 목록 필터와 같은 서랍에 묻혀 있다.

**권장안** — 모바일에서 필터 바를 지도 위 floating 칩 행으로 승격(지도 높이 회복). 데스크톱은 현행 유지.
**난이도**: M

---

### 13. 예산·기간 필터 (1/3/5/7/15/30일 구간 요금)

**현황**
- 예산: 있다(§12 프리셋 + 직접 입력).
- **기간 필터: 없다.** `MapBrowseFilters` 에 기간 필드가 없고, API 도 기간 파라미터를 받지 않는다.
- 표시가는 `resolveMediaDisplayPrice` 가 고른 **최저가 옵션 1개**의 가격과 그 기간이다 (`lib/media-price-format.ts:404-415`). 즉 카드마다 기준 기간이 다를 수 있다(어떤 건 "월", 어떤 건 "7일").

**문제**
- "15일 예산 300만원으로 뭘 할 수 있나" 라는 **가장 흔한 광고주 질문에 지도가 답하지 못한다**.
- 기간이 섞인 표시가로 가격 필터를 돌리면 사과와 오렌지를 비교하게 된다. 정렬은 월환산(`mediaMonthlyEquivalentSortWon`)으로 보정하지만 **필터(`priceMin/Max`)는 보정 없이 표시가 원값과 비교**한다 → 정렬과 필터의 기준이 다르다.

**권장안** — 기간 셀렉터(1/3/7/15/30일)를 추가하고, 선택 기간 기준으로 표시가·필터·정렬을 통일. 최소한 **필터를 정렬과 같은 월환산 기준으로** 맞추는 건 즉시 가능.
**난이도**: S (필터 기준 통일) / L (기간 셀렉터 전면 도입)

---

### 14. 반경 검색 / 영역 그리기

**현황**
- 일반 반경 검색: **없다.**
- 유일한 반경 개념은 **답사(Field Survey) 모드**의 고정 500m 필터 (`components/media-map/field-survey-panel.tsx:79`, `140`). 현위치 기준이며 사용자가 반경을 바꿀 수 없다.
- 영역 그리기(폴리곤/자유선): **없다.** `leaflet-draw` 미설치.
- 커버리지 GeoJSON 오버레이는 있으나 **표시 전용**이며 필터로 쓰이지 않는다 (`lib/media-map/map-service-region-coverage-overlay.ts`, `dark-map-view.tsx:270-315`).

**문제** — "이 주소 반경 1km" 는 OOH 영업의 기본 질의인데 불가능하다. 지시서가 든 AdQuick 도 이 기능이 핵심이다.

**권장안** — PR-4 와 묶어서: 지오코딩 결과 좌표 + `L.circle` 렌더 + 클라이언트 `haversineKm` 필터(함수가 `lib/media-data.ts` 에 이미 있음, 매체 상세 추천 캐러셀이 사용 중). 서버 변경 없이 500m/1km/3km 프리셋 가능.
**난이도**: M

---

### 15. 한글 IME 조합 처리 회귀

**현황 — 회귀 없음.**
- 지도 검색창은 `CompositionSearchInput` 을 쓴다 (`components/media/media-manual-browse-filters.tsx:81`, `1206-1208`).
- 내부적으로 `useCompositionControlledInput` 훅이 `onCompositionStart/End` 로 조합 중 controlled 갱신을 막는다 (`components/ui/composition-input.tsx:41-63`).

**문제 (다른 종류)**
- **입력 디바운스가 없다.** `onQueryChange` → `patchBrowseFilters({q})` → `browseFilters.q` 의존 effect 가 즉시 `fetchItems` 호출 (`media-map-page-client.tsx:664-681`).
- `AbortController` 로 이전 요청을 취소하긴 하지만(`fetchItems` 첫 줄), **타자 한 글자마다 서버 요청**이 나가고 서버는 그때마다 전체 카탈로그를 필터링한다(§1).
- 한글 조합 완료 시 한 글자 = 최대 3회 compositionupdate 이지만 `CompositionSearchInput` 이 막아주므로 **조합 완료 시점에만** 발화 — 그래도 "강남역" = 3회 요청.

**권장안** — `q` 에 250~300ms 디바운스. 다른 필터(칩/셀렉트)는 즉시 유지.
**난이도**: S

---

## D. 마커·상세 정보

### 16. 마커 표시 내용 / 상태 구분

**현황**
- 마커 = **data-URI SVG 핀**: 유형별 색상 + 유형 이니셜 문자 + 가시성 점수 tier 외곽 ring (`lib/map-pin-styles.ts:26-47`, `lib/map-pin-icon-data.ts`).
- 크기: 기본 30px, 선택·hover 시 34px.
- **가격은 마커에 표시되지 않는다.** 매체명 라벨만, 그것도 zoom≥17 & 뷰포트 핀 ≤18개 조건에서만 (`lib/map-pin-labels.ts:4-9`).
- 상태 구분: `선택`/`hover` 2가지만. **"담김(플랜 카트)" · "비교함" · "방문함" 상태가 핀에 반영되지 않는다** (`applyMarkerPinIcon` 인자에 selected/hovered 만).

**문제**
- 호갱노노·직방 대비 결정적 차이. **줌인해도 가격이 안 보여서 지도를 훑어 가격대를 파악할 수 없다.** 항상 핀을 하나씩 클릭해야 한다.
- 담은 매체 10개를 고르는 동안 지도에서 뭘 담았는지 알 수 없다 → 중복 클릭 유발.
- 유형 이니셜 문자는 한글 유형명 축약이라 판독성이 낮다 **(추정, 시각 확인 필요)**.

**권장안** — PR-3. zoom≥15 에서 가격 pill 마커(`₩550만~`), 그 이하는 클러스터 개수. 담김 상태는 체크 뱃지. 기본 마커는 무채색, 선택만 강조색(지시서의 강조색 1개 원칙 유지).
**난이도**: M

---

### 17. 마커 클릭 미리보기 카드 내용

**현황** — 변형 4종(`sheet`/`dock`/`inline`/`bottom-sheet`), 실제 사용은 desktop `sheet` + mobile `dock` (`media-map-page-client.tsx:1544-1585`).

| 요소 | desktop `sheet` | mobile `dock` |
|---|---|---|
| 사진 | 1장 (80×64) | 1장 (92×76) |
| 유형·지역 | ○ | ○ |
| 표시가격 | ○ | ○ |
| CPM | ○ (metric 타일) | ○ (가격 옆 인라인) |
| 월 노출 | ○ | ✕ |
| 가시성 점수 | ○ | ✕ |
| 이번 달 가용성 | ○ (별도 API 호출) | ✕ |
| 검증·즉시예약 뱃지 | ○ | ✕ |
| CTA | 상세·문의·비교·담기 | 담기·비교 + "목록에서 보기" |

**문제**
- **모바일 dock 에 "상세 보기"·"문의하기" 링크가 없다** (`layout="map-tile"` — 담기/비교만, `discovery-media-card-actions.tsx:154-176`). 썸네일·제목 탭으로 상세에 가긴 하지만 **명시적 CTA 가 없어 발견되지 않는다.** 모바일이 트래픽 다수인 걸 감안하면 심각.
- 벤치마크 배지(경쟁 매체 대비 CPM 위치)는 어느 변형에도 없다.
- CPM 극단값은 "CPM 산정 중" 으로 숨긴다 (`resolveCpmDisplay`) — 합리적.

**권장안** — mobile dock 액션을 `layout="preview"`(상세·담기·문의 3열, 이미 구현돼 있음)로 교체. **한 줄 변경.**
**난이도**: S

---

### 18. 가격·CPM SSOT 일치 여부 — **불일치 3건 확인**

**현황**
- 가격(표시가) 자체는 일치한다. API 가 `resolveMediaDisplayPrice` 를 서버에서 적용해 `price` 로 내려주고(`route.ts:80`, `84-85`), 카드도 같은 함수를 쓴다.
- `catalogPrice`(DB 대표가)도 함께 내려 CPM 분모용으로 보존 (`route.ts:86-87`).

**불일치 ①: CPM 분자에서 `productPriceWon` 누락**
- 카탈로그/홈 카드 경로는 `resolveMediaPriceForDisplay(item, 30)` 로 **30일 등록 상품가**를 뽑아 `productPriceWon` 으로 넘긴다 (`lib/media-catalog-map.ts:46-48`).
- `resolveCpmMonthlyPriceWon` 은 `productPriceWon` 이 있으면 **그걸 우선**한다 (`lib/media-metrics.ts:85-93`).
- **지도 API 응답에는 `productPriceWon` 필드가 없다** (`route.ts:76-124`). → 지도 카드는 항상 `resolveMonthlyListPriceWon` 폴백.
- **결과: 등록 상품가가 있는 매체는 지도 CPM ≠ 목록/홈 CPM.**

**불일치 ②: 노출수(CPM 분모)에서 v1 엔진 값 누락**
- SSOT `resolvePublicMonthlyImpressions` 는 `engineDailyImpressions > 0 && impressionModelVersion` 이 v1 이면 **`engineDaily × 30.4`** 를 쓴다 (`lib/media-impressions-ssot.ts:113-119`).
- 지도 API 는 `engineDailyImpressions`, `impressionModelVersion`, `monthlyFootTraffic`, `factSheet`, `mediaType/SubCategory/MainCategory/Name` 을 **하나도 내려주지 않는다**. `impressions` 와 `dailyFootTraffic` 뿐 (`route.ts:99-101`).
- → 지도에서는 v1 분기가 절대 타지 않고 `stored` 또는 `foot × 30.4` 폴백으로 떨어진다.
- **결과: v1 엔진 매체는 지도 "월 노출" 과 CPM 이 목록/상세와 다르다.** 폴백 판정 함수(`storedMonthlyLikelyFootTrafficProxy`, `dailyFootfallMirrorsEngineDaily`)도 입력 부족으로 무력화된다.

**불일치 ③: 가격 필터 기준 vs 정렬 기준**
- 정렬은 월환산(`mediaMonthlyEquivalentSortWon`), 필터(`priceMin/Max`)는 표시가 원값 비교. §13 참조.

**권장안** — 지도 API `toMapItem` 에 `productPriceWon`, `engineDailyImpressions`, `impressionModelVersion`, `monthlyFootTraffic` 4필드 추가(항목당 +~60B, gzip 영향 미미). 또는 서버에서 CPM·노출을 **미리 계산해 문자열/숫자로 내려** 클라이언트 재계산을 없앤다(후자가 SSOT 로서 더 견고).
**난이도**: S (필드 추가) / M (서버 선계산)

---

### 19. 현장 확인 수단 (사진 여러 장, 로드뷰 링크)

**현황**
- 미리보기 카드는 **대표 사진 1장**만 (`getPrimaryMediaImageUrl`, `route.ts:90`). 갤러리 없음.
- **로드뷰/거리뷰 링크 없음.** 매체 상세에는 있다(`components/media-detail/roadview-card.tsx`, Kakao 로드뷰 임베드) — 지도 페이지에는 진입점이 없다.
- 답사 모드가 유일한 현장 확인 보조: 현위치 500m 내 매체 목록 + 체크리스트 (`components/media-map/field-survey-panel.tsx`).

**문제** — 지도에서 후보를 추리는 단계가 **현장 감각이 가장 필요한 단계**인데 사진 1장으로 판단해야 한다. 상세로 가야만 로드뷰를 볼 수 있어 왕복 비용이 크다.

**권장안** — PR-7. 미리보기 카드에 ① 사진 스와이프(sampleImages 이미 배열) ② "로드뷰" 버튼 → Kakao 로드뷰 딥링크(좌표만 있으면 되므로 서버 변경 불필요).
**난이도**: S

---

## E. 전환 흐름

### 20. 담기(숏리스트) → 플래너/견적/문의 경로와 탭 수

**현황**
- 담기 = **플랜 카트**(localStorage, `PlanCartToggleButton`). 지도에서 `addedFrom: "map"` 으로 기록 (`media-map-detail-sheet.tsx:104-116`).
- **GA `added_from` / `PlanCartAddedFrom` SSOT** (`lib/plan-cart.ts`): `ai_recommend` · `planner` · `search` · `map` · `package` 만 존재. **`list` / `detail` / `media_list` 구분값은 타입·스키마에 없음** — `/media` 목록·`/media/[id]` 상세·그리드·릴스 등 대부분 UI는 prop으로 **`search`를 하드코딩** (`PlanCartAddButton`/`DiscoveryMediaCardActions`). 지도만 `map`, AI 경로만 `ai_recommend`. “목록 vs 지도” 비교는 **`search` vs `map`** 으로만 가능(의도된 coarse grain, 버그 아님). 더 촘촘한 분해가 필요하면 enum·prop 전수 변경이 별도 티켓.
- 비교 = 별도 카트(`tkad-compare-cart-v1`), 하단 `CompareBar` (`media-map-page-client.tsx:1666-1674`).

| 목적지 | 경로 | 탭 수 |
|---|---|---|
| 상세 | 마커 → dock 썸네일/제목 탭 | 2 (desktop 은 "상세 보기" 버튼으로 2) |
| 문의 | 마커 → (desktop) "문의하기" → `/contact?media=<id>` | 2 / **모바일은 dock 에 버튼 없음** |
| 담기 | 마커 → "담기+" | 2 |
| 담은 매체 확인 | 헤더 카트 아이콘 → `/my/plan` | +1 |
| 비교 | 마커 → "비교+" → 하단 바 → `/compare?ids=` | 3 |
| **플래너** | **지도에서 직접 가는 경로 없음** | — |

**문제**
- **지도 → 플래너 직결 경로가 없다.** 매체 상세에는 `/planner?addMedia=<id>` 가 있는데(AGENTS.md 문서화됨) 지도 카드에는 없다.
- **담은 매체를 지도에서 볼 수 없다.** 하단 트레이가 비교 카트용(`CompareBar`)만 있고 플랜 카트는 헤더 배지 숫자뿐 → 합계 예산도, 담은 목록도 지도에서 안 보인다.
- 담기 한도: 비로그인/무료 **10개**, PRO 무제한 (`lib/entitlements/constants.ts:28-34`). 한도 초과 시 토스트로만 알림.

**권장안** — PR-5. 하단 숏리스트 트레이(담은 N건 · 합계 예산 · [플래너로] [견적 요청] [비교]). 카트가 이미 localStorage SSOT 라 **UI 작업만**으로 가능.
**난이도**: M

---

### 21. 비로그인 / 무료 / PRO 차등, 페이월 지점

**현황**
- **지도 페이지 자체에 인증 게이트도 페이월도 없다.** `components/media-map/**`, `lib/media-map/**` 전체에 `useSession`/`isPro`/paywall 참조가 없다.
- 유일한 차등: 담기 한도 10 vs 무제한 (`usePlanCart` → `useIsPro`).
- 가격·CPM·노출수 모두 비로그인에게도 그대로 노출.

**문제** — 진단 관점에서는 문제 없음(오히려 SEO·전환에 유리). 다만 **PRO 전환 유인이 지도에 하나도 없다.** 무료 사용자가 11번째 매체를 담을 때만 PRO 를 만난다.

**권장안** — 유지. PRO 유인은 "담은 매체 저장·공유", "지도 링크 공유"(§24) 같은 **기능 확장으로** 붙이는 게 자연스럽다.
**난이도**: —

---

### 22. 카카오채널톡·문의 CTA 위치

**현황**
- 문의 CTA: desktop 미리보기 카드 내 "문의하기" → `/contact?media=<id>` (`discovery-media-card-actions.tsx:218-226`). **모바일 dock 에는 없음(§17).**
- 카카오채널: `KAKAO_CHANNEL_PUBLIC_URL` 은 푸터에만 (`components/public-chrome/footer-brutal.tsx:156`). **그 푸터는 지도 라우트에서 CSS 로 숨겨진다** (`app/globals.css:1193-1195`).
- 플로팅 채널톡 위젯: `DeferredPublicWidgetsGate` 안에 카카오 참조 없음 → 지도 페이지에 **상시 문의 진입점 0개**.

**문제** — 지도는 "탐색 중 질문이 생기는" 화면인데 **상시 문의 버튼이 하나도 없다.** 매체를 하나 선택해야만 문의로 갈 수 있고, 모바일은 그것조차 없다.

**권장안** — §17 수정(모바일 dock 문의 버튼) + 지도 우하단 floating 채널톡 버튼(줌 컨트롤과 충돌 주의 — 줌 컨트롤이 `bottomright`, `dark-map-view.tsx:421`).
**난이도**: S

---

## F. URL 상태·공유

### 23. URL 반영 범위 / 새로고침·뒤로가기

**현황**
- 반영됨: `lat`, `lng`, `zoom`, `q`, `mainCategory`, `subCategory`, `target`, `regionMain`, `regionSub`, `priceMin`, `priceMax`, `features`, `sort` (`lib/media-map/url-state.ts:36-52`, `126-148`).
- 300ms 디바운스 후 `history.replaceState` (`media-map-page-client.tsx:457-472`, `url-state.ts:155-166`).
- 복원: 초기 1회 lazy init 으로 파싱 → `programmaticView` + `browseFilters` 시드 (`media-map-page-client.tsx:197-235`). 좌표·줌 유효성 검증 있음(한국 영역 밖 좌표 폐기).

**문제**
- **선택 매체(`selectedId`)가 URL 에 없다.** 링크를 열면 지도는 같은 곳을 보지만 **아무것도 선택되지 않은 상태**다.
- **`replaceState` 만 쓴다 → 뒤로가기로 이전 지도 상태로 돌아갈 수 없다.** 필터를 5번 바꿔도 history 엔트리는 1개. 뒤로가기는 `/media/map` 을 통째로 떠난다.
- 줌 라운드트립이 손실적이다: `kakaoLevelToLeafletZoom` 은 `19 - level×1.2` 를 반올림, 역변환은 `(19 - zoom)/1.2` 반올림 (`lib/public-dark-map-config.ts:120-131`). **공유 링크를 열면 줌이 1단계 어긋날 수 있다** (예: leaflet 15 → kakao 3 → leaflet 15.4→15, 경계값에서 틀어짐) **(추정, 경계값 확인 필요)**.
- `survey=1` 은 읽기만 하고 쓰지 않는다 (`media-map-page-client.tsx:389-396`) — 답사 모드가 URL 에 반영 안 됨.
- 답사 체크 상태, 시트 스냅, 지하철 오버레이 on/off, 지역검색 모드는 URL 이 아니라 localStorage.

**권장안** — PR-1. ① `selected=<mediaId>` 추가 ② 사용자 주도 필터 변경은 `pushState`(지도 이동은 `replaceState` 유지) ③ 줌은 Leaflet zoom 을 그대로 저장하거나 소수 1자리 보존.
**난이도**: S

---

### 24. 링크 공유 시 화면 재현 (영업 시나리오)

**현황** — 부분적으로 된다. 중심·줌·필터는 복원, **선택 매체는 복원 안 됨**(§23).

**문제 — 영업 시나리오에서 실질적으로 쓸 수 없다**
1. "이 매체 보세요" 링크를 못 만든다(선택 상태 미보존). 대안은 `/media/<id>` 상세 링크인데 그러면 주변 맥락이 사라진다.
2. 담은 매체 목록(숏리스트)이 **localStorage 전용**이라 링크로 공유 불가. "이 5개 후보 보세요" 가 불가능.
3. OG 이미지는 정적 브랜드 이미지 (`app/[locale]/(site)/media/map/opengraph-image.tsx`) — 카톡으로 링크를 보내도 **어느 지역 무슨 매체인지 미리보기에 안 나온다.**
4. 지도 라우트는 `dynamic = "force-dynamic"`, `revalidate = 0` (`page.tsx:5-6`) — OG 는 정적이라 무의미.

**권장안** — PR-1 + PR-5 이후: ① `selected` URL 파라미터 ② 숏리스트를 서버 저장(플래너의 `SavedPlannerPlan` 30일 TTL 패턴 재사용) → `/media/map?plan=<id>` ③ 동적 OG(선택 매체 썸네일 + 지역명 + 건수).
**난이도**: M

---

## G. 모바일

### 25. 레이아웃 구조 (전체화면 지도 + 바텀시트)

**현황** — 구조는 맞다.
- `md` 미만(`max-width: 767px`)에서 지도 풀스크린 + 바텀시트 (`media-map-page-client.tsx:404-411`, `1640-1659`).
- **스냅은 2단뿐**: `peek`(핸들+헤더 ~56px) / `full`(96%). 3단 아님 (`components/media-map/media-map-list-sheet.tsx:22`).
- 드래그 + 관성(fling velocity ≥0.45 px/ms) + 탭 토글 지원 (`media-map-list-sheet.tsx:163-196`).
- peek 상태에서 마커 선택 시 시트 위에 **preview dock** 이 뜬다 (`media-map-page-client.tsx:1576-1585`, `bottom: peekChromeHeight + 8`).
- 레이아웃/스냅 변경마다 `invalidateNonce` 로 `map.invalidateSize()` (`dark-map-view.tsx:78-96`).

**문제**
- 중간 단계(리스트 2~3장이 보이는 40~50%)가 없어 **"지도 보면서 목록 훑기" 가 불가능하다.** peek 은 헤더만, full 은 지도를 거의 덮는다.
- full 스냅에서 지도가 96% 가려지는데도 지도 인스턴스는 계속 살아 있다(비용 낭비, 단 `invalidateSize` 로 관리는 됨).

**권장안** — PR-6. `half`(45%) 스냅 추가. `translateForSnap` 이 이미 함수라 상수 1개 + 분기 추가로 끝난다.
**난이도**: S

---

### 26. 제스처 충돌 / safe-area / 하단 고정 버튼 겹침

**현황**
- 지도 컨테이너 `touch-none` (`dark-map-view.tsx:346`, `407`) → 지도 위 스와이프가 페이지 스크롤로 새지 않음.
- 바디 스크롤은 지도 라우트에서 `overflow: hidden` 으로 차단 (`app/globals.css:1190-1192`).
- 시트 크롬은 `touch-none select-none` + `setPointerCapture` (`media-map-list-sheet.tsx:212-218`).
- safe-area: 셸 높이에 `env(safe-area-inset-bottom)` 반영 (`globals.css:1200`), 시트 목록 하단 패딩도 `max(0.75rem, env(safe-area-inset-bottom))` (`media-map-list-sheet.tsx:277`).
- 겹침 회피: preview dock 은 `peekChromeHeight` 만큼 띄우고(`ResizeObserver` 로 실측), 데스크톱 상세 시트는 `floatingBarOffset` 으로 CompareBar 를 피한다 (`media-map-page-client.tsx:1544-1553`).

**문제**
- z-index 층이 매우 많고 하드코딩돼 있다: 10, 11, 12, 25, 35, 40, 45, 46, 47, 80, 85, 90. 층 계약이 문서화돼 있지 않아 **새 오버레이를 추가할 때 겹침 회귀가 나기 쉽다.**
- `CompareBar`(하단 고정) + 모바일 탭바(4.25rem) + peek 시트 + preview dock 이 동시에 뜨면 **하단 4겹**. 모바일에서 비교 2건 담고 마커를 고르면 화면 하단 절반이 크롬 **(추정, 실기기 확인 필요)**.
- 시트 목록 스크롤이 맨 위일 때 아래로 당기면 시트가 닫혀야 자연스러운데, 크롬(핸들)에서만 드래그를 받는다 → 목록 영역 드래그로는 못 닫는다.

**권장안** — z-index 를 CSS 변수 스케일로 승격하고 층 표를 `AGENTS.md` 에 기록. 하단 크롬 동시 표출 시나리오 1회 실기기 점검.
**난이도**: S (문서화) / M (하단 크롬 정리)

---

### 27. 터치 타깃 44px / 한 손 조작

**현황**
- 대부분 `h-9`(36px) ~ `h-10`(40px). 예: `MapFloatingButton` 기본 h-10, 카드 액션 버튼 `!h-8`(32px)·`!h-7`(28px) (`discovery-media-card-actions.tsx:107`, `136`, `156`), 닫기 버튼 `h-8 w-8`/`h-9 w-9`.
- peek 칩만 `min-h-9` 로 명시 (`media-map-peek-discoverability-chips.tsx:15`).

**문제**
- **WCAG 2.5.5(44×44 CSS px) 를 만족하는 터치 타깃이 거의 없다.** 특히 지도 카드의 담기/비교 버튼 `h-7`(28px) 은 iOS HIG(44pt) 의 64% 수준.
- 한 손 조작: 주요 조작이 **화면 상단**에 몰려 있다 — 필터 바(최상단), "이 지역에서 검색"(상단 중앙, `top-3`), 내 주변·답사(우상단 `top-3`). 엄지 도달 영역(하단 1/3) 에는 시트 핸들뿐.

**권장안** — ① 지도 컨텍스트 버튼 최소 크기를 `h-11`(44px)로 ② "내 주변"·"답사" 를 우하단으로 이동(엄지 영역) — 줌 컨트롤(`bottomright`)과 충돌하므로 줌 컨트롤 위치 재배치 필요.
**난이도**: S (크기) / M (레이아웃 재배치)

---

## H. SEO·접근성·다국어

### 28. SSR/ISR 콘텐츠 / 지역 정적 랜딩 / 상호 링크 — **가장 큰 SEO 공백**

**현황**
- `page.tsx` 는 `export const dynamic = "force-dynamic"; export const revalidate = 0;` 이고 본문은 `<MediaMapPageClient />` 하나다 (`app/[locale]/(site)/media/map/page.tsx:5-27`).
- `MediaMapPageClient` 는 `"use client"`, 데이터는 전부 `useEffect` → `fetch`. 지도는 `dynamic(ssr:false)`.
- **→ 서버 HTML 에 매체 이름/가격/지역이 단 한 글자도 없다.** 지시서의 외부 관찰과 일치.
- 지역 랜딩은 **존재한다**: `/media/region/[region]`, `/media/area/[area]`, `/local/[region]`.
- 상호 링크는 **단방향**: 지역 랜딩 → 지도 (`app/[locale]/(site)/media/region/[region]/page.tsx:131` 의 `/media/map?region=…`, `app/[locale]/(site)/media/area/[area]/page.tsx:163`). **지도 → 지역 랜딩 링크는 없다.**
- `/media/map` 은 sitemap 에 포함돼 있다 (`lib/seo.ts:128`).

**문제**
- 검색엔진·AI 크롤러에게 `/media/map` 은 **빈 페이지**다. sitemap 에 올려놨으니 크롤은 되지만 색인 가치가 0에 수렴하고, 얇은 콘텐츠로 사이트 전체 품질 신호에 마이너스가 될 수 있다 **(추정)**.
- `force-dynamic` + `revalidate = 0` 인데 **서버에서 아무것도 렌더하지 않으므로 동적일 이유도 없다.** 순수 비용.
- 지도가 지역 랜딩으로 내보내는 링크가 없어 **내부 링크 그래프에서 막다른 골목(dead end)** 이다.

**권장안** — PR-8.
1. 서버 컴포넌트에서 `getPublicMediaMapCatalogCached()` 로 **상위 N건(예: 가시성 상위 30건) + 지역별 건수**를 가져와 `<noscript>` 가 아닌 **실제 DOM**(시각적으로는 접힌 섹션 또는 하단 "지역별 매체" 블록)으로 렌더.
2. 지도 하단에 **지역 링크 그리드**(서울 강남구 42건 → `/media/region/gangnam`) 를 서버 렌더 → 양방향 링크 + 크롤 경로 확보.
3. `force-dynamic` 을 `revalidate = 300` ISR 로 전환.
**난이도**: M

---

### 29. 구조화 데이터

**현황**
- 지도 페이지에 **JSON-LD 가 전혀 없다.** `page.tsx`·`layout.tsx` 어디에도 없음.
- 반면 빌더는 다 있다: `buildMediaPlaceJsonLd`, `buildMediaCatalogItemListJsonLd`, `buildCollectionPageJsonLd`, `buildBreadcrumbJsonLd` (`lib/structured-data.ts:156`, `382`, `442`, `463`) — 매체 상세·카탈로그 페이지가 사용 중.

**문제** — 재사용 가능한 빌더가 있는데 지도만 빠져 있다. 콘텐츠가 서버에 없으니 넣어도 의미가 약했던 것으로 보이며, §28 을 하면 자연스럽게 해결된다.

**권장안** — §28 과 함께 `CollectionPage` + `ItemList`(상위 N건) + `BreadcrumbList` 주입. 빌더 재사용이므로 추가 비용 거의 없음.
**난이도**: S (§28 이후)

---

### 30. 푸터 접근성 / 지도 컨트롤 키보드 / 색 대비

**푸터 — 지시서 지적 사항 확인 결과**

| 지적 | 코드 확인 결과 |
|---|---|
| 푸터에 라벨 없는 `/ko/my/plan`, `/ko/contact` 링크 | **재현 못 함.** `FooterBrutal` 의 모든 링크에 텍스트 라벨이 있고, 아이콘 전용 링크(카카오·인스타)에는 `aria-label` 있음 (`footer-brutal.tsx:160`, `169`). `HeaderCartLink`(`/my/plan`)도 `aria-label` 보유 (`components/header-cart-link.tsx:36`, `59-61`). 번역 키도 전부 채워져 있음(`messages/ko.json` 확인). |
| 내용이 빈 `<li>` 6개 | **재현 못 함.** 다만 `footerColumns` 가 `section.links.slice(0, 6)` 으로 **컬럼당 정확히 6개**를 자른다 (`footer-brutal.tsx:101-108`) — "6개" 라는 숫자의 출처로 의심된다. `buildSitemapSections` 가 빈 label 을 반환하는 경우가 있는지 별도 확인 필요 **(추정)**. |
| "사이트맵" 텍스트가 링크 없이 존재 | **사실.** `<button onClick={setSitemapOpen}>` 이다 (`footer-brutal.tsx:240-245`, `321-327`). 모달을 여는 버튼이라 `<button>` 자체는 올바르지만, **크롤러에게는 사이트맵으로 가는 링크가 없는 것과 같다.** |

**추가 발견 — 푸터가 지도 페이지 HTML 에 그대로 남아 있다**
- `body:has(.tkad-media-app-shell) .tkad-site-footer { display: none; }` (`app/globals.css:1193-1195`) — **CSS 로만 숨긴다. DOM 에는 존재한다.**
- 게다가 `useMediaMinWidth(768)` 이 SSR 에서 항상 `false` 를 반환하므로 (`lib/use-media-min-width.ts:10`), **서버 HTML 에는 항상 모바일 푸터가 나가고 하이드레이션 후 데스크톱 푸터로 교체**된다. 외부 스캐너가 본 푸터 = 모바일 변형일 가능성이 높다.
- 즉 "매체 0건 + 숨겨진 푸터" 가 크롤러가 보는 `/media/map` 의 전부다.

**지도 컨트롤 키보드 접근성**
- Leaflet 기본 `ZoomControl`(`dark-map-view.tsx:421`) 은 `<a>` 라 탭 도달은 된다.
- **마커는 키보드로 도달 불가**하다. `L.marker` 기본 아이콘은 `keyboard` 옵션이 있으나 여기선 `L.icon`(img) 커스텀 + `marker.on("click")` 만 바인딩 (`dark-map-markers-layer.tsx:329-344`) → **탭·엔터로 매체 선택 불가.**
- 우회로는 있다: 좌측 목록 카드가 포커스 가능하고 `onFocus` 로 hover 브리지를 쏜다 (`media-map-item-list.tsx:105`). 즉 **목록이 사실상 유일한 키보드 경로**다.
- `role="dialog"` 시트/dock 에 **포커스 트랩·초기 포커스·Escape 닫기가 없다** (`media-map-detail-sheet.tsx:566-600`). 데스크톱 시트는 `aria-modal` 까지 선언해놓고 트랩이 없어 오히려 위험.
- 지도 컨테이너에 `role`/`aria-label` 없음.

**색 대비**
- 정적 확인만 가능. 주의 지점: `tkad-type-note`/`text-tkad-muted` 계열의 보조 텍스트, 다크 모드 `text-white/45`·`text-white/35`(푸터 legal) 가 4.5:1 미만일 가능성 **(추정, 실측 필요)**.
- 클러스터 아이콘은 브랜드 accent 배경 + 흰 텍스트 — accent 값에 따라 대비 확인 필요 (`dark-map-markers-layer.tsx:63-78`).

**권장안**
1. "사이트맵" 버튼 옆에 실제 `/sitemap` 링크 또는 `<a href>` 기반 진행적 향상 — S
2. 시트/dock 에 Escape 닫기 + 초기 포커스 + 포커스 트랩 — S
3. 마커 키보드 접근(목록 카드 → 엔터로 선택하는 현 경로를 문서화하고, 지도에 `role="application"` + 안내 텍스트) — M
4. 대비 실측 후 토큰 조정 — S
**난이도**: S~M

---

### 31. ko/en/ja/zh 번역 커버리지

**현황 — 지도는 ja/zh 를 전혀 지원하지 않는다.**
- 라우팅 locale 은 **`["ko", "en"]` 둘뿐** (`i18n/routing.ts:3-6`). `messages/ja.json`·`messages/zh.json` 파일은 존재하지만 **라우팅되지 않는다.** → `/ja/media/map` 은 존재하지 않는 URL.
- 그리고 지도 컴포넌트는 `next-intl` 메시지를 거의 쓰지 않는다. **`const isKo = locale === "ko"` 삼항 하드코딩**이 지배적이다.
  - `media-map-page-client.tsx` 에만 `isKo ? "…" : "…"` 패턴이 60곳 이상.
  - 예: `media-map-page-client.tsx:1230-1247`(목록/지도 토글), `1449-1460`(핀 상한 안내), `components/media-map/media-map-floating-empty.tsx:24-32`.
- **한국어 전용 문자열**(영문 대응 없음)도 있다: `"지도 불러오는 중…"` (`media-map-page-client.tsx:104-110`), 답사 패널 `"반경 500m 내 …"` (`field-survey-panel.tsx:140`), geolocation 오류 메시지 전부 (`media-map-page-client.tsx:1054-1058`).

**문제**
- 언어 추가 시 **컴포넌트 60여 곳을 직접 고쳐야 한다.** ja/zh 확장 비용이 사실상 재작성 수준.
- `isKo` 이분법이라 en 이 아닌 locale 이 들어오면 전부 영어로 떨어진다(현재는 locale 이 2개뿐이라 드러나지 않음).

**권장안** — 지도 문자열을 `messages/*.json` 의 `mediaMap.*` 네임스페이스로 추출하고 `useTranslations("mediaMap")` 으로 전환. ja/zh 라우팅 활성화는 그 다음. 지금 단계에서는 **신규 문자열만이라도 메시지 파일에 넣는 규칙**을 세우는 게 현실적.
**난이도**: L (전체 추출) / S (규칙 수립)

---

## I. 계측

### 32. 지도 이벤트 트래킹 현황

**현황 — 지도 관련 트래킹이 0건이다.**
- `components/media-map/**`, `components/public-map/**`, `lib/media-map/**` 전체에 `trackEvent`/`trackGaEvent`/`gtag`/`dataLayer` 호출이 **하나도 없다**(grep 결과 매치는 전부 Tailwind `tracking-*` 클래스와 `MapTileLoadingTracker` 라는 이름뿐).
- 더 심각한 것: **`CART_USAGE_EVENT_PLAN`(`add_to_plan_cart`) 이벤트가 정의만 되고 어디서도 호출되지 않는다** (`lib/ga-events.ts:24`, `75` — 정의부와 자기 참조뿐). `addedFrom: "map"` 을 열심히 넘기고 있는데 **GA 로 나가질 않는다.**
- 있는 계측은 `performance.mark` 두 개뿐 (`lib/media-map/map-performance.ts`) — GA/RUM 으로 전송되지도 않는다.

**문제**
- **지도의 전환 기여도를 측정할 방법이 전혀 없다.** 이 로드맵의 어떤 PR 이 효과가 있었는지 판정 불가.
- 퍼널(지도 진입 → 마커 클릭 → 담기 → 문의)의 어느 단계에서 새는지 모른다.

**권장안 — 최소 이벤트 세트 (PR-10)**

| 이벤트 | 파라미터 | 발화 지점 |
|---|---|---|
| `map_view` | `entry`(direct/region/deeplink), `has_filters` | 초기 fetch 성공 시 |
| `map_area_search` | `mode`(auto/manual), `zoom`, `result_count` | `runSearch` 성공 |
| `map_filter_apply` | `filter_key`, `value`, `result_count` | `patchBrowseFilters` |
| `map_search_query` | `q_length`, `resolved_region`, `result_count` | 텍스트 검색 결과 수신 |
| `map_marker_click` | `media_id`, `zoom`, `source`(pin/list) | `handleSelect` |
| `map_media_detail_click` | `media_id` | 카드 상세 링크 |
| `add_to_plan_cart` | `media_id`, `source: "map"`, `action` | **`PlanCartToggleButton` — 기존 정의 연결만 하면 됨** |
| `map_compare_add` | `media_id`, `cart_size` | `toggleCompare` |
| `map_contact_click` | `media_id` | 문의 CTA |
| `map_empty_result` | `filters_json`, `bounds_area` | 빈 상태 표시 |
| `map_usable_ms` | `duration` | `markMapPageUsable` → `trackEvent` |

**난이도**: S (`add_to_plan_cart` 연결) / M (전체 세트)

---

## 임팩트 TOP 10 · PR 단위

우선순위는 **(효과 × 확실성) ÷ 비용** 기준. 1~3번은 비용이 거의 0인데 효과가 크다.

| # | 항목 | 진단 근거 | PR 단위 | 난이도 |
|---|---|---|---|---|
| **1** | **계측 0건 — `add_to_plan_cart` 미연결 포함** | §32. 정의된 이벤트조차 호출 안 됨 | **PR-10 (선행)** 최소 세트 6개 + 기존 이벤트 연결 | S→M |
| **2** | **VWorld 운영키 미등록 → 한국어 라벨 품질 저하** | §6. `public-vworld-map-config.ts:12-16` 의 TODO | **PR-0** 키 발급·Vercel Production env 등록 (코드 변경 0) | S |
| **3** | **모바일 미리보기에 상세·문의 CTA 없음** | §17, §22. `layout="map-tile"` → `"preview"` 한 줄 | **PR-0** 핫픽스 | S |
| **4** | **서버 HTML 에 매체 0건 + 지도→지역 랜딩 링크 없음** | §28, §29. 색인 가치 0, 내부 링크 dead end | **PR-8** SSR 요약 + 지역 링크 그리드 + JSON-LD + ISR | M |
| **5** | **CPM·노출수 SSOT 불일치 2건** | §18. `productPriceWon`·`engineDailyImpressions` 누락 | **PR-2.5** API 4필드 추가 or 서버 선계산 | S→M |
| **6** | **마커에 가격 없음 + 담김 상태 미반영** | §16. 지도를 훑어 가격대 파악 불가 | **PR-3** 가격 pill 마커 + 담김 뱃지 | M |
| **7** | **POI·주소·반경 검색 부재** | §11, §14. 카카오 로컬 라이브러리는 이미 보유 | **PR-4** 자동완성 + 반경 원 필터 | M |
| **8** | **URL 에 선택 매체 없음 + 뒤로가기 불가 → 영업 링크 공유 불가** | §23, §24 | **PR-1** `selected` 파라미터 + pushState + 줌 정밀도 | S |
| **9** | **숏리스트 트레이 없음 · 지도→플래너 경로 없음** | §20. 담은 매체가 지도에서 안 보임 | **PR-5** 하단 트레이(건수·합계·플래너/견적) | M |
| **10** | **모바일 시트 2단 + 터치 타깃 <44px + 한 손 조작 불가** | §25, §27 | **PR-6** `half` 스냅 + 타깃 44px + 컨트롤 하단 이동 | S→M |

**번외(비용 S, 언제든):** 검색어 디바운스(§15), 마커 hover→목록 하이라이트(§9), 시트 Escape·포커스 트랩(§30), `home-hero-map-card.tsx` 정리(§5), 핀 라벨 최소 zoom 17→16(§3).

**권장 순서:** PR-0(2·3) → PR-10(1) → PR-1(8) → PR-2.5(5) → PR-8(4) → PR-3(6) → PR-5(9) → PR-4(7) → PR-6(10)
계측을 앞에 두는 이유는 그 뒤의 모든 PR 효과를 측정하기 위해서다.

---

## 스택 판단: Leaflet + 래스터 타일 유지 vs MapLibre GL(벡터 타일) 전환

### 수치로 본 현재 부하

| 지표 | 값 | 출처 |
|---|---|---|
| 전체 매체 수 | 865건 (지시서 제시) | — |
| 동시 렌더 마커 상한 | **50~150개** (zoom tier) | `lib/media-map/map-pin-response-limit.ts:25-36` |
| 클러스터 해제 zoom | 16 | `dark-map-markers-layer.tsx:252` |
| 응답 크기(150건) | raw 103 KB / gzip 12.5 KB | 본 보고서 실측(합성) |
| 응답 크기(865건 전량 가정) | raw 597 KB / gzip 68 KB | 동상 |
| 마커 구현 | DOM `<img>` + data-URI SVG, 아이콘 캐시 | `lib/map-pin-styles.ts:26-47` |

### 판단: **전환하지 말 것. 현 스택 유지.**

**근거**
1. **DOM 마커의 실질 한계는 보통 500~1,000개**인데, 이 페이지는 **줌별 상한(최대 150) + markercluster + chunked add** 로 **이미 그 아래에 고정**돼 있다. 865건을 한꺼번에 그리는 일 자체가 발생하지 않는다.
2. 전량(865)을 다 그린다 해도 gzip 68 KB / DOM 노드 865개 수준으로, 벡터 타일이 필요한 규모(수만~수십만 피처)와 **두 자릿수 차이**다.
3. 현재 체감 병목은 렌더가 아니라 **① 서버의 전량 카탈로그 로드(§1) ② SSR 콘텐츠 부재로 인한 LCP(§28) ③ 타일 라벨 품질(§6)** 이다. **셋 다 MapLibre 로 바꿔도 해결되지 않는다.**
4. 전환 비용: `dark-map-view` / `dark-map-markers-layer` / `metro-overlay-layer` / `map-pin-styles` / `leaflet-map-host` / `lazy-seoul-metro-overlay-layer` 재작성 + 클러스터 재구현(Supercluster) + 커버리지 GeoJSON 재구현 + Kakao level↔zoom 매핑 재검증. **최소 2~3주**이고, 그 기간에 TOP 10 중 8개를 끝낼 수 있다.
5. 한국 벡터 타일 공급자 선택지도 제한적이다. VWorld 는 현재 WMTS 래스터 기준으로 붙어 있고, 벡터 타일 전환은 **공급자 재선정 + 스타일 제작**이라는 별도 프로젝트가 된다.

### 전환을 재검토해야 할 조건 (트리거)

- 활성 매체가 **5,000건**을 넘고, 줌별 핀 상한을 **500 이상**으로 올려야 하는 요구가 생길 때
- 히트맵/인구통계 레이어(PR-9)를 **수천 개 폴리곤**으로 상시 렌더해야 할 때 — 래스터 + Leaflet GeoJSON 은 여기서 먼저 무너진다
- 3D 건물·기울기 등 GL 전용 표현이 제품 요구가 될 때
- 국내 벡터 타일 공급자(VWorld 벡터 등)가 안정화되어 한국어 라벨 품질이 래스터를 앞설 때

### 대신 지금 할 것 (동일 효과, 1/10 비용)

1. 핀 라벨 최소 zoom 17→16 (클러스터 해제 시점과 정렬) — §3
2. 지도 API 에 CDN 캐시 헤더 + Prisma `select` 축소 — §1
3. 성능 기준선 측정(`tkad-map-usable` 을 GA 로 전송) — §4, §32
4. 히트맵(PR-9) 은 **Leaflet.heat + 집계된 그리드 데이터**로 먼저 시도 — 원시 포인트 수천 개를 그대로 던지지 말 것

---

## 부록: 확인하지 못한 항목 (Phase 0.5 필요)

| 항목 | 이유 | 필요한 작업 |
|---|---|---|
| Lighthouse 모바일 LCP/INP/TBT (§4) | 정적 분석 범위 밖 | Preview 배포에서 4× throttle 3회 측정 |
| 저사양 기기 줌/패닝 프레임 드랍 (§4) | 동상 | 실기기 또는 CPU throttle 프로파일 |
| 실제 API 응답 크기·TTFB (§1) | DB 미연결 | 프로덕션 `curl` 실측 |
| 타일 요청 수·캐시 헤더 (§6) | 외부 CDN | DevTools Network 집계 |
| 색 대비 실측 (§30) | 토큰 계산 필요 | axe DevTools / Lighthouse a11y |
| 빈 `<li>` 6개 재현 (§30) | 소스에서 재현 불가 | 프로덕션 HTML 에서 `buildSitemapSections` 출력 확인 |
| og:image vs twitter:image 해시 차이 | 소스상 **동일 함수**(`segmentOpenGraphImages`)를 쓰므로 동일해야 함 (`map/layout.tsx:29-43`) | 배포 HTML `<meta>` 실물 대조. Next 파일 컨벤션(`opengraph-image.tsx`)이 og 쪽에만 해시 쿼리를 붙였을 가능성 **(추정)** |
| 하단 크롬 4겹 겹침 (§26) | 실기기 필요 | 비교 2건 + 마커 선택 상태로 모바일 점검 |

---

## Phase 1 배치 2 — 머지·측정 기록

**GA4 비교:** 배치 1 기준선 **2026-09-23**. 아래 머지 시점 이후 **1주** vs 이전 1주로 필터 사용 세션·지도→담기·모바일 CTA 등 전/후 비교.

| PR | 내용 | 머지 (UTC) | merge commit |
|---|---|---|---|
| [#663](https://github.com/THINKAD-web/tkad-web/pull/663) | PR-4 ISR 셸 · `force-dynamic` 제거 · map client `ssr:false` | 2026-09-23T03:42:49Z | `909c4191` |
| — | PR-5 서버 전량 카탈로그 | **스킵** (§1 재확인: `page.tsx` 미로드) | — |
| [#664](https://github.com/THINKAD-web/tkad-web/pull/664) | PR-6 `(site-media-map)` · 푸터 DOM 제외 | 2026-09-23T03:45:44Z | `ba1318f6` |

### Lighthouse 모바일 (`/ko/media/map`, simulated, 3회 중앙값)

측정일 **2026-09-23** (로컬 Lighthouse 13, `scripts/lighthouse-map-runs.mjs`). Before = `git-main` URL, After = PR-4 branch Preview (#663).

**⚠️ 2026-09-23 env 정렬 확인 — 배치 2 LCP 비교도 confound:** `vercel inspect` 기준 **`tkad-web-git-main-…vercel.app` alias는 `target: production`** (`tkad.co.kr`와 동일 빌드). Production env에는 **`NEXT_PUBLIC_VWORLD_API_KEY` 없음** → 라이트·다크 모두 Carto 키도 없어 **런타임 basemap = OSM**. PR-4 Preview는 **`target: preview`** → 빌드 시 VWorld 키 포함 → **LCP 타일 = VWorld**. 따라서 Before **15.0 s (OSM)** vs After **14.9 s (VWorld)** 는 **PR-4 코드 효과만으로 해석 불가** (타일 호스트·env 차이).

| Metric | Before (main Preview) | After (PR-4 Preview) | 배치 2 판정 |
|--------|------------------------|----------------------|-------------|
| FCP | 1.8 s | 1.7 s | — |
| **LCP** | **15.0 s** | **14.9 s** | **목표 미달** (Δ 0.1 s ≈ 오차, 여전히 ~15 s) |
| INP | lab N/A¹ | lab N/A¹ | — |
| TBT | 1,654 ms | 1,503 ms | 소폭 개선 (~150 ms) |

¹ Lab run에서 `interaction-to-next-paint` 미산출 — 프로덕션 INP는 CrUX/GA4 field.

**LCP 해석 (롤백 사유 아님, 다음 배치 후보)**  
- PR-4 목적(서버 셸·SEO DOM)은 **달성**: HTML에 h1·지역 링크 존재. **LCP 개선 목표는 달성하지 못함.**  
- Lighthouse가 잡은 **LCP 후보는 셸 `h1`/텍스트가 아니라 Leaflet 지도 타일 `img.leaflet-tile`** (before: OSM 타일 URL, after: VWorld WMTS 타일). `lcp-discovery-insight`: LCP 리소스가 **initial document에서 discoverable 하지 않음** → 클라이언트 지도 번들·Leaflet 초기화·타일 fetch 이후에 LCP가 확정된다.  
- **FCP ~1.7 s vs LCP ~15 s** — 초기 페인트(크롬 등)와 “가장 큰 콘텐츠” 시점이 분리. `dynamic(..., { ssr: false })` 셸 분리만으로는 **LCP 후보가 여전히 클라이언트 지도 자산**이다.  
- **다음 배치 후보 (원인·우선순위는 미확정):** LCP 전략을 SEO 셸과 분리 — 예: visible above-the-fold placeholder, 지도 청크/타일 로드 순서, hero 정적 이미지·`fetchpriority`, 또는 LCP 메트릭과 제품 “지도 가용” 메트릭(`tkad-map-usable` 등) 분리 측정.

Preview: [main](https://tkad-web-git-main-mannote-6701s-projects.vercel.app/ko/media/map) · [PR-4](https://tkad-web-git-feat-map-batch2-pr4-03c145-mannote-6701s-projects.vercel.app/ko/media/map). PR-6 rebase Preview HTML 재확인: h1·`seoul_gangnam`·`tkad-site-footer` 없음 (200).

---

## Phase 1 배치 3 — LCP·타일 로딩 (머지·측정 기록)

| PR | 내용 | 머지 (UTC) | merge commit |
|---|---|---|---|
| [#667](https://github.com/THINKAD-web/tkad-web/pull/667) | PR-7 타일 호스트 `preconnect` / `dns-prefetch` | 2026-09-23T04:12:26Z | `24041506` |
| [#670](https://github.com/THINKAD-web/tkad-web/pull/670) | PR-8 basemap 청크 `import()` prefetch (#668 대체) | 2026-09-23T04:17:21Z | `b36aeb8b` |
| [#671](https://github.com/THINKAD-web/tkad-web/pull/671) | PR-9 SSR viewport placeholder · `tkad-map-basemap-tiles` mark (#669 대체) | 2026-09-23T04:20:55Z | `3ce3b407` |

### Lighthouse 모바일 (Preview `/ko/media/map`, simulated, 3회 중앙값)

측정일 **2026-09-23** (`scripts/lighthouse-map-runs.mjs`).

#### A. 초기 비교 (혼선 있음 — `git-main` Preview 단일 URL)

**Before** = 배치 2 종료 시점 `main` Preview 중앙값(위 배치 2 표). **After** = 배치 3 머지 직후 같은 `git-main` Preview.

| Metric | Before (배치 2 end) | After (`git-main` Preview) | 1차 목표 (8 s LCP) |
|--------|---------------------|----------------------------|---------------------|
| FCP | 1.7 s | 2.2 s | — |
| **LCP** | **15.0 s** | **17.4 s** (재측정 **~26.8 s**) | **미달** · **코드 회귀로 단정 불가** (아래 bisect) |
| TBT | 1,503 ms | 1,462 ms | 소폭 (~40 ms) |
| INP | lab N/A | lab N/A | — |

`git-main` Preview는 배치 3 직후 **LCP 25–27 s대로 반복**되며 LCP 타일 URL이 **OSM**(`b.tile.openstreetmap.org`)으로 잡힘. PR Preview(#667–671)는 **~14–16 s**·**VWorld** 타일 — **측정 URL·배포/env(VWorld 키) 불일치** 가능성.

#### B. Bisect (머지 커밋별 **해당 PR Preview URL**, 3회 중앙값)

| 단계 | Preview (고정 URL) | LCP median | LCP 3 runs (s) | TBT median |
|------|-------------------|------------|----------------|------------|
| `#667` (`24041506`, PR-7만) | feat-map-batch3-pr7 | **15.7 s** | 14.3, 16.1, 15.7 | 1,390 ms |
| `#670` (+ PR-8) | feat-map-batch3-pr8 | **14.8 s** | 14.8, 14.5, 16.9 | 1,267 ms |
| `#671` (+ PR-9) | feat-map-batch3-pr9 | **14.6 s** | 14.6, 16.4, 14.6 | 1,353 ms |
| `git-main` (동일 코드, alias) | git-main | **25.8–26.8 s** | 16.3–27.6 (편차 큼) | ~1,500 ms |

**결론 (2026-09-23 bisect):** **PR-8 `prefetchMapBasemapChunk`로 LCP 역행이 재현되지 않음** — PR-7→8→9 Preview에서 LCP는 **~15.7 → 14.8 → 14.6 s** (목표 8 s 미달이지만 **단계별 악화 아님**). “15→17.4 s 역행”은 **`git-main` alias(= Production 배포)** 측정과 bisect 불일치 → **PR-8 롤백 근거 없음**.

#### C. Vercel env · `git-main` alias (2026-09-23)

| 변수 | Production | Preview | Development |
|------|------------|---------|-------------|
| `NEXT_PUBLIC_VWORLD_API_KEY` | **없음 → 2026-09-23 등록** | 있음 | 있음 |
| `NEXT_PUBLIC_CARTO_BASEMAPS_API_KEY` | **없음** | **없음** | **없음** |

**정렬 전 confound (§C·배치 2·3 표):** 위 표의 Production **「없음」** 시점 기준 측정값. §D 이후 Production은 VWorld 포함 빌드.

- **`git-main` / `tkad.co.kr`:** `vercel inspect tkad-web-git-main-…` → **`target: production`**. Lab LCP 타일 **OSM** — **다크 테마 설계(Carto) 때문이 아님**. 측정 시각(주간) **라이트** + Production 빌드에 VWorld 미포함 → `publicMapTileUrlForTheme('light')` → Carto voyager 의도 → Carto 키 없음 → **OSM** (`lib/public-dark-map-config.ts`).
- **PR branch Preview:** 빌드 시 VWorld 인라인 → 라이트에서 **VWorld WMTS** → Lab LCP **~14–16 s**.
- **타일 호스트만의 격차 (동일 배치 3 코드 아님, 호스트 비교):** Production [`tkad.co.kr`](https://tkad.co.kr/ko/media/map) 3회 중앙값 **LCP 25.5 s** (OSM) vs bisect `#671` Preview **14.6 s** (VWorld) — **~11 s** lab 차이. **VWorld 운영키 등록(코드 0)이 PR-7~9 미세 최적화보다 LCP 레버가 클 수 있음** — GA4 `theme`·운영키 정책과 함께 배치 4 우선순위 재검토.

#### D. Production VWorld env 정렬 후 재측정 (2026-09-23)

**사전 확인 (등록 전 필수)**

1. **VWorld 콘솔 도메인:** `.env.production.example` 기준 허용 도메인에 `tkad.co.kr`, `www.tkad.co.kr`, `*.vercel.app`, `localhost` 명시. 등록 후 **WMTS 샘플 타일** + `Referer: https://tkad.co.kr/ko/media/map` → **HTTP 200** (미등록 시 403 → 키만 넣어도 OSM 폴백처럼 보이는 혼선).
2. **라이트/다크:** 코드상 **라이트만 VWorld** (`publicMapTileUrlForTheme`). **다크는 Carto dark** 설계이나 **Carto 키가 전 환경 없음** → 다크 사용자는 **여전히 OSM**. 이번 작업은 **VWorld Production 키만** — 야간·다크 LCP/체감은 **변경 없음**.
3. **Carto 키 범위:** GA4 `user_properties.theme` (`components/public-analytics-loader.tsx` — `light`/`dark`, `tkad:theme-auto-changed` 반영)로 **주간/야간 비율** 확인 후 Carto Production 키 등록 여부 결정. 다크 비중이 크면 Carto가 VWorld 다음 레버.

**운영:** `NEXT_PUBLIC_VWORLD_API_KEY` → Vercel **Production** 추가 · Production 재배포(`dpl_2eJeF6vom6By6SCC9aT7KJqCja1n`, 2026-09-23). **`git-main` alias가 구 OSM 빌드에 묶여 있던 구간** → 최신 Production과 **동일 deployment**로 정렬 후 재측정.

| URL | LCP 3 runs (s) | LCP median | LCP 타일 (lab) | TBT median |
|-----|----------------|------------|----------------|------------|
| `tkad.co.kr` (정렬 후) | 15.9, 25.5, 16.3 | **16.3 s** | **VWorld** (3/3) | ~1,645 ms |
| `git-main` alias (정렬 **후**, VWorld 빌드) | 17.8, 26.9, 25.0 | **25.0 s** | **VWorld** (3/3) | ~1,659 ms |
| `git-main` alias (정렬 **전**, stale OSM 빌드) | — | **~25 s** | **OSM** (3/3) | — |
| `git-main` (정렬 **전**, OSM 빌드) | — | **~25.5 s** | OSM | ~1,595 ms |
| bisect `#671` Preview (참고) | 14.6, 16.4, 14.6 | **14.6 s** | VWorld | ~1,353 ms |

**해석:** env 정렬으로 Production lab LCP 타일은 **OSM → VWorld** 전환 확인. **OSM ~25 s → VWorld ~16 s대**로 내려가 bisect Preview(~15 s)와 **같은 호스트·같은 코드** 기준으로 근접 — **배치 3 “git-main 26 s 역행”은 코드 회귀가 아님**. run 간 **15 s / 25 s 이원 편차**는 동일 배포에서도 재현(lab·cold start) → 단일 중앙값만으로 배치 4 go/no-go 금지.

**배치 3 코드 효과 (Production + VWorld, `git-main`/`tkad.co.kr` 동일 빌드):** Preview bisect(#671 **14.6 s**)와 **같은 타일 호스트·같은 main 코드**에서 lab LCP **~16 s대(편차 큼)** — **코드 회귀 아님**, bisect에서 본 **미세 개선 방향과 양립**. **LCP 8 s 목표 미달** 유지 → 배치 4는 코드 미세조정보다 **다크(Carto) 키·타일 discoverable** 등이 남은 레ver.

**정렬 전** “배치 2 end 15 s vs 배치 3 git-main 26 s” **코드 회귀 판정 금지** (§C confound).

**동일 Preview env에서 배치 3 코드 판정 (bisect B):** **15.7 → 14.6 s**, 8 s 미달.

**PR-8 경합 가설:** bisect상 prefetch 추가 후 TBT·LCP median **소폭 개선** — 대역폭 경합으로 전체 지연 가설은 **기각(이번 샘플)**.

**LCP element:** 여전히 `img.leaflet-tile`. env 정렬 **후** Production lab 타일 = **VWorld WMTS** (정렬 전 OSM). **SSR placeholder가 LCP 후보로 바뀌지 않음** — 의도대로.

**`lcp-discovery-insight` (After, median run):** `requestDiscoverable: false`, `fetchpriority=high` 미적용 — PR-7·8만으로는 initial document discoverable 전환 **실패**.

**`lcp-breakdown` (After, median run):** TTFB ~34 ms · resource load delay ~1,929 ms · tile load ~44 ms — 병목은 여전히 **클라이언트 체인 이후 타일 discover** 구간.

**체감 vs Lighthouse:** `tkad-map-basemap-tiles` perf mark(첫 Leaflet `tileload`)는 Lighthouse와 별도 — DevTools Performance에서 `tkad-map-basemap-tiles-duration` vs LCP 시각을 대조할 것. **LCP만 개선되고 타일 mark가 그대로면** placeholder가 숫자만 좋게 만든 것.

**다음 후보:** 타일 discoverable 경로(초기 HTML 힌트 한계), 지도 번들/Leaflet init 분리, `tkad-map-basemap-tiles` GA 전송, GA4 이탈·체류(배치 3 전/후 1주).

#### E. Field LCP vs Lab LCP — 재평가 (2026-09-23)

**Field (`POST /api/vitals` → `web_vitals`, 최근 14일, `path=/ko/media/map`)**

| 지표 | 값 |
|------|-----|
| n | **160** |
| p50 / p75 / p90 | **~2.05 s / ~2.38 s / ~3.2 s** |
| CWV “Good” 비율 (LCP &lt; 2.5 s) | **129/160 (~81%)** |
| `navigationType=navigate` only (n=125) | p50 **~2.28 s** |
| `back-forward-cache` (n=30) | p50 **~61 ms** (복원 탐색 — lab cold load 와 **동일 모집단 아님**) |

**Lab (Lighthouse 13 simulated mobile, 동 URL):** LCP **~15–26 s**, LCP 후보 **`img.leaflet-tile`** (타일 URL 기록됨).

**LCP element — field 쪽은 현재 알 수 없음**

- `WebVitalsReporter` → `POST /api/vitals` 페이로드: `name`, `value`, `rating`, `path`, `locale`, `navigationType`, `id` **만** (`components/web-vitals-reporter.tsx`, `app/api/vitals/route.ts`).
- DB `web_vitals` 테이블에도 **LCP 후보 element / URL 컬럼 없음** → 과거 field 샘플로 lab(타일)과 **동일 후보인지 소급 대조 불가**.
- `next/web-vitals` / `web-vitals` 라이브러리는 **attribution API**(`web-vitals/attribution`)로 element 힌트를 줄 수 있으나 **미연동**.

**해석 (방향성)**

1. **Field p75 ~2.4 s**면 CWV LCP “Good”(≤2.5 s)에 **사실상 근접** — 배치 2·3에서 추적한 **“실사용자 LCP 15 s 위기”는 lab·타일 중심 narrative였을 가능성이 큼** (throttling + lab이 타일을 LCP로 고정).
2. Lab **15 s vs field ~2 s**를 **직접 비교하는 것은**, element 미기록 상태에서는 **apples-to-oranges** — field가 타일이 아닌 다른 페인트(크롬·placeholder·시트 등)를 LCP로 잡았을 **가설은 plausible**하나 **미검증**. 검증하려면 vitals에 **LCP attribution(또는 `tkad-map-basemap-tiles` 시각) 저장** 필요.
3. Field 집계는 **bfache 샘플(~19%)** 이 p50을 낮춤 — **cold `navigate`만** 봐도 p50 **~2.3 s**로 lab과 여전히 **한참 차이**.
4. 일부 **비정상 초대값**(예: reload · ~10⁶ ms) 존재 — 장기적으로 vitals 집계 시 **상한 clip / outlier 제외** 검토.

**배치 4·우선순위 시사**

- **Lab LCP 8 s** 단독 go/no-go는 **실사용자 CWV와 어긋날 수 있음** — field·GA4/CrUX·`tkad-map-basemap-tiles`를 SSOT 후보로 재설정.
- **Carto 키**는 lab LCP가 아니라 **다크 basemap 품질(OSM 폴백 vs Carto)** · GA4 `user_properties.theme` dark 비중으로 판단.
- **코드 후보:** LCP element **기록** → map 경로만 샘플링해 lab(타일) vs field 후보 **대조 가능하게** 만드는 것이 “타일 discoverable” 미세 튜닝보다 선행. (후속 PR: `web-vitals/attribution` → `/api/vitals` · 배치 4 우선순위는 낮음.)

**GA4 `theme`:** Explore(`G-5QB3QMT01B`, User property `theme`) — 에이전트 세션에서는 Google 재인증으로 **비율 미확인**. 운영자 Explore 결과로 dark ≥~20% 여부 확정 후 Carto 등록 여부 결정.

---

*Phase 0 시점에는 코드를 변경하지 않았다. 배치 2·3 머지 후 §28·§30·§4 는 위 기록과 PR 본문을 기준으로 갱신한다.*
