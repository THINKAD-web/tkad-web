# `/ko/media` · `/ko/media/map` 버벅임/재렌더 진단 보고서

> 작성일: 2026-06-27
> 범위: **진단 전용**. 본 PR에서는 코드 변경 없음. 수정 제안은 후속 PR에서 진행.
> 대상 라우트
> - `/ko/media` → `app/[locale]/media/page.tsx` → `components/media/media-search-page.tsx`
> - `/ko/media/map` → `app/[locale]/media/map/page.tsx` → `components/media-map/media-map-page-client.tsx`

---

## 요약 (TL;DR)

| # | 확인 항목 | 결론 |
|---|-----------|------|
| 1 | 컨트롤 바가 DOM에 두 번 렌더되는가 | **부분적으로 사실**. 단일 컴포넌트 안에서 데스크톱/모바일 툴바 + 검색창 + 타입칩 행이 CSS(`hidden`/`sm:hidden`/`sm:flex`)로 한쪽만 가린 채 **둘 다 DOM에 마운트**됨. |
| 2 | 두 인스턴스가 각자 state·핸들러·fetch를 따로 들고 도는가 | **아니오**. 별도 컴포넌트 인스턴스가 아니라 **단일 인스턴스 안의 마크업 중복**. state·핸들러·fetch는 부모 1곳에서 단일 소스로 관리됨. **상태가 이중으로 돌지 않음** → 버벅임의 1차 원인 아님. |
| 3 | Leaflet 지도 인스턴스가 1개만 생성되는가 | **예 (1개)**. `MapContainer` 1개, `dynamic(ssr:false)` 로 1회 마운트, 리렌더 시 재생성 안 됨(`key` 없음). |
| 4 | 컨테이너 높이 100vh vs 100dvh / `invalidateSize()` | **`dvh` 사용** (`md:h-[calc(100dvh-6.75rem)]`). `invalidateSize()` 는 `MapResizeFix` 가 rAF·타이머·ResizeObserver·resize 로 **충분히(다소 과하게) 호출**. |
| 5 | 스크롤/필터 조작 시 마커 전체 재생성 vs 증분 | **증분 갱신**. `clearLayers` 미사용, diff 기반 add/remove/update. 패닝만으로는 재조회·재생성 안 일어남(수동 "이 지역 검색"). |

**핵심**: 질문이 가정한 "컨트롤 바 이중 마운트로 state/fetch가 이중으로 도는 구조"는 코드상 **성립하지 않음**. 실제 재렌더 부하의 후보는 (a) DOM 노드 중복 자체보다는 (b) 거대한 단일 클라이언트 컴포넌트(`MediaMapPageClient`, ~30개 `useState`)의 잦은 전체 리렌더(특히 hover), (c) ResizeObserver 의 과한 `invalidateSize` 호출 쪽이 더 유력하다 (5절 끝 "추가 관찰" 참고).

---

## 1. 컨트롤 바 DOM 이중 렌더 — 데스크톱/모바일 둘 다 마운트 후 CSS 가림?

**대상 컴포넌트**: `components/media/media-manual-browse-filters.tsx` (`MediaManualBrowseFilters`)
- `/ko/media`: `components/media/media-search-page.tsx:685` 에서 **1회** 마운트
- `/ko/media/map`: `components/media-map/media-map-page-client.tsx:874` 에서 **1회** 마운트

즉 컴포넌트 인스턴스는 페이지당 1개다. 그러나 **그 단일 인스턴스의 JSX 내부에서 컨트롤 마크업이 반응형으로 중복 작성**되어 있고, Tailwind 의 `hidden` / `sm:hidden` / `sm:flex` 로 한쪽만 보이게 한다. 따라서 한 시점에 두 벌이 동시에 DOM에 존재한다(미디어쿼리로 시각적으로만 한쪽이 가려짐).

중복 지점(`media-manual-browse-filters.tsx`):

