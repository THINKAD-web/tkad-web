import type { Config } from "tailwindcss";

/**
 * THINKAD 2026 rebrand — Deep Ink #0D1B2E · Rich Amber #C8913C.
 * Runtime utilities: `app/globals.css` (`@theme inline`).
 */
export const brandColors = {
  primary: "#0D1B2E",
  accent: "#C8913C",
  silver: "#B0B8C4",
  background: "#D6D9E6",
  cta: "#9B3C31",
  ctaHover: "#85342A",
  primaryLight: "#1E3A5F",
  primaryDark: "#0A1420",
  white: "#FFFFFF",
} as const;

export default {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  /** `next-themes` 는 `html.dark` 토글 — v4 기본 `dark:` 는 OS 미디어쿼리라 토글과 불일치 */
  darkMode: "class",
  theme: {
    extend: {
      fontFamily: {
        sans: ["var(--font-pretendard)", "system-ui", "sans-serif"],
        display: [
          "var(--font-space-grotesk)",
          "var(--font-pretendard)",
          "system-ui",
          "sans-serif",
        ],
        mono: ["var(--font-jetbrains)", "ui-monospace", "monospace"],
      },
    },
  },
} satisfies Config;
