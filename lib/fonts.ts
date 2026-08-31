import localFont from "next/font/local";
import { JetBrains_Mono, Noto_Serif_KR, Space_Grotesk } from "next/font/google";

/**
 * THINKAD font system — 4 families.
 *
 * - sans (Pretendard): body, Korean/English UI, numeric data (`tabular-nums`)
 * - serif (Noto Serif KR): **reading screens** — magazine-style headlines (KO+EN)
 * - display (Space Grotesk): **Latin-only** accent labels — `font-display` + uppercase
 *   (e.g. `[ 01 ]`, `// DISCOVERY`). Korean glyphs fall back to Pretendard via CSS.
 * - mono (JetBrains Mono): code blocks, API samples
 *
 * PART 4 결정: Space Grotesk 는 EN 라벨 전용으로 유지. 한글 헤드라인은 Noto Serif KR.
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

export const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  variable: "--font-space-grotesk",
  display: "swap",
  weight: ["400", "500", "700"],
});

/** 잡지형 헤드라인 — 홈·인사이트 등 읽는 화면 (한글 지원) */
export const notoSerifKr = Noto_Serif_KR({
  subsets: ["latin"],
  variable: "--font-noto-serif-kr",
  display: "swap",
  weight: ["400", "600", "700"],
});

export const jetBrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-jetbrains",
  display: "swap",
  weight: ["400", "700"],
});

/** Apply to `<body className={...}>` */
export const fontClassNames = `${pretendard.variable} ${spaceGrotesk.variable} ${notoSerifKr.variable} ${jetBrainsMono.variable}`;
