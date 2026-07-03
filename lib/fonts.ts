import localFont from "next/font/local";
import { JetBrains_Mono, Space_Grotesk } from "next/font/google";

/**
 * THINKAD font system — 3 families only.
 *
 * - sans (Pretendard): body, Korean/English titles, UI, numeric data (`tabular-nums`)
 * - display (Space Grotesk): **English-only** accent labels — `font-display` + uppercase
 *   (e.g. `[ 01 ]`, `// DISCOVERY`). Do not use on Korean headings or prices.
 * - mono (JetBrains Mono): code blocks, API samples
 *
 * Pretendard: Korean subset static woff2 (~267KB/weight vs ~2MB variable).
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

export const jetBrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-jetbrains",
  display: "swap",
  weight: ["400", "700"],
});

/** Apply to `<body className={...}>` */
export const fontClassNames = `${pretendard.variable} ${spaceGrotesk.variable} ${jetBrainsMono.variable}`;
