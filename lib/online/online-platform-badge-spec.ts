/** CSS gradient — Google brand 4-color (no bitmap logos). */
export const GOOGLE_QUAD_GRADIENT =
  "linear-gradient(135deg, #4285F4 0%, #EA4335 34%, #FBBC04 67%, #34A853 100%)";

export type OnlinePlatformBadgeSpec = {
  initial: string;
  /** CSS background (gradient or solid) */
  background: string;
  /** Text color on badge */
  color: string;
};

const SPECS: Record<string, OnlinePlatformBadgeSpec> = {
  "Meta Instagram": {
    initial: "IG",
    background: "linear-gradient(135deg, #E1306C 0%, #833AB4 100%)",
    color: "#FFFFFF",
  },
  "Meta Facebook": {
    initial: "FB",
    background: "#1877F2",
    color: "#FFFFFF",
  },
  "Meta Advantage+": {
    initial: "A+",
    background: "linear-gradient(135deg, #1877F2 0%, #7B61FF 100%)",
    color: "#FFFFFF",
  },
  "Meta App Ads": {
    initial: "AP",
    background: "linear-gradient(135deg, #0081FB 0%, #0064E0 100%)",
    color: "#FFFFFF",
  },
  TikTok: {
    initial: "TT",
    background: "linear-gradient(135deg, #010101 0%, #25F4EE 100%)",
    color: "#FFFFFF",
  },
  YouTube: {
    initial: "YT",
    background: "#FF0000",
    color: "#FFFFFF",
  },
  "Google Ads Search": {
    initial: "G",
    background: GOOGLE_QUAD_GRADIENT,
    color: "#FFFFFF",
  },
  "Google Display Network": {
    initial: "G",
    background: GOOGLE_QUAD_GRADIENT,
    color: "#FFFFFF",
  },
  "Google Ads": {
    initial: "G",
    background: GOOGLE_QUAD_GRADIENT,
    color: "#FFFFFF",
  },
  "Google Performance Max": {
    initial: "PM",
    background: GOOGLE_QUAD_GRADIENT,
    color: "#FFFFFF",
  },
  "Naver Search Ads": {
    initial: "N",
    background: "#03C75A",
    color: "#FFFFFF",
  },
  "Naver GFA": {
    initial: "NG",
    background: "linear-gradient(135deg, #03C75A 0%, #00B894 100%)",
    color: "#FFFFFF",
  },
  "Naver Brand Search": {
    initial: "NB",
    background: "#02A84D",
    color: "#FFFFFF",
  },
  "Kakao Moment": {
    initial: "K",
    background: "#FEE500",
    color: "#3C1E1E",
  },
  "Karrot (당근)": {
    initial: "당근",
    background: "#FF7A00",
    color: "#FFFFFF",
  },
  Baemin: {
    initial: "배민",
    background: "#2AC1BC",
    color: "#FFFFFF",
  },
  "Coupang Ads": {
    initial: "CP",
    background: "linear-gradient(135deg, #E02F2F 0%, #FF6B00 100%)",
    color: "#FFFFFF",
  },
  "Native Network": {
    initial: "TB",
    background: "linear-gradient(135deg, #64748B 0%, #94A3B8 100%)",
    color: "#FFFFFF",
  },
};

const FALLBACK: OnlinePlatformBadgeSpec = {
  initial: "AD",
  background: "linear-gradient(135deg, #64748B 0%, #475569 100%)",
  color: "#FFFFFF",
};

export function resolveOnlinePlatformBadgeSpec(
  platform: string | null | undefined,
): OnlinePlatformBadgeSpec {
  const key = platform?.trim();
  if (!key) return FALLBACK;
  return SPECS[key] ?? FALLBACK;
}