| 요소 | 모바일용 | 데스크톱용 |
|------|----------|------------|
| 검색창 | `:852` `<div className="sm:hidden">{searchInput}</div>` | `:856` (데스크톱 툴바 `hidden … sm:flex` 안, `:855`) |
| 툴바(필터·정렬·보기) | `:974` `<div className="flex … sm:hidden">` (필터 `:975`, 정렬 `:992`, 보기 `:993`) | `:855` `<div className="hidden … sm:flex">` (필터 `:858`, 정렬 `:931`, 보기 `:932`) |
| 타입(매체유형) 칩 행 | 바텀시트 내부 `:1073` `renderFilterAxes(true)` (단, `sheetOpen` 일 때만) | `:945`–`:947` `<div className="hidden … sm:block">{renderTypeAxis(false)}</div>` |

→ **질문 1의 "둘 다 마운트하고 CSS로 한쪽만 가린다"는 사실**이다. 단, "두 개의 컨트롤 바 컴포넌트"가 아니라 **한 컴포넌트 안의 반응형 마크업 중복**이라는 점이 핵심 차이다.

부수적으로, 데스크톱 검색창과 모바일 검색창은 각각 별도의 `<input>`(`CompositionSearchInput`) DOM 노드를 만든다. 정렬 `<select>`, 보기 토글도 두 벌의 DOM 노드가 생긴다(`searchInput`/`sortSelect`/`viewModeToggle` 상수를 두 위치에서 참조 → React 가 양쪽에 각각 렌더).

---

## 2. 두 인스턴스가 각자 state·핸들러·fetch 를 따로 들고 도는가?

**아니오. 상태는 이중으로 돌지 않는다.**

이유:

1. **컴포넌트 인스턴스가 하나**다(1절). 따라서 `MediaManualBrowseFilters` 내부의 `useState`(`sheetOpen`, `desktopPanelOpen`, `advancedOpen`, `mapFiltersExpanded` 등, `:218`–`:227`)는 한 벌만 존재한다.
2. **검색/정렬/보기 값은 컴포넌트가 직접 소유하지 않는다.** controlled prop 으로 부모에서 내려온다.
   - 데스크톱·모바일 검색창은 동일한 `searchInput` 상수(`:741`)를 양쪽에서 참조한다. props(`value=query`, `onValueChange=onQueryChange`)는 부모의 단일 state.
   - 정렬은 `sortSelect` 상수(`:775`), 보기 토글은 `viewModeToggle` 상수(`:793`) — 마찬가지로 단일 소스를 양쪽이 공유.
3. **state·fetch 의 단일 소스는 부모**다.
   - `/ko/media`: `media-search-page.tsx:207`–`:227` 의 `useState`(query/mainCategory/…/viewMode/media/catalogItems …). fetch 는 `fetchMedia`(`:389`) 1곳, 트리거 effect 도 `:557`–`:566` 1곳(디바운스 300ms). URL 동기화 effect `:273`.
   - `/ko/media/map`: `media-map-page-client.tsx:156` 의 `browseFilters` 등. fetch 는 `fetchItems`(`:358`) 1곳, 트리거는 필터 effect(`:483`)·지역 effect(`:501`)·`runSearch`(`:447`) 로 분기되지만 모두 동일 단일 함수를 호출.

→ 결론: **두 벌의 DOM 컨트롤이 입력을 받아도 둘 다 같은 부모 state 를 갱신**한다. 별도 state 루프나 중복 fetch 는 없다. 타이핑/정렬 변경 시 두 입력 노드가 함께 리렌더되긴 하지만(시각상 한쪽만 보임), 이는 경미한 비용이며 "버벅임"의 주원인으로 보기 어렵다.

> 주의: 중복 DOM 자체는 접근성/스크린리더 중복, 약간의 렌더 비용 정도의 문제다. "필터 상태가 이중으로 돈다"는 가설은 **코드상 기각**.

---

## 3. `/ko/media/map` Leaflet 인스턴스 개수

**1개만 생성된다.**

