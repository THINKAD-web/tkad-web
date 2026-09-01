"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Link, usePathname } from "@/i18n/navigation";
import { ArrowRight, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

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
      className={cn(
        "group relative block overflow-hidden border-b transition-colors",
        "border-violet-500/20 bg-gray-50/95 dark:border-white/10 dark:bg-[#05050a]/95",
      )}
    >
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-[0.12] tkad-neon-grid"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_left,rgba(168,85,247,0.14),transparent_55%),radial-gradient(circle_at_right,rgba(34,211,238,0.12),transparent_50%)]"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-cyan-400/40 to-transparent"
      />

      <div className="relative mx-auto flex max-w-7xl flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:gap-5 sm:px-6 sm:py-3.5 lg:px-8">
        <div className="flex min-w-0 flex-1 items-start gap-3 sm:items-center">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-violet-500/25 bg-gradient-to-br from-violet-500/20 to-cyan-400/15 text-violet-500 shadow-[0_0_24px_rgba(168,85,247,0.18)] dark:text-cyan-300">
            <Sparkles className="h-4 w-4" aria-hidden />
          </span>
          <div className="min-w-0">
            <p className="font-display tkad-type-note font-medium uppercase tracking-[0.24em] text-cyan-600/80 dark:text-cyan-400/80">
              [ {t("progressKicker")} ]
            </p>
            <p className="mt-0.5 tkad-type-title leading-snug text-gray-900 dark:text-white/90">
              {t.rich("progressMessage", {
                percent: pct,
                accent: (chunks) => (
                  <span className="tkad-home-accent-text font-bold tabular-nums">
                    {chunks}
                  </span>
                ),
              })}
            </p>
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-3 sm:max-w-sm sm:flex-1">
          <div className="min-w-0 flex-1">
            <div className="mb-1 flex justify-between font-display tkad-type-note font-medium uppercase tracking-[0.18em] text-gray-500 dark:text-white/45">
              <span>{t("progressLabel")}</span>
              <span className="tabular-nums text-cyan-600 dark:text-cyan-400">
                {pct}%
              </span>
            </div>
            <div
              className="h-2 overflow-hidden rounded-full border border-white/10 bg-gray-200/80 dark:bg-white/10"
              role="progressbar"
              aria-valuenow={pct}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-label={t("progressLabel")}
            >
              <div
                className="h-full rounded-full bg-gradient-to-r from-violet-500 via-cyan-400 to-pink-400 shadow-[0_0_14px_rgba(34,211,238,0.45)] transition-bar duration-500"
                style={{ width: `${Math.max(pct, 6)}%` }}
              />
            </div>
          </div>

          <span
            className={cn(
              "inline-flex shrink-0 items-center gap-1 rounded-full border px-3 py-1.5 font-display tkad-type-note font-semibold uppercase tracking-[0.16em]",
              "border-violet-500/25 bg-white/70 text-gray-900 shadow-sm",
              "transition-bar group-hover:border-cyan-400/40 group-hover:bg-white group-hover:shadow-[0_0_20px_rgba(34,211,238,0.2)]",
              "dark:border-white/15 dark:bg-white/8 dark:text-white/90 dark:group-hover:bg-white/12",
            )}
          >
            {t("progressCta")}
            <ArrowRight
              className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5"
              aria-hidden
            />
          </span>
        </div>
      </div>
    </Link>
  );
}
