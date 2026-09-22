import localFont from "next/font/local";

/**
 * THINKAD font system — 4 families.
 *
 * - sans (Pretendard): body, Korean/English UI, numeric data (`tabular-nums`)
 * - serif (Noto Serif KR): **reading screens** — magazine-style headlines (KO+EN)
 * - display (Space Grotesk): **Latin-only** accent labels — `font-display` + uppercase
 *   (e.g. `[ 01 ]`, `// DISCOVERY`). Korean glyphs fall back to Pretendard via CSS.
 * - mono (JetBrains Mono): code blocks, API samples
 *
 * Google `next/font` 는 빌드 중 fonts.gstatic.com 의 `/l/font?kit=` URL 을 받으면
 * 확장자가 없어 `loader.js` 에서 null[1] 로 컴파일이 죽는다. woff2 를 저장소에 둔다.
 * Noto Serif KR 는 next/font 가 `korean` subset 을 지원하지 않아 latin 만 임베드한다.
 */
export const pretendard = localFont({
  src: [
    {
      path: "../node_modules/pretendard/dist/web/static/woff2-subset/Pretendard-Regular.subset.woff2",
      weight: "400",
      style: "normal",
    },
    {
      path: "../node_modules/pretendard/dist/web/static/woff2-subset/Pretendard-Medium.subset.woff2",
      weight: "500",
      style: "normal",
    },
    {
      path: "../node_modules/pretendard/dist/web/static/woff2-subset/Pretendard-SemiBold.subset.woff2",
      weight: "600",
      style: "normal",
    },
    {
      path: "../node_modules/pretendard/dist/web/static/woff2-subset/Pretendard-Bold.subset.woff2",
      weight: "700",
      style: "normal",
    },
  ],
  variable: "--font-pretendard",
  display: "swap",
  preload: true,
});

export const spaceGrotesk = localFont({
  src: [
    { path: "./fonts/files/space-grotesk-latin-400.woff2", weight: "400", style: "normal" },
    { path: "./fonts/files/space-grotesk-latin-500.woff2", weight: "500", style: "normal" },
    { path: "./fonts/files/space-grotesk-latin-700.woff2", weight: "700", style: "normal" },
  ],
  variable: "--font-space-grotesk",
  display: "swap",
});

/** 잡지형 헤드라인 — 홈·인사이트 등 읽는 화면 */
export const notoSerifKr = localFont({
  src: [
    { path: "./fonts/files/noto-serif-kr-latin-400.woff2", weight: "400", style: "normal" },
    { path: "./fonts/files/noto-serif-kr-latin-700.woff2", weight: "700", style: "normal" },
  ],
  variable: "--font-noto-serif-kr",
  display: "swap",
  adjustFontFallback: false,
});

export const jetBrainsMono = localFont({
  src: [
    { path: "./fonts/files/jetbrains-mono-latin-400.woff2", weight: "400", style: "normal" },
    { path: "./fonts/files/jetbrains-mono-latin-700.woff2", weight: "700", style: "normal" },
  ],
  variable: "--font-jetbrains",
  display: "swap",
});

/** Apply to `<body className={...}>` */
export const fontClassNames = `${pretendard.variable} ${spaceGrotesk.variable} ${notoSerifKr.variable} ${jetBrainsMono.variable}`;
