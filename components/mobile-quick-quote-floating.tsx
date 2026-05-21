"use client";

import { useEffect, useState, useCallback } from "react";
import { useLocale, useTranslations } from "next-intl";
import { usePathname } from "next/navigation";
import { ArrowRight, X } from "lucide-react";
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
  const [phone, setPhone] = useState("");
  const [budget, setBudget] = useState("");
  const [region, setRegion] = useState("");
  const [startDate, setStartDate] = useState("");

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
      setVisible(ratio >= 0.5);
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [isHome]);

  const submit = useCallback(async () => {
    if (!company.trim() || !phone.trim() || !budget.trim() || !region.trim() || !startDate.trim()) {
      return;
    }
    setSubmitting(true);
    try {
      const sessionId = getOrCreateTrackingSessionId();
      const res = await fetch("/api/leads/quick-quote", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          company: company.trim(),
          phone: phone.trim(),
          budget: budget.trim(),
          region: region.trim(),
          startDate: startDate.trim(),
          sessionId,
          locale,
        }),
      });
      const json = (await res.json()) as { ok?: boolean };
      if (json.ok) {
        setDone(true);
        trackConversion({ type: "quote_request", metadata: { source: "home_quick_quote" } });
        trackJourneyStep({ step: "quick_quote_submit", mark: "quick_quote" });
        trackJourneyStep({ step: "quote_request", mark: "quote_requested" });
      }
    } finally {
      setSubmitting(false);
    }
  }, [company, phone, budget, region, startDate, locale]);

  if (!isHome) return null;

  return (
    <>
      <div
        className={cn(
          "fixed bottom-20 left-4 right-4 z-50 md:hidden transition-all duration-300",
          visible ? "translate-y-0 opacity-100" : "translate-y-6 opacity-0 pointer-events-none",
        )}
      >
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="tkad-neon-cta flex w-full items-center justify-center gap-2 rounded-2xl px-5 py-3.5 text-sm font-black text-white shadow-lg"
        >
          {t("floatingCta")}
          <ArrowRight className="h-4 w-4" aria-hidden />
        </button>
      </div>

      <Modal
        open={open}
        onClose={() => {
          setOpen(false);
          if (done) {
            setDone(false);
            setCompany("");
            setPhone("");
            setBudget("");
            setRegion("");
            setStartDate("");
          }
        }}
        ariaLabel={t("modalTitle")}
        className="max-w-[min(100%,420px)] border-white/14"
      >
        <div className="px-6 pb-8 pt-7">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className="text-lg font-black text-white">{t("modalTitle")}</h2>
              <p className="mt-1 text-sm text-white/65">{t("modalSub")}</p>
            </div>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="rounded-lg p-1 text-white/60 hover:bg-white/10"
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
              {(
                [
                  [t("fieldCompany"), company, setCompany, "text"],
                  [t("fieldPhone"), phone, setPhone, "tel"],
                  [t("fieldBudget"), budget, setBudget, "text"],
                  [t("fieldRegion"), region, setRegion, "text"],
                  [t("fieldStart"), startDate, setStartDate, "date"],
                ] as const
              ).map(([label, value, setter, type]) => (
                <label key={label} className="block">
                  <span className="text-xs font-semibold text-white/55">{label}</span>
                  <input
                    type={type}
                    required
                    value={value}
                    onChange={(e) => setter(e.target.value)}
                    className="mt-1 w-full rounded-xl border border-white/14 bg-black/40 px-3 py-2.5 text-sm text-white"
                  />
                </label>
              ))}
              <button
                type="submit"
                disabled={submitting}
                className="tkad-neon-cta mt-2 w-full rounded-2xl py-3 text-sm font-black text-white disabled:opacity-60"
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
