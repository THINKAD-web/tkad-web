"use client";

import { useMemo, useState } from "react";
import { Calculator } from "lucide-react";
import { Link } from "@/i18n/navigation";
import type { MediaItem } from "@/lib/media-data";
import { calculateMediaQuoteByDays, formatWonShort } from "@/lib/compare-quote";
import { MediaPriceExclNote } from "@/components/media/media-price-excl-note";
import { formatCatalogPriceFieldWon } from "@/lib/media-price-format";
import { cn } from "@/lib/utils";

type Props = {
  media: MediaItem;
  isKo: boolean;
  className?: string;
};

const DAY_PRESETS = [7, 14, 30, 60];

export function MediaQuoteCalculator({ media, isKo, className }: Props) {
  const locale = isKo ? "ko" : "en";
  const localeTag = isKo ? "ko-KR" : "en-US";
  const [days, setDays] = useState(30);
  const [includeVat, setIncludeVat] = useState(false);

  const quote = useMemo(
    () => calculateMediaQuoteByDays(media, days),
    [media, days],
  );

  const displayCost = includeVat
    ? Math.round(quote.costWon * 1.1)
    : quote.costWon;

  const contactHref = useMemo(() => {
    const vatNote = includeVat
      ? isKo
        ? "VAT 포함"
        : "VAT incl."
      : isKo
        ? "VAT 별도"
        : "excl. VAT";
    const summary = [
      isKo ? "[매체 상세 · 인스턴트 견적]" : "[Media detail · instant quote]",
      isKo ? `매체: ${media.name} (${media.id})` : `Media: ${media.name} (${media.id})`,
      isKo ? `집행 기간: ${days}일` : `Duration: ${days} days`,
      isKo
        ? `예상 비용(${vatNote}): ${formatWonShort(displayCost, locale)}`
        : `Est. cost (${vatNote}): ${formatWonShort(displayCost, locale)}`,
      quote.impressions > 0
        ? isKo
          ? `예상 노출: ${quote.impressions.toLocaleString("ko-KR")}회`
          : `Est. impressions: ${quote.impressions.toLocaleString("en-US")}`
        : null,
    ]
      .filter(Boolean)
      .join("\n");
    const q = new URLSearchParams();
    q.set("type", "media");
    q.set("media", media.id);
    q.set("quote", summary);
    return `/contact?${q.toString()}`;
  }, [days, displayCost, includeVat, isKo, locale, media, quote.impressions]);

  const inputCls =
    "h-10 rounded-xl border border-border bg-background px-3  text-sm text-foreground outline-none focus:border-primary/40 focus:ring-2 focus:ring-primary/15";

  return (
    <section
      className={cn(
        "tkad-glass-surface rounded-2xl border-2 border-border/80 p-5 sm:p-6",
        className,
      )}
      id="media-quote-calculator"
    >
      <p className="inline-flex items-center gap-2 font-display text-xs font-medium uppercase tracking-[0.22em] text-cyan-700 dark:text-cyan-300/90">
        <Calculator className="h-3.5 w-3.5" aria-hidden />
        {isKo ? "간편 견적" : "Quick estimate"}
      </p>
      <h2 className="mt-2 text-lg font-black text-foreground">
        {isKo ? "집행 기간별 예상 비용" : "Cost by flight length"}
      </h2>
      <p className="mt-1 text-xs text-muted-foreground">
        {isKo
          ? `기준 단가 ${formatCatalogPriceFieldWon(media.price, localeTag)} · 실제 견적은 옵션·시즌에 따라 달라질 수 있습니다.`
          : `List ${formatCatalogPriceFieldWon(media.price, localeTag)} · Final quote may vary by option and season.`}
      </p>
      <MediaPriceExclNote isKo={isKo} className="mt-1" />

      <div className="mt-4 flex flex-wrap gap-2">
        {DAY_PRESETS.map((d) => (
          <button
            key={d}
            type="button"
            onClick={() => setDays(d)}
            className={cn(
              "rounded-lg border px-3 py-1.5  text-[11px] font-bold transition-colors",
              days === d
                ? "border-cyan-600/40 bg-cyan-500/15 text-cyan-900 dark:border-cyan-400/50 dark:text-cyan-200"
                : "border-border text-muted-foreground hover:border-foreground/25 hover:text-foreground",
            )}
          >
            {d}
            {isKo ? "일" : "d"}
          </button>
        ))}
        <label className="flex items-center gap-2 rounded-lg border border-border px-3 py-1.5 text-[11px] text-muted-foreground">
          <input
            type="number"
            min={1}
            max={365}
            value={days}
            onChange={(e) => setDays(Math.max(1, Number(e.target.value) || 1))}
            className={cn(inputCls, "h-8 w-16 border-0 bg-transparent p-0")}
          />
          <span>{isKo ? "일" : "days"}</span>
        </label>
      </div>

      <label className="mt-4 flex cursor-pointer items-center gap-2 text-sm text-foreground/80">
        <input
          type="checkbox"
          checked={includeVat}
          onChange={(e) => setIncludeVat(e.target.checked)}
          className="rounded dark:border-white/20 border-gray-300"
        />
        {isKo ? "VAT 포함 금액 표시" : "Show price including VAT (10%)"}
      </label>

      <p className="mt-5 text-2xl font-black tabular-nums text-foreground sm:text-3xl">
        {isKo ? "집행 기간: " : "Duration: "}
        <span className="text-cyan-700 dark:text-cyan-300">{days}</span>
        {isKo ? "일 → " : "d → "}
        <span className="bg-gradient-to-r from-violet-300 to-cyan-300 bg-clip-text text-transparent">
          {isKo ? "예상 비용 " : "Est. "}
          {formatWonShort(displayCost, locale)}
        </span>
      </p>

      {quote.impressions > 0 && (
        <p className="mt-2 text-[12px] text-muted-foreground">
          {isKo ? "예상 노출 " : "Est. reach "}
          {quote.impressions.toLocaleString(localeTag)}
          {isKo ? "회" : ""}
          {quote.cpm ? (
            <>
              {" · CPM "}
              <span className="text-emerald-300">
                ₩{quote.cpm.toLocaleString(localeTag)}
              </span>
            </>
          ) : null}
        </p>
      )}

      <Link
        href={contactHref}
        className="mt-5 inline-flex min-h-11 items-center justify-center rounded-xl border border-border bg-muted px-5 text-sm font-semibold text-foreground transition-colors hover:bg-muted/80"
      >
        {isKo ? "이 견적으로 문의하기" : "Inquire with this estimate"}
      </Link>
    </section>
  );
}
