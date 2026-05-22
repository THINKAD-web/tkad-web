"use client";

import { useCallback, useEffect, useState } from "react";
import { isPro, type PlanCheckUser } from "@/lib/plan-check-shared";

type SessionPlanUser = PlanCheckUser & {
  id?: string;
  email?: string | null;
};

export function useIsPro() {
  const [user, setUser] = useState<SessionPlanUser | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/auth/session", { credentials: "include" });
      if (!res.ok) {
        setUser(null);
        return;
      }
      const json = (await res.json()) as { ok?: boolean; data?: SessionPlanUser | null };
      const data = json?.data ?? null;
      setUser(data?.id || data?.plan ? data : null);
    } catch {
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

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
