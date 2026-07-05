"use client";

import { useAuthSession } from "@/components/auth/auth-session-provider";
import { isPro } from "@/lib/plan-check-shared";

export function useIsPro() {
  const { user, loading, refresh } = useAuthSession();

  const pro = user ? isPro(user) : false;
  const plan = user?.plan ?? "FREE";

  return {
    isPro: pro,
    plan,
    user,
    loading,
    refresh,
    /** FREE 또는 비로그인 — PRO_TRIAL·PRO·ENTERPRISE 제외 */
    showTrialBanner: !loading && !pro,
  };
}
