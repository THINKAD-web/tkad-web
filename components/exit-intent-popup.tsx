"use client";

import { useEffect, useState, useCallback } from "react";
import { useLocale } from "next-intl";
import { ArrowRight, Gift, PhoneCall, Sparkles } from "lucide-react";
import { Link } from "@/i18n/navigation";
import Modal from "@/components/ui/modal";
import { cn } from "@/lib/utils";

const STORAGE_KEY = "tkad-exit-intent-last-shown-date";

function todayKey(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export default function ExitIntentPopup() {
  const locale = useLocale();
  const isKo = locale === "ko";
  const [show, setShow] = useState(false);

  const dismiss = useCallback(() => {
    setShow(false);
    try {
      localStorage.setItem(STORAGE_KEY, todayKey());
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    try {
      const last = localStorage.getItem(STORAGE_KEY);
      if (last && last === todayKey()) return;
    } catch {
      /* ignore */
    }

    const handleMouseLeave = (e: MouseEvent) => {
      if (e.clientY > 0) return;
      setShow(true);
      try {
        localStorage.setItem(STORAGE_KEY, todayKey());
      } catch {
        /* ignore */
      }
    };

    document.addEventListener("mouseout", handleMouseLeave);
    return () => document.removeEventListener("mouseout", handleMouseLeave);
  }, []);

  return (
    <Modal
      open={show}
      onClose={dismiss}
      ariaLabel={isKo ? "무료 상담 안내" : "Free consultation offer"}
      className="max-w-[min(100%,440px)] border-white/14 sm:max-w-[480px]"
    >
      <div className="relative z-[1] px-6 pb-8 pt-9 sm:px-9 sm:pb-9 sm:pt-10">
        <div className="flex items-center gap-2 font-mono text-[10px] font-bold uppercase tracking-[0.24em] text-white/55">
          <Sparkles className="h-3.5 w-3.5 text-cyan-300/90" aria-hidden />
          {isKo ? "한정 안내" : "Before you go"}
        </div>

        <h2 className="mt-4 text-balance text-[1.65rem] font-black leading-[1.12] tracking-[-0.04em] text-white sm:text-[1.85rem]">
          {isKo ? "떠나기 전, 무료 OOH 전략 리포트" : "Grab your free OOH strategy report"}
        </h2>
        <p className="mt-3 text-sm leading-relaxed text-white/72 sm:text-[15px]">
          {isKo
            ? "상담만 신청해도 입력하신 조건에 맞춘 맞춤형 옥외광고 전략 리포트를 보내 드립니다."
            : "Book a free consult and we’ll send a tailored out-of-home strategy report based on your goals."}
        </p>

        <div
          className={cn(
            "mt-6 flex gap-3 rounded-2xl border border-white/12 bg-white/[0.06] p-4 backdrop-blur-sm",
            "shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]",
          )}
        >
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-white/12 bg-gradient-to-br from-violet-500/35 via-cyan-500/25 to-fuchsia-500/30">
            <Gift className="h-6 w-6 text-white" aria-hidden />
          </div>
          <div className="min-w-0">
            <p className="font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-white/50">
              {isKo ? "포함 혜택" : "Included"}
            </p>
            <p className="mt-1 text-sm font-semibold text-white">
              {isKo ? "매체·지역·예산 맞춤 제안 요약" : "Media, region & budget snapshot"}
            </p>
          </div>
        </div>

        <div className="mt-7 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
          <Link
            href="/contact"
            onClick={dismiss}
            className={cn(
              "tkad-neon-cta-clean inline-flex h-12 flex-1 items-center justify-center gap-2 rounded-2xl px-6 text-sm font-black text-white",
              "transition-transform hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/35 sm:flex-initial sm:min-w-[200px]",
            )}
          >
            <PhoneCall className="h-4 w-4 shrink-0" aria-hidden />
            {isKo ? "무료 상담 신청" : "Request consultation"}
            <ArrowRight className="h-4 w-4 shrink-0" aria-hidden />
          </Link>
          <button
            type="button"
            onClick={dismiss}
            className="h-12 rounded-2xl border border-white/14 bg-white/[0.04] px-5 text-sm font-semibold text-white/85 transition-colors hover:border-white/22 hover:bg-white/[0.08] sm:px-6"
          >
            {isKo ? "괜찮아요" : "No thanks"}
          </button>
        </div>

        <p className="mt-5 font-mono text-[10px] tracking-tight text-white/40">
          {`// `}
          {isKo ? "동일 기기·브라우저에서 하루 한 번만 표시됩니다." : "Shown at most once per day on this device."}
        </p>
      </div>
    </Modal>
  );
}
