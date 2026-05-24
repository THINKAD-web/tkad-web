"use client";

import { useEffect, useState } from "react";
import { useLocale } from "next-intl";
import { Link } from "@/i18n/navigation";
import { Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

type SessionPlan = {
  plan?: string;
  trialDaysLeft?: number;
};

export function HeaderProTrialChip() {
  const locale = useLocale();
  const isKo = locale === "ko";
  const [session, setSession] = useState<SessionPlan | null>(null);

  useEffect(() => {
    fetch("/api/auth/session", { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => {
        if (d?.ok && d.data) setSession(d.data);
      })
      .catch(() => setSession(null));
  }, []);

  if (!session) return null;

  const days = session.trialDaysLeft ?? 0;
  const showPro =
    session.plan === "PRO" ||
    session.plan === "ENTERPRISE" ||
    days > 0;

  if (!showPro) return null;

  const label =
    days > 0
      ? isKo
        ? `PRO 체험 D-${days}`
        : `PRO trial D-${days}`
      : isKo
        ? "PRO"
        : "PRO";

  return (
    <Link
      href="/points"
      className={cn(
        "hidden h-9 items-center gap-1 rounded-full px-3 text-xs font-bold md:inline-flex",
        "bg-gradient-to-r from-violet-600 to-cyan-500 text-white shadow-sm",
        "transition-transform hover:scale-[1.02] active:scale-95",
      )}
    >
      <Sparkles className="h-3.5 w-3.5" aria-hidden />
      <span>{label}</span>
    </Link>
  );
}
