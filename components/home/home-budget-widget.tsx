"use client";

import { useCallback, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import Image from "next/image";
import { ArrowRight, Loader2, Sparkles } from "lucide-react";
import { Link } from "@/i18n/navigation";
import {
  recommendUrlFromHomeBudget,
  type HomeBudgetIndustry,
  type HomeBudgetRegion,
} from "@/lib/home-budget-recommend";
import {
  getOrCreateTrackingSessionId,
  trackJourneyStep,
} from "@/lib/tracking/client";
import { cn } from "@/lib/utils";

type PreviewItem = {
  id: string;
  name: string;
  location: string;
  price: number;
  score: number;
  imageUrl: string | null;
  href: string;
};

const REGIONS: { id: HomeBudgetRegion; labelKo: string; labelEn: string }[] = [
  { id: "gangnam", labelKo: "강남", labelEn: "Gangnam" },
  { id: "hongdae", labelKo: "홍대", labelEn: "Hongdae" },
  { id: "seongsu", labelKo: "성수", labelEn: "Seongsu" },
  { id: "national", labelKo: "전국", labelEn: "Nationwide" },
];

const INDUSTRIES: { id: HomeBudgetIndustry; labelKo: string; labelEn: string }[] = [
  { id: "", labelKo: "선택 안 함", labelEn: "Optional" },
  { id: "beauty", labelKo: "뷰티", labelEn: "Beauty" },
  { id: "fnb", labelKo: "F&B", labelEn: "F&B" },
  { id: "tech", labelKo: "테크", labelEn: "Tech" },
  { id: "finance", labelKo: "금융", labelEn: "Finance" },
  { id: "entertainment", labelKo: "엔터", labelEn: "Entertainment" },
  { id: "other", labelKo: "기타", labelEn: "Other" },
];

export function HomeBudgetWidget() {
  const locale = useLocale();
  const t = useTranslations("homePage.budgetWidget");
  const isKo = locale.startsWith("ko");

  const [budgetMan, setBudgetMan] = useState(1500);
  const [region, setRegion] = useState<HomeBudgetRegion>("gangnam");
  const [industry, setIndustry] = useState<HomeBudgetIndustry>("");
  const [loading, setLoading] = useState(false);
  const [items, setItems] = useState<PreviewItem[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const runPreview = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const sessionId = getOrCreateTrackingSessionId();
      const res = await fetch("/api/home/budget-preview", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          budgetMan,
          region,
          industry: industry || "",
          sessionId,
          locale,
        }),
      });
      const json = (await res.json()) as {
        ok?: boolean;
        items?: PreviewItem[];
        error?: string;
      };
      if (!res.ok || !json.ok || !json.items) {
        setError(t("error"));
        setItems(null);
        return;
      }
      setItems(json.items);
      trackJourneyStep({
        step: "budget_preview",
        mark: "budget_preview",
        metadata: { budgetMan, region, industry },
      });
    } catch {
      setError(t("error"));
      setItems(null);
    } finally {
      setLoading(false);
    }
  }, [budgetMan, region, industry, locale, t]);

  const fullHref = recommendUrlFromHomeBudget(budgetMan, region, industry);

  return (
    <section
      className="relative mx-auto w-full max-w-6xl px-4 py-8 sm:px-6 lg:px-8"
      aria-label={t("ariaLabel")}
    >
      <div
        className={cn(
          "tkad-budget-widget-panel tkad-glass-surface rounded-3xl p-6 sm:p-8",
          "tkad-neon-border",
        )}
      >
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="flex items-center gap-2 font-mono text-[10px] font-bold uppercase tracking-[0.24em] text-white/55">
              <Sparkles className="h-3.5 w-3.5 text-cyan-300/90" aria-hidden />
              {t("kicker")}
            </p>
            <h2 className="mt-2 text-xl font-black tracking-tight text-white sm:text-2xl">
              {t("title")}
            </h2>
            <p className="mt-1 max-w-xl text-sm text-white/70">{t("subtitle")}</p>
          </div>
          <p className="font-mono text-2xl font-black tabular-nums text-cyan-300">
            {budgetMan.toLocaleString(isKo ? "ko-KR" : "en-US")}
            <span className="ml-1 text-sm font-bold text-white/60">
              {isKo ? "만원" : "M KRW"}
            </span>
          </p>
        </div>

        <div className="mt-6 space-y-5">
          <label className="block">
            <span className="font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-white/50">
              {t("budgetLabel")}
            </span>
            <input
              type="range"
              min={100}
              max={5000}
              step={50}
              value={budgetMan}
              onChange={(e) => setBudgetMan(Number(e.target.value))}
              className="mt-2 h-2 w-full cursor-pointer accent-cyan-400"
            />
            <div className="mt-1 flex justify-between font-mono text-[10px] text-white/45">
              <span>100{isKo ? "만" : "M"}</span>
              <span>5,000{isKo ? "만" : "M"}</span>
            </div>
          </label>

          <div>
            <span className="font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-white/50">
              {t("regionLabel")}
            </span>
            <div className="mt-2 flex flex-wrap gap-2">
              {REGIONS.map((r) => (
                <button
                  key={r.id}
                  type="button"
                  onClick={() => setRegion(r.id)}
                  className={cn(
                    "rounded-xl border px-4 py-2 text-sm font-semibold transition-colors",
                    region === r.id
                      ? "border-cyan-400/60 bg-cyan-500/20 text-white"
                      : "border-white/14 bg-white/[0.04] text-white/80 hover:border-white/25",
                  )}
                >
                  {isKo ? r.labelKo : r.labelEn}
                </button>
              ))}
            </div>
          </div>

          <div>
            <span className="font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-white/50">
              {t("industryLabel")}
            </span>
            <select
              value={industry}
              onChange={(e) => setIndustry(e.target.value as HomeBudgetIndustry)}
              className="mt-2 w-full max-w-xs rounded-xl border border-white/14 bg-black/40 px-3 py-2.5 text-sm text-white"
            >
              {INDUSTRIES.map((opt) => (
                <option key={opt.id || "none"} value={opt.id}>
                  {isKo ? opt.labelKo : opt.labelEn}
                </option>
              ))}
            </select>
          </div>

          <button
            type="button"
            onClick={() => void runPreview()}
            disabled={loading}
            className="tkad-neon-cta inline-flex h-11 items-center justify-center gap-2 rounded-2xl px-6 text-sm font-black text-white disabled:opacity-60"
          >
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
            ) : null}
            {t("ctaPreview")}
          </button>
        </div>

        {error ? (
          <p className="mt-4 text-sm text-red-300">{error}</p>
        ) : null}

        {items && items.length > 0 ? (
          <div className="mt-8 border-t border-white/10 pt-6">
            <p className="font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-white/50">
              {t("previewTitle")}
            </p>
            <ul className="mt-4 grid gap-3 sm:grid-cols-3">
              {items.map((item) => (
                <li key={item.id}>
                  <Link
                    href={item.href}
                    className="group flex gap-3 rounded-2xl border border-white/12 bg-white/[0.05] p-3 transition-colors hover:border-cyan-400/40"
                  >
                    <div className="relative h-16 w-20 shrink-0 overflow-hidden rounded-lg bg-white/10">
                      {item.imageUrl ? (
                        <Image
                          src={item.imageUrl}
                          alt=""
                          fill
                          className="object-cover"
                          sizes="80px"
                        />
                      ) : null}
                    </div>
                    <div className="min-w-0">
                      <p className="line-clamp-2 text-sm font-bold text-white">
                        {item.name}
                      </p>
                      <p className="mt-0.5 line-clamp-1 text-xs text-white/55">
                        {item.location}
                      </p>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
            <Link
              href={fullHref}
              className="mt-5 inline-flex items-center gap-2 text-sm font-bold text-cyan-300 hover:text-cyan-200"
            >
              {t("ctaFullResults")}
              <ArrowRight className="h-4 w-4" aria-hidden />
            </Link>
          </div>
        ) : items && items.length === 0 ? (
          <p className="mt-4 text-sm text-white/60">{t("empty")}</p>
        ) : null}
      </div>
    </section>
  );
}
