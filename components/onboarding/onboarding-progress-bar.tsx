"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Link, usePathname } from "@/i18n/navigation";

type Status = {
  completionPercent: number;
  needsOnboarding: boolean;
};

const HIDDEN_PREFIXES = [
  "/onboarding",
  "/login",
  "/register",
  "/admin",
];

export function OnboardingProgressBar() {
  const t = useTranslations("onboarding");
  const pathname = usePathname();
  const [status, setStatus] = useState<Status | null>(null);

  const hidden = HIDDEN_PREFIXES.some((p) => pathname.startsWith(p));

  useEffect(() => {
    if (hidden) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/onboarding", { credentials: "include" });
        if (res.status === 401) {
          if (!cancelled) setStatus(null);
          return;
        }
        if (!res.ok) return;
        const data = (await res.json()) as {
          completionPercent: number;
          needsOnboarding: boolean;
        };
        if (!cancelled) {
          setStatus({
            completionPercent: data.completionPercent,
            needsOnboarding: data.needsOnboarding,
          });
        }
      } catch {
        /* ignore */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [hidden, pathname]);

  if (hidden || !status?.needsOnboarding) return null;

  const pct = status.completionPercent;

  return (
    <Link
      href="/onboarding"
      className="block border-b border-[#ff6b2c]/30 bg-[#ff6b2c]/10 px-4 py-2.5 transition-colors hover:bg-[#ff6b2c]/15"
    >
      <div className="mx-auto flex max-w-6xl flex-col gap-2 sm:flex-row sm:items-center sm:gap-4">
        <p className="min-w-0 flex-1 text-sm font-semibold text-white/90">
          {t("progressMessage", { percent: pct })}
        </p>
        <div className="flex flex-1 items-center gap-3 sm:max-w-md">
          <div className="h-2 flex-1 overflow-hidden rounded-full bg-white/10">
            <div
              className="h-full rounded-full bg-[#ff6b2c] transition-all duration-500"
              style={{ width: `${Math.max(pct, 8)}%` }}
            />
          </div>
          <span className="shrink-0 font-mono text-xs font-bold text-[#ff6b2c]">
            {pct}%
          </span>
        </div>
      </div>
    </Link>
  );
}
