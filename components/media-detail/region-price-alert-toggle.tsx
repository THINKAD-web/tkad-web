"use client";

import { useCallback, useEffect, useState } from "react";
import { Bell, BellOff, Loader2 } from "lucide-react";
import { useAppToast } from "@/lib/use-toast";

export function RegionPriceAlertToggle({
  regionZone,
  zoneLabel,
  locale,
}: {
  regionZone: string;
  zoneLabel: string;
  locale: string;
}) {
  const isKo = locale.startsWith("ko");
  const toast = useAppToast();
  const [subscribed, setSubscribed] = useState<boolean | null>(null);
  const [pending, setPending] = useState(false);

  const refresh = useCallback(async () => {
    try {
      const s = await fetch("/api/auth/session", { cache: "no-store" });
      const sd = await s.json();
      if (!sd?.ok || !sd.data) {
        setSubscribed(null);
        return;
      }
      const r = await fetch("/api/my/region-price-alerts", { cache: "no-store" });
      const rd = await r.json();
      if (rd?.ok && Array.isArray(rd.data?.zones)) {
        setSubscribed(rd.data.zones.includes(regionZone));
      } else {
        setSubscribed(false);
      }
    } catch {
      setSubscribed(null);
    }
  }, [regionZone]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  async function toggle() {
    if (subscribed === null) {
      toast.error(isKo ? "로그인 후 이용할 수 있습니다." : "Sign in required.");
      return;
    }
    setPending(true);
    try {
      const res = await fetch("/api/my/region-price-alerts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          regionZone,
          subscribe: !subscribed,
        }),
      });
      const json = await res.json();
      if (!res.ok || !json.ok) {
        toast.error(isKo ? "저장에 실패했습니다." : "Could not save.");
        return;
      }
      setSubscribed(!subscribed);
      toast.success(
        !subscribed
          ? isKo
            ? `${zoneLabel} 가격 트렌드 알림을 켰습니다.`
            : `Price trend alerts on for ${zoneLabel}.`
          : isKo
            ? "알림을 해제했습니다."
            : "Alerts turned off.",
      );
    } finally {
      setPending(false);
    }
  }

  return (
    <button
      type="button"
      onClick={() => void toggle()}
      disabled={pending}
      className="mt-4 inline-flex items-center gap-2 rounded-lg border border-border/80 bg-background/60 px-3 py-2 text-xs font-semibold text-foreground transition hover:bg-muted/50 disabled:opacity-50"
    >
      {pending ? (
        <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
      ) : subscribed ? (
        <Bell className="h-3.5 w-3.5 text-cyan-500" aria-hidden />
      ) : (
        <BellOff className="h-3.5 w-3.5 text-muted-foreground" aria-hidden />
      )}
      {subscribed === null
        ? isKo
          ? `${zoneLabel} 가격 트렌드 알림 (로그인)`
          : `${zoneLabel} trend alerts (sign in)`
        : subscribed
          ? isKo
            ? `${zoneLabel} 트렌드 알림 켜짐`
            : `${zoneLabel} alerts on`
          : isKo
            ? `${zoneLabel} 가격 트렌드 알림 받기`
            : `Alert me on ${zoneLabel} trends`}
    </button>
  );
}
