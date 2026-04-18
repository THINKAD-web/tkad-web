import type { Config } from "tailwindcss";

/**
 * THINKAD 2025 rebrand — canonical hex. Runtime utilities: `app/globals.css` (`@theme inline`).
 */
export const brandColors = {
  primary: "#0D1B2E",
  accent: "#C8913C",
  silver: "#8B97A6",
  background: "#FFFFFF",
  cta: "#C8913C",
  ctaHover: "#A47430",
  primaryLight: "#1B3354",
  primaryDark: "#060E1A",
  white: "#FFFFFF",
} as const;

export default {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
} satisfies Config;
