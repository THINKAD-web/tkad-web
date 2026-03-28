import type { Config } from "tailwindcss";

/**
 * THINKAD 2025 palette — source of truth for utilities is `app/globals.css` (`@theme inline`).
 * This file documents tokens and sets `content` for tooling that expects a config path.
 */
export const brandColors = {
  primary: "#1A2A6C",
  accent: "#E8D5B5",
  silver: "#B0B8C4",
  background: "#D6D9E6",
  cta: "#9B3C31",
  white: "#FFFFFF",
  dark: "#1A1A2E",
} as const;

export default {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
} satisfies Config;
