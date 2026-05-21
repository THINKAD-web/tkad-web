"use client";

import { useEffect, useState } from "react";
import { useLocale } from "next-intl";
import { usePathname } from "next/navigation";
import { Gift } from "lucide-react";
import { cn } from "@/lib/utils";

const DAY_KEY = "tkad-exit-intent-last-shown-date";
const NEVER_KEY = "tkad-exit-intent-never";

function todayKey(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

/** 모바일: 스크롤 70% 시 하단 가이드북 띠 (PC exit 모달과 별도) */
export default function ExitIntentMobileBanner() {
  const locale = useLocale();
  const isKo = locale.startsWith("ko");
  const pathname = usePathname();
  const [visible, setVisible] = useState(false);
  const [openModal, setOpenModal] = useState(false);

  const isHome =
    pathname === `/${locale}` ||
    pathname === "/" ||
    /^\/(ko|en)(\/)?$/.test(pathname ?? "");

  useEffect(() => {
    if (!isHome || typeof window === "undefined") return;
    try {
      if (localStorage.getItem(NEVER_KEY) === "1") return;
      if (localStorage.getItem(DAY_KEY) === todayKey()) return;
    } catch {
      /* ignore */
    }

    const onScroll = () => {
      const doc = document.documentElement;
      const max = doc.scrollHeight - doc.clientHeight;
      const ratio = max > 0 ? window.scrollY / max : 0;
      if (ratio >= 0.7) {
        setVisible(true);
        try {
          localStorage.setItem(DAY_KEY, todayKey());
        } catch {
          /* ignore */
        }
      }
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [isHome]);

  if (!isHome || !visible) return null;

  return (
    <>
      <div
        className={cn(
          "fixed bottom-[4.5rem] left-3 right-3 z-[47] md:hidden transition-all",
          visible ? "opacity-100" : "opacity-0 pointer-events-none",
        )}
      >
        <button
          type="button"
          onClick={() => setOpenModal(true)}
          className="flex w-full items-center gap-3 rounded-2xl border dark:border-white/14 border-gray-200 bg-[#12121a]/95 px-4 py-3 text-left shadow-lg backdrop-blur"
        >
          <Gift className="h-5 w-5 shrink-0 text-cyan-300" aria-hidden />
          <span className="text-sm font-bold dark:text-white text-gray-900">
            {isKo
              ? "잠시만요! 무료 OOH 가이드북"
              : "Free OOH guidebook"}
          </span>
        </button>
        <button
          type="button"
          onClick={() => {
            setVisible(false);
            try {
              localStorage.setItem(NEVER_KEY, "1");
            } catch {
              /* ignore */
            }
          }}
          className="mt-1 w-full text-center text-[10px] font-semibold dark:text-white"
        >
          {isKo ? "다시 보지 않기" : "Don't show again"}
        </button>
      </div>

      {openModal ? (
        <ExitGuideSheet
          isKo={isKo}
          locale={locale}
          onClose={() => {
            setOpenModal(false);
            setVisible(false);
          }}
        />
      ) : null}
    </>
  );
}

function ExitGuideSheet({
  isKo,
  locale,
  onClose,
}: {
  isKo: boolean;
  locale: string;
  onClose: () => void;
}) {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const submit = async () => {
    const trimmed = email.trim();
    if (!trimmed) return;
    setLoading(true);
    try {
      const res = await fetch("/api/leads/exit-guide", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: trimmed, locale }),
      });
      const json = (await res.json()) as { ok?: boolean };
      if (json.ok) setSent(true);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-end dark:bg-black bg-white dark:bg-white/6 bg-gray-500 md:hidden">
      <div className="w-full rounded-t-3xl border-t dark:border-white/14 border-gray-200 bg-[#0c0c14] p-6 pb-10">
        <h2 className="text-lg font-black dark:text-white text-gray-900">
          {isKo ? "무료 OOH 가이드북" : "Free OOH guide"}
        </h2>
        {sent ? (
          <p className="mt-4 text-sm text-emerald-300">
            {isKo ? "발송 완료! 메일함을 확인해 주세요." : "Sent! Check your inbox."}
          </p>
        ) : (
          <form
            className="mt-4 space-y-3"
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
              placeholder="work@company.com"
              className="w-full rounded-xl border dark:border-white/14 border-gray-200 dark:bg-black bg-white bg-white/40 dark:bg-white/8 bg-gray-100 px-4 py-3 text-sm dark:text-white text-gray-900"
            />
            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-2xl bg-gradient-to-r from-violet-500 to-cyan-400 py-3 text-sm font-black dark:text-white text-gray-900"
            >
              {isKo ? "받기" : "Get it"}
            </button>
          </form>
        )}
        <button
          type="button"
          onClick={onClose}
          className="mt-4 w-full text-sm dark:text-white text-gray-500"
        >
          {isKo ? "닫기" : "Close"}
        </button>
      </div>
    </div>
  );
}