- `components/public-map/dark-map-view.tsx:292` 의 `<MapContainer>` 1개가 Leaflet 맵 인스턴스를 만든다.
- `MediaMapPageClient` 는 이 뷰를 `dynamic(() => import("@/components/public-map/dark-map-view"), { ssr:false })`(`media-map-page-client.tsx:86`–`:92`)로 **1회** 마운트(`:754`). 조건부 마운트/`key` 변경 없음 → 리렌더로 재생성되지 않음.
- `MapContainer` 는 react-leaflet 특성상 마운트 시 1회 맵을 만들고 이후 `center`/`zoom` prop 변화에 반응해 재생성하지 않는다. 본 코드에도 `MapContainer` 에 동적 `key` 가 없어(`:292`–`:305`) **재마운트/재생성 트리거 없음**.
- 프로그램 matic 이동·마커 갱신은 모두 자식 컴포넌트(`ProgrammaticView`, `DarkMapMarkersLayer` 등)에서 `useMap()` 으로 **기존 인스턴스를 재사용**한다.

참고: `/ko/media` 의 "지도" 보기 모드는 **다른** 맵 컴포넌트(`MediaBrowseMap` → `DarkCampaignMap`, `media-search-page.tsx:48`, `:753`)를 쓴다. `/ko/media/map` 의 `DarkMapView` 와는 별개 인스턴스다(같은 화면에 공존하지 않음). 본 진단 대상인 `/ko/media/map` 한정으로는 **인스턴스 1개**가 맞다.

→ "2개 이상 생성 / 리렌더마다 재생성" 징후 **없음**.

---

## 4. 컨테이너 높이(100vh vs 100dvh) 및 `invalidateSize()`

**높이 단위: `dvh` 사용 (vh 아님).**
- `media-map-page-client.tsx:750`: 바깥 래퍼 `md:h-[calc(100dvh-6.75rem)]`
- `:752`: 지도 컬럼 `h-[min(50dvh,400px)] … md:h-auto md:min-h-0 md:flex-1`
- `dark-map-view.tsx:297`: `MapContainer style={{ height:"100%", width:"100%" }}` (부모 높이를 채움)

`dvh`(dynamic viewport height)를 쓰므로 모바일 주소창 등장/소멸로 인한 `vh` 점프성 리사이즈는 완화되어 있다.

**`invalidateSize()` 호출: 됨 (오히려 다소 과함).**
`dark-map-view.tsx:70`–`:107` 의 `MapResizeFix` 가 다음을 모두 수행:
- `requestAnimationFrame(invalidate)` 1회 (`:81`)
- `setTimeout(invalidate, 150)`, `setTimeout(invalidate, 450)` (`:82`–`:83`)
- `ResizeObserver` 로 **컨테이너 + 그 부모** 관찰, 콜백마다 `requestAnimationFrame(invalidate)` (`:86`–`:95`)
- `window` `resize` 리스너 (`:97`)

→ 높이/invalidateSize 측면은 정석에 부합. 다만 ResizeObserver 가 컨테이너와 부모 둘 다를 보고, `dvh`+flex 레이아웃에서 미세한 크기 변동마다 `invalidateSize` 가 자주 불릴 수 있어 **잦은 invalidate 가 버벅임에 기여할 여지**가 있다(5절 추가 관찰 참고). 이는 버그가 아니라 튜닝 후보.

---

## 5. 스크롤/필터 조작 시 마커 — 전체 재생성 vs 증분

**증분 갱신이다. 전체 재생성 아님.**

`components/public-map/dark-map-markers-layer.tsx`:
- 레이어(클러스터/레이어그룹)는 `map`/`disableCluster` 변경 시에만 생성/파기(`:89`–`:109`).
- 마커 동기화 effect(`:112`–`:174`)는 **`clearLayers()` 를 쓰지 않는다**(`:111` 주석 "clearLayers 금지"):
  - `nextIds` 집합 계산(`:116`)
  - 사라진 마커만 제거(`:122`–`:127`)
  - **기존 마커는 재사용** — `setLatLng` + title + `setIcon`만 갱신(`:139`–`:152`)
  - **신규만 생성** `L.marker(...)` 후 `addLayer`(`:154`–`:166`)
- 선택/hover 변경(`:177`–`:193`)은 **영향받는 핀만** `setIcon`(diff: `affectedPinIdsForActiveStateChange`).

마커 배열 자체는 부모에서 `useMemo`(`media-map-page-client.tsx:530`–`:538`)로 만들어지며, deps 는 `[items, selectedItem]` 뿐이라 **hover 변경(`hoveredId`)으로는 재계산되지 않는다.**

