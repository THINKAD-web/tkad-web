import type { Config } from "tailwindcss";

/**
 * THINKAD 2025 rebrand — canonical hex. Runtime utilities: `app/globals.css` (`@theme inline`).
 */
export const brandColors = {
  primary: "#1A2A6C",
  accent: "#E8D5B5",
  silver: "#B0B8C4",
  background: "#D6D9E6",
  cta: "#9B3C31",
  ctaHover: "#85342A",
  primaryLight: "#2E4078",
  primaryDark: "#121A3A",
  white: "#FFFFFF",
} as const;

export default {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
} satisfies Config;
