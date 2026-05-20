/** A/B 테스트 — 히어로 CTA (첫 번째 실험) */

export const AB_COOKIE_NAME = "tkad_ab_variant";
export const AB_TEST_KEY = "hero_cta";
export const AB_COOKIE_MAX_AGE_SEC = 60 * 60 * 24 * 90; // 90일

export type AbVariant = "a" | "b";

export const AB_VARIANTS: AbVariant[] = ["a", "b"];

export function isAbVariant(v: string | null | undefined): v is AbVariant {
  return v === "a" || v === "b";
}

export function parseAbQueryVariant(
  value: string | null | undefined,
): AbVariant | null {
  const v = value?.trim().toLowerCase();
  if (v === "a" || v === "b") return v;
  return null;
}

export function pickRandomVariant(): AbVariant {
  return Math.random() < 0.5 ? "a" : "b";
}

/** 크롤러·봇은 항상 A */
export function isAbBotUserAgent(ua: string | null | undefined): boolean {
  if (!ua) return false;
  const s = ua.toLowerCase();
  return (
    /bot\b|crawler|spider|slurp|facebookexternalhit|linkedinbot|twitterbot|whatsapp|telegram|discordbot|googlebot|bingbot|yeti|daumoa|applebot|semrush|ahrefs|petalbot|bytespider|gptbot|claudebot|headlesschrome|lighthouse|pagespeed|prerender|preview/i.test(
      s,
    )
  );
}

export function heroCtaLabel(
  variant: AbVariant,
  locale: string,
): { label: string; suffix: string } {
  const isKo = locale === "ko" || locale.startsWith("ko");
  if (variant === "b") {
    return {
      label: isKo ? "무료 견적 받기" : "Get a free quote",
      suffix: " →",
    };
  }
  return {
    label: isKo ? "지금 시작하기" : "Get started",
    suffix: " →",
  };
}
