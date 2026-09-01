"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { X } from "lucide-react";
import { getOrCreateTrackingSessionId } from "@/lib/tracking/client";

type Surface = "media_detail" | "planner";
type Answer = "found" | "lost" | "complex";

const ANSWERS: { key: Answer; label: string; emoji: string }[] = [
  { key: "found", label: "원하는 걸 찾았어요", emoji: "👍" },
  { key: "lost", label: "뭘 해야 할지 모르겠어요", emoji: "🤔" },
  { key: "complex", label: "너무 복잡해요", emoji: "😵" },
];

/** 응답/닫음 후 재노출 억제 기간 */
const SUPPRESS_DAYS = 14;
/** 페이지 진입 후 자동 노출까지 머문 시간(ms) */
const DWELL_MS = 22_000;

export function ExitSurveyBanner({ surface }: { surface: Surface }) {
  const [open, setOpen] = useState(false);
  const [done, setDone] = useState(false);
  const shownRef = useRef(false);
  const storageKey = `tkad_exit_survey_${surface}`;

  const suppressed = useCallback((): boolean => {
    if (typeof window === "undefined") return true;
    try {
      const raw = localStorage.getItem(storageKey);
      if (!raw) return false;
      const ts = Number(raw);
      return Number.isFinite(ts) && Date.now() - ts < SUPPRESS_DAYS * 86_400_000;
    } catch {
      return false;
    }
  }, [storageKey]);

  const suppress = useCallback(() => {
    try {
      localStorage.setItem(storageKey, String(Date.now()));
    } catch {
      /* ignore */
    }
  }, [storageKey]);

  const reveal = useCallback(() => {
    if (shownRef.current || suppressed()) return;
    shownRef.current = true;
    setOpen(true);
  }, [suppressed]);

  useEffect(() => {
    if (suppressed()) return;

    const dwellTimer = window.setTimeout(reveal, DWELL_MS);

    // 데스크톱: 마우스가 화면 상단 밖으로(이탈 의도)
    const onMouseOut = (e: MouseEvent) => {
      if (e.clientY <= 0 && !e.relatedTarget) reveal();
    };
    // 모바일/공통: 하단 도달
    const onScroll = () => {
      const scrolled = window.scrollY + window.innerHeight;
      if (scrolled >= document.documentElement.scrollHeight - 80) reveal();
    };

    document.addEventListener("mouseout", onMouseOut);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.clearTimeout(dwellTimer);
      document.removeEventListener("mouseout", onMouseOut);
      window.removeEventListener("scroll", onScroll);
    };
  }, [reveal, suppressed]);

  const dismiss = useCallback(() => {
    suppress();
    setOpen(false);
  }, [suppress]);

  const answer = useCallback(
    (a: Answer) => {
      suppress();
      setDone(true);
      const sessionId = getOrCreateTrackingSessionId();
      void fetch("/api/survey/exit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          surface,
          answer: a,
          sessionId: sessionId || undefined,
          path: typeof window !== "undefined" ? window.location.pathname : undefined,
        }),
        keepalive: true,
      }).catch(() => {});
      window.setTimeout(() => setOpen(false), 1600);
    },
    [surface, suppress],
  );

  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-label="찾으시는 게 있으셨나요?"
      className="fixed inset-x-0 bottom-0 z-[120] flex justify-center px-3 pb-3 sm:px-4 sm:pb-4"
    >
      <div className="pointer-events-auto w-full max-w-xl rounded-2xl border border-violet-300/60 bg-white p-4 shadow-2xl shadow-violet-500/20 dark:border-violet-400/30 dark:bg-[#15131f] sm:p-5">
        {done ? (
          <p className="py-2 text-center tkad-type-title text-violet-600 dark:text-violet-300">
            소중한 의견 감사합니다 🙏
          </p>
        ) : (
          <>
            <div className="flex items-start justify-between gap-3">
              <p className="text-sm font-bold text-gray-900 dark:text-white">
                찾으시는 게 있으셨나요?
              </p>
              <button
                type="button"
                onClick={dismiss}
                aria-label="닫기"
                className="-mr-1 -mt-1 rounded-lg p-1 text-gray-400 transition hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-white/10"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <p className="mt-0.5 tkad-type-caption text-gray-500 dark:text-white/50">
              한 번만 눌러주시면 끝이에요. (입력 없음)
            </p>
            <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-3">
              {ANSWERS.map((a) => (
                <button
                  key={a.key}
                  type="button"
                  onClick={() => answer(a.key)}
                  className="flex items-center justify-center gap-1.5 rounded-xl border border-gray-200 bg-gray-50 px-3 py-2.5 tkad-type-title text-gray-800 transition hover:border-violet-400 hover:bg-violet-50 dark:border-white/10 dark:bg-white/5 dark:text-white dark:hover:border-violet-400/50 dark:hover:bg-violet-500/10"
                >
                  <span aria-hidden>{a.emoji}</span>
                  <span>{a.label}</span>
                </button>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
