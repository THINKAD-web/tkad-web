"use client";

import { Link } from "@/i18n/navigation";
import { useLocale } from "next-intl";
import { X } from "lucide-react";
import { useEffect, useState } from "react";
import {
  proTrialSignupHeadlineEn,
  proTrialSignupHeadlineKo,
} from "@/lib/pro-trial-marketing";

const DISMISS_KEY = "tkad-launch-banner-dismissed-v2";
const START_KEY = "tkad-launch-banner-start-v2";
/** 배너 자동 숨김 — 첫 노출 기준 7일 */
const AUTO_HIDE_MS = 7 * 24 * 60 * 60 * 1000;

export function HomeLaunchBanner() {
  const locale = useLocale();
  const isKo = locale === "ko";
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    try {
      if (localStorage.getItem(DISMISS_KEY) === "1") return;

      let startRaw = localStorage.getItem(START_KEY);
      if (!startRaw) {
        startRaw = String(Date.now());
        localStorage.setItem(START_KEY, startRaw);
      }
      const start = Number(startRaw);
      if (Number.isFinite(start) && Date.now() - start > AUTO_HIDE_MS) return;

      setVisible(true);
    } catch {
      setVisible(true);
    }
  }, []);

  if (!visible) return null;

  return (
    <div
      role="region"
      aria-label={isKo ? "정식 오픈 안내" : "Launch announcement"}
      className="relative z-40 border-b-2 border-border bg-gradient-to-r from-violet-600 via-fuchsia-600 to-cyan-500 px-4 py-2.5 text-center text-sm font-medium text-white shadow-md"
    >
      <Link
        href="/pricing"
        className="inline-flex flex-wrap items-center justify-center gap-2 text-white hover:underline"
      >
        <span aria-hidden>🎉</span>
        {isKo
          ? `${proTrialSignupHeadlineKo()} →`
          : `${proTrialSignupHeadlineEn()} →`}
        <span aria-hidden>→</span>
      </Link>
      <button
        type="button"
        className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-white/80 hover:bg-white/20 hover:text-white"
        aria-label={isKo ? "배너 닫기" : "Dismiss banner"}
        onClick={() => {
          try {
            localStorage.setItem(DISMISS_KEY, "1");
          } catch {
            /* ignore */
          }
          setVisible(false);
        }}
      >
        <X className="h-4 w-4" aria-hidden />
      </button>
    </div>
  );
}
