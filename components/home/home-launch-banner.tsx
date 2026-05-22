"use client";

import { Link } from "@/i18n/navigation";
import { useLocale } from "next-intl";
import { X } from "lucide-react";
import { useEffect, useState } from "react";

const STORAGE_KEY = "tkad-launch-banner-dismissed-v1";

export function HomeLaunchBanner() {
  const locale = useLocale();
  const isKo = locale === "ko";
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    try {
      if (localStorage.getItem(STORAGE_KEY) === "1") return;
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
          ? "정식 오픈! 첫 30명 PRO 무료 체험 신청하기"
          : "Official launch — First 30 get free PRO trial"}
        <span aria-hidden>→</span>
      </Link>
      <button
        type="button"
        className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-white/80 hover:bg-white/20 hover:text-white"
        aria-label={isKo ? "배너 닫기" : "Dismiss banner"}
        onClick={() => {
          try {
            localStorage.setItem(STORAGE_KEY, "1");
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
