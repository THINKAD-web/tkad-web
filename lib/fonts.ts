import localFont from "next/font/local";
import { JetBrains_Mono, Space_Grotesk } from "next/font/google";

/**
 * THINKAD font system — 3 families only.
 *
 * - sans (Pretendard): body, Korean/English titles, UI, numeric data (`tabular-nums`)
 * - display (Space Grotesk): **English-only** accent labels — `font-display` + uppercase
 *   (e.g. `[ 01 ]`, `// DISCOVERY`). Do not use on Korean headings or prices.
 * - mono (JetBrains Mono): code blocks, API samples
 */
export const pretendard = localFont({
  src: "../node_modules/pretendard/dist/web/variable/woff2/PretendardVariable.woff2",
  variable: "--font-pretendard",
  display: "swap",
  preload: true,
  weight: "100 900",
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