**패닝/스크롤로 마커가 매번 재생성되지 않는다**: `moveend` → `BoundsReporter`(`dark-map-view.tsx:109`) → `handleBoundsChange`(`media-map-page-client.tsx:462`)는 `forceSearchRef` 또는 최초 1회일 때만 `runSearch` 한다. 일반 패닝은 `setBounds` + `viewportDirty=true` 만 → 사용자가 "이 지역에서 검색" 버튼(`:767`)을 눌러야 재조회. 즉 **패닝만으로는 fetch·마커 재생성이 발생하지 않는다.** 필터/검색으로 `items` 가 바뀔 때만 증분 동기화가 돈다.

→ "스크롤 시 마커 전체 재생성" 징후 **없음**. 증분 구조가 잘 갖춰져 있음.

---

## 추가 관찰 (버벅임의 더 유력한 후보 — 후속 PR 조사용)

진단 5개 항목 자체에서는 치명적 결함이 안 보였으나, 코드 리딩 중 재렌더 부하의 실질 후보로 다음을 기록해 둔다(수정은 별도 PR):

1. **거대한 단일 클라이언트 컴포넌트의 잦은 전체 리렌더** — `MediaMapPageClient` 는 ~30개 `useState` 를 가진 단일 컴포넌트다. 리스트 카드 hover 시 `setHoveredId`(`media-map-page-client.tsx:940`–`:947`)가 컴포넌트 전체를 리렌더한다. 카드 위 마우스 이동마다 전체 트리(컨트롤 바 중복 마크업 포함, 리스트 카드 다수 포함)가 재조정된다. 마커 레이어는 `hoveredId` ref/diff 로 방어되어 있지만, React 재조정 비용 자체는 발생.
2. **ResizeObserver 의 과한 `invalidateSize`**(4절) — 컨테이너+부모 동시 관찰 + `dvh`/flex 변동. 디바운스/대상 축소 여지.
3. **컨트롤 DOM 노드 중복**(1절) — 기능 버그는 아니나, 검색 input·select·토글이 두 벌씩 DOM에 존재 → state 변경 시 양쪽 모두 리렌더. 반응형을 단일 마크업 + CSS 재배치로 통합하면 노드 수·리렌더 절감 가능. (단, 이는 미세 최적화)

우선순위 권고(후속 PR): **(1) hover state 격리/메모이제이션** > (2) ResizeObserver invalidate 튜닝 > (3) 컨트롤 마크업 단일화.

---

## 부록 — 핵심 파일/라인 인덱스

- 컨트롤 바 컴포넌트: `components/media/media-manual-browse-filters.tsx`
  - 검색창 상수 `:741` / 정렬 `:775` / 보기 토글 `:793`
  - 모바일 검색 `:852` / 데스크톱 툴바 `:855` / 데스크톱 타입칩 `:945` / 모바일 툴바 `:974` / 모바일 시트 `:1045`,`:1073`
- `/ko/media`: `app/[locale]/media/page.tsx` → `components/media/media-search-page.tsx`
  - state `:207`–`:227` / fetch `fetchMedia` `:389` / fetch 트리거 effect `:557` / 컨트롤 바 마운트 `:685` / 지도 모드(별도 맵) `:753`
- `/ko/media/map`: `app/[locale]/media/map/page.tsx` → `components/media-map/media-map-page-client.tsx`
  - 레이아웃 높이(dvh) `:750`,`:752` / `DarkMapView` 마운트 `:754` / `fetchItems` `:358` / `handleBoundsChange` `:462` / markers memo `:530` / 컨트롤 바 마운트 `:874` / hover set `:940`
- 지도 뷰: `components/public-map/dark-map-view.tsx`
  - `MapContainer` `:292` / `MapResizeFix`(invalidateSize) `:70` / dynamic ssr:false 임포트 `media-map-page-client.tsx:86`
- 마커 레이어: `components/public-map/dark-map-markers-layer.tsx`
  - 레이어 생성/파기 `:89` / 증분 동기화 `:112` / 선택·hover diff `:177`
