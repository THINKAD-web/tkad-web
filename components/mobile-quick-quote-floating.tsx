"use client";

import { useEffect, useState, useCallback } from "react";
import { useLocale, useTranslations } from "next-intl";
import { usePathname } from "next/navigation";
import { MessageCircle, X } from "lucide-react";
import Modal from "@/components/ui/modal";
import {
  getOrCreateTrackingSessionId,
  trackConversion,
  trackJourneyStep,
} from "@/lib/tracking/client";
import { cn } from "@/lib/utils";

export default function MobileQuickQuoteFloating() {
  const locale = useLocale();
  const t = useTranslations("homePage.quickQuote");
  const pathname = usePathname();
  const isKo = locale.startsWith("ko");

  const [visible, setVisible] = useState(false);
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [company, setCompany] = useState("");
  const [contact, setContact] = useState("");
  const [memo, setMemo] = useState("");

  const isHome =
    pathname === `/${locale}` ||
    pathname === "/" ||
    /^\/(ko|en)(\/)?$/.test(pathname ?? "");

  useEffect(() => {
    if (!isHome) return;
    const onScroll = () => {
      const doc = document.documentElement;
      const max = doc.scrollHeight - doc.clientHeight;
      const ratio = max > 0 ? window.scrollY / max : 0;
      setVisible(ratio >= 0.35);
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [isHome]);

  const submit = useCallback(async () => {
    if (!company.trim() || !contact.trim()) return;
    setSubmitting(true);
    try {
      const sessionId = getOrCreateTrackingSessionId();
      const res = await fetch("/api/leads/quick-contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          company: company.trim(),
          contact: contact.trim(),
          memo: memo.trim() || undefined,
          sessionId,
          locale,
        }),
      });
      const json = (await res.json()) as { ok?: boolean };
      if (json.ok) {
        setDone(true);
        trackConversion({ type: "quote_request", metadata: { source: "home_mobile_sticky" } });
        trackJourneyStep({ step: "quick_contact_submit", mark: "quote_requested" });
      }
    } finally {
      setSubmitting(false);
    }
  }, [company, contact, memo, locale]);

  if (!isHome) return null;

  return (
    <>
      <div
        className={cn(
          "fixed bottom-0 left-0 right-0 z-50 md:hidden transition-all duration-300 px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-2",
          visible ? "translate-y-0 opacity-100" : "translate-y-full opacity-0 pointer-events-none",
        )}
      >
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-violet-500 to-cyan-400 px-5 py-3.5 text-sm font-black dark:text-white text-gray-900 shadow-[0_8px_32px_rgba(124,58,237,0.35)]"
        >
          <MessageCircle className="h-4 w-4" aria-hidden />
          {t("floatingCta")}
        </button>
      </div>

      <Modal
        open={open}
        onClose={() => {
          setOpen(false);
          if (done) {
            setDone(false);
            setCompany("");
            setContact("");
            setMemo("");
          }
        }}
        ariaLabel={t("modalTitle")}
        className="max-w-[min(100%,420px)] dark:border-white/14 border-gray-200"
      >
        <div className="px-6 pb-8 pt-7">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className="text-lg font-black dark:text-white text-gray-900">{t("modalTitle")}</h2>
              <p className="mt-1 text-sm dark:text-white text-gray-600">{t("modalSub")}</p>
            </div>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="rounded-lg p-1 dark:text-white text-gray-500 hover:dark:bg-white/10 bg-gray-100"
              aria-label={isKo ? "닫기" : "Close"}
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {done ? (
            <p className="mt-6 text-sm font-semibold text-emerald-300">{t("success")}</p>
          ) : (
            <form
              className="mt-5 space-y-3"
              onSubmit={(e) => {
                e.preventDefault();
                void submit();
              }}
            >
              <label className="block">
                <span className="text-xs font-semibold dark:text-white text-gray-500">{t("fieldCompany")}</span>
                <input
                  type="text"
                  required
                  value={company}
                  onChange={(e) => setCompany(e.target.value)}
                  className="mt-1 w-full rounded-xl border dark:border-white/14 border-gray-200 dark:bg-black bg-white bg-white/40 dark:bg-white/8 bg-gray-100 px-3 py-2.5 text-sm dark:text-white text-gray-900"
                />
              </label>
              <label className="block">
                <span className="text-xs font-semibold dark:text-white text-gray-500">{t("fieldContact")}</span>
                <input
                  type="tel"
                  required
                  value={contact}
                  onChange={(e) => setContact(e.target.value)}
                  placeholder={isKo ? "010-0000-0000" : "+82 10-0000-0000"}
                  className="mt-1 w-full rounded-xl border dark:border-white/14 border-gray-200 dark:bg-black bg-white bg-white/40 dark:bg-white/8 bg-gray-100 px-3 py-2.5 text-sm dark:text-white text-gray-900"
                />
              </label>
              <label className="block">
                <span className="text-xs font-semibold dark:text-white text-gray-500">{t("fieldMemo")}</span>
                <input
                  type="text"
                  value={memo}
                  onChange={(e) => setMemo(e.target.value)}
                  placeholder={isKo ? "캠페인 목표 한 줄" : "One-line campaign goal"}
                  className="mt-1 w-full rounded-xl border dark:border-white/14 border-gray-200 dark:bg-black bg-white bg-white/40 dark:bg-white/8 bg-gray-100 px-3 py-2.5 text-sm dark:text-white text-gray-900"
                />
              </label>
              <button
                type="submit"
                disabled={submitting}
                className="mt-2 w-full rounded-2xl bg-gradient-to-r from-violet-500 to-cyan-400 py-3 text-sm font-black dark:text-white text-gray-900 disabled:opacity-60"
              >
                {submitting ? "…" : t("submit")}
              </button>
            </form>
          )}
        </div>
      </Modal>
    </>
  );
}
