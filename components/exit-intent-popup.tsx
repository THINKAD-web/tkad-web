"use client";

import { useEffect, useState, useCallback } from "react";
import { useLocale } from "next-intl";
import { Gift, Loader2, Sparkles } from "lucide-react";
import Modal from "@/components/ui/modal";
import {
  getOrCreateTrackingSessionId,
  trackJourneyStep,
} from "@/lib/tracking/client";
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
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
      if (e.clientY > 12) return;
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

  const submit = async () => {
    const trimmed = email.trim();
    if (!trimmed) return;
    setLoading(true);
    setError(null);
    try {
      const sessionId = getOrCreateTrackingSessionId();
      const res = await fetch("/api/leads/exit-guide", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: trimmed,
          locale,
          sessionId,
        }),
      });
      const json = (await res.json()) as { ok?: boolean; error?: string };
      if (!res.ok || !json.ok) {
        setError(
          isKo
            ? "발송에 실패했습니다. 이메일을 확인해 주세요."
            : "Could not send. Check your email.",
        );
        return;
      }
      setSent(true);
      trackJourneyStep({
        step: "exit_guide_submit",
        mark: "guide_downloaded",
        metadata: { email: trimmed },
      });
    } catch {
      setError(isKo ? "네트워크 오류입니다." : "Network error.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      open={show}
      onClose={dismiss}
      ariaLabel={isKo ? "OOH 매체 가이드" : "OOH media guide"}
      className="max-w-[min(100%,440px)] border-white/14 sm:max-w-[480px]"
    >
      <div className="relative z-[1] px-6 pb-8 pt-9 sm:px-9 sm:pb-9 sm:pt-10">
        <div className="flex items-center gap-2 font-mono text-[10px] font-bold uppercase tracking-[0.24em] text-white/55">
          <Sparkles className="h-3.5 w-3.5 text-cyan-300/90" aria-hidden />
          {isKo ? "잠시만요!" : "Wait!"}
        </div>

        <h2 className="mt-4 text-balance text-[1.65rem] font-black leading-[1.12] tracking-[-0.04em] text-white sm:text-[1.85rem]">
          {isKo
            ? "무료 OOH 매체 가이드 받아가세요"
            : "Get your free OOH media guide"}
        </h2>
        <p className="mt-3 text-sm leading-relaxed text-white/72 sm:text-[15px]">
          {isKo
            ? "이메일을 남기시면 입문 가이드 링크를 바로 보내 드립니다. 예산·지역별 매체 선택 팁이 담겨 있습니다."
            : "Leave your email and we’ll send a starter guide with budget and region tips."}
        </p>

        <div
          className={cn(
            "mt-6 flex gap-3 rounded-2xl border border-white/12 bg-white/[0.06] p-4 backdrop-blur-sm",
          )}
        >
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-white/12 bg-gradient-to-br from-violet-500/35 via-cyan-500/25 to-fuchsia-500/30">
            <Gift className="h-6 w-6 text-white" aria-hidden />
          </div>
          <div className="min-w-0">
            <p className="font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-white/50">
              PDF · 가이드
            </p>
            <p className="mt-1 text-sm font-semibold text-white">
              {isKo ? "매체 유형·견적·집행 체크리스트" : "Media types, quotes & launch checklist"}
            </p>
          </div>
        </div>

        {sent ? (
          <p className="mt-6 text-sm font-semibold text-emerald-300">
            {isKo
              ? "발송 완료! 메일함(스팸함 포함)을 확인해 주세요."
              : "Sent! Check your inbox (and spam folder)."}
          </p>
        ) : (
          <form
            className="mt-6 space-y-3"
            onSubmit={(e) => {
              e.preventDefault();
              void submit();
            }}
          >
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder={isKo ? "work@company.com" : "work@company.com"}
              className="w-full rounded-2xl border border-white/14 bg-black/40 px-4 py-3 text-sm text-white placeholder:text-white/35"
            />
            {error ? <p className="text-sm text-red-300">{error}</p> : null}
            <div className="flex flex-col gap-3 sm:flex-row">
              <button
                type="submit"
                disabled={loading}
                className="tkad-neon-cta-clean inline-flex h-12 flex-1 items-center justify-center gap-2 rounded-2xl px-6 text-sm font-black text-white disabled:opacity-60"
              >
                {loading ? (
                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                ) : null}
                {isKo ? "가이드 받기" : "Send guide"}
              </button>
              <button
                type="button"
                onClick={dismiss}
                className="h-12 rounded-2xl border border-white/14 bg-white/[0.04] px-5 text-sm font-semibold text-white/85 hover:bg-white/[0.08]"
              >
                {isKo ? "괜찮아요" : "No thanks"}
              </button>
            </div>
          </form>
        )}

        <p className="mt-5 font-mono text-[10px] tracking-tight text-white/40">
          {`// `}
          {isKo ? "동일 기기·브라우저에서 하루 한 번만 표시됩니다." : "Shown at most once per day on this device."}
        </p>
      </div>
    </Modal>
  );
}
