/**
 * 브랜드 액센트 램프 — **JS 런타임 측 SSOT**.
 *
 * ## 왜 CSS 변수를 쓰지 않는 곳이 있는가
 *
 * 캔버스·SVG data URI·차트 라이브러리 props·서버사이드 PDF/PPTX 빌더는
 * `var(--hermes)` 를 해석하지 못한다. 그런 자리에는 실제 hex 문자열이 필요하다.
 * 그래서 색이 두 군데(여기 + `app/globals.css`) 살 수밖에 없다.
 *
 * ## 두 곳이 어긋나지 않게 하는 방법
 *
 * 값을 여기와 globals.css 의 `--hermes*` 램프에 각각 적는 대신,
 * **`lib/__tests__/brand-palette-sync.test.ts` 가 globals.css 를 파싱해서
 * 두 값이 같은지 검사한다.** 한쪽만 바꾸면 테스트가 깨진다.
 *
 * ## 색을 바꿀 때
 *
 * 여기 값과 `globals.css` 의 `--hermes` / `--hermes-tint` / `--hermes-shade` /
 * `--hermes-pale` 을 함께 바꾸면 사이트 전체가 따라온다. 그 외 파일에
 * 액센트 hex 를 직접 적지 말 것 — 0단계에서 115곳을 여기로 흡수했다.
 */

export const BRAND_ACCENT = "#0f5f5c";
/** 밝은 변형 — 다크 hover, gold-700 */
export const BRAND_ACCENT_TINT = "#14746c";
/** 어두운 변형 — 라이트 hover, gold-dark */
export const BRAND_ACCENT_SHADE = "#0b4f4a";
/** 옅은 변형 — 다크 gold-dark */
export const BRAND_ACCENT_PALE = "#7fd9ce";

/**
 * 지도 핀 테두리 — 채움(BRAND_ACCENT) 위에 얹는 진한 윤곽.
 * 파생 계산이 아니라 디자인이 고른 값이라 상수로 둔다.
 */
export const BRAND_ACCENT_STROKE = "#083b38";
/** 디지털 매체 핀 테두리 (STROKE 보다 한 단계 밝음) */
export const BRAND_ACCENT_STROKE_ALT = "#116a63";

/** `#` 없는 6자리 — pptxgenjs 등 hex 문자열만 받는 곳 */
export const BRAND_ACCENT_BARE = "0F5F5C";

/** jsPDF `setFillColor(r,g,b)` 용 */
export const BRAND_ACCENT_RGB = [15, 95, 92] as const;

/**
 * 차트 시리즈 팔레트 — 1번이 브랜드 액센트, 나머지는 중립·보조.
 * 여러 차트가 같은 순서를 쓰도록 여기서 한 번만 정의한다.
 */
export const BRAND_CHART_INK = "#1c1c1f";
