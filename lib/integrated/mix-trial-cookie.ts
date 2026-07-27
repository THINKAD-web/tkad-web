export const INTEGRATED_MIX_TRIAL_COOKIE = "tkad_integrated_mix_trial";

export function hasUsedIntegratedMixTrial(cookieValue: string | undefined): boolean {
  return cookieValue === "1";
}

export function integratedMixTrialCookieOptions() {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
    maxAge: 60 * 60 * 24 * 90,
  };
}

export function integratedMixNeedLoginBody() {
  return {
    error: "NEED_LOGIN" as const,
    needLogin: true as const,
    message:
      "통합 미디어믹스는 로그인 후 계속 이용할 수 있어요. 무료 가입은 30초면 됩니다.",
  };
}
