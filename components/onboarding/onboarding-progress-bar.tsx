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
      className="group block border-b border-cyan-500/25 bg-gradient-to-r from-cyan-500/[0.07] via-violet-500/[0.05] to-pink-500/[0.07] px-4 py-2.5 transition-colors hover:from-cyan-500/10 hover:via-violet-500/8 hover:to-pink-500/10 dark:border-white/10 dark:from-cyan-500/12 dark:via-violet-500/10 dark:to-pink-500/12 dark:bg-[#05050a]/90"
    >
      <div className="mx-auto flex max-w-6xl flex-col gap-2 sm:flex-row sm:items-center sm:gap-4">
        <p className="min-w-0 flex-1 text-sm font-semibold text-gray-800 dark:text-white/90">
          {t.rich("progressMessage", {
            percent: pct,
            accent: (chunks) => (
              <span className="tkad-home-accent-text font-bold tabular-nums">
                {chunks}
              </span>
            ),
          })}
        </p>
        <div className="flex flex-1 items-center gap-3 sm:max-w-md">
          <div className="h-2 flex-1 overflow-hidden rounded-full border border-cyan-500/20 bg-gray-100 dark:border-white/10 dark:bg-white/10">
            <div
              className="h-full rounded-full bg-gradient-to-r from-cyan-400 via-violet-400 to-pink-400 shadow-[0_0_10px_rgba(34,211,238,0.35)] transition-all duration-500"
              style={{ width: `${Math.max(pct, 8)}%` }}
            />
          </div>
          <span className="shrink-0 text-xs font-bold tabular-nums text-cyan-600 dark:text-cyan-400">
            {pct}%
          </span>
        </div>
      </div>
    </Link>
  );
}
