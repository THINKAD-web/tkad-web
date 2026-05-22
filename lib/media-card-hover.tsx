import type { MediaItem } from "@/lib/media-data";
import {
  formatCatalogPriceFieldWon,
  formatMediaPriceCompactWon,
  catalogPriceFieldToWon,
} from "@/lib/media-price-format";

function inferIndustryTags(m: MediaItem, isKo: boolean): string[] {
  const hay = [
    m.subCategory,
    m.type,
    ...(m.tags ?? []),
    m.features,
    m.featuresEn,
    m.location,
    m.name,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  const tags: string[] = [];
  if (/뷰티|beauty|화장|코스메|skincare/.test(hay))
    tags.push(isKo ? "뷰티" : "Beauty");
  if (/f&b|fnb|식음|카페|food|beverage/.test(hay))
    tags.push(isKo ? "F&B" : "F&B");
  if (/테크|tech|it\b|saas|앱/.test(hay)) tags.push(isKo ? "테크" : "Tech");
  if (/금융|finance|은행|보험/.test(hay))
    tags.push(isKo ? "금융" : "Finance");
  if (/엔터|entertainment|공연|k-pop/.test(hay))
    tags.push(isKo ? "엔터" : "Entertainment");
  if (tags.length === 0 && m.type)
    tags.push(isKo ? "OOH" : "OOH");
  return tags.slice(0, 3);
}

function formatImpressions(m: MediaItem, isKo: boolean): string {
  const n =
    m.monthlyFootTraffic ??
    m.impressions ??
    (m.dailyFootTraffic ? m.dailyFootTraffic * 30 : 0);
  if (!n || n <= 0) return isKo ? "추정치" : "Est.";
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 10_000) return `${Math.round(n / 10_000)}만`;
  return n.toLocaleString(isKo ? "ko-KR" : "en-US");
}

function formatCpm(m: MediaItem, locale: string): string {
  if (m.cpm && m.cpm > 0) {
    return formatMediaPriceCompactWon(Math.round(m.cpm), locale);
  }
  const imp = m.monthlyFootTraffic ?? m.impressions;
  if (imp && imp > 0 && m.price > 0) {
    const cpm =
      (catalogPriceFieldToWon(m.price) / imp) * 1000;
    return formatMediaPriceCompactWon(Math.round(cpm), locale);
  }
  return "—";
}

function availabilityLabel(m: MediaItem, isKo: boolean): string {
  const a = m.availability ?? "available";
  if (a === "available") return isKo ? "가용" : "Available";
  if (a === "reserved") return isKo ? "협의중" : "Reserved";
  return isKo ? "점검중" : "Maintenance";
}

export function buildMediaCardHoverOverlay(m: MediaItem, locale: string) {
  const isKo = locale.startsWith("ko");
  const tags = inferIndustryTags(m, isKo);
  const avail = availabilityLabel(m, isKo);
  const availClass =
    m.availability === "available"
      ? "text-emerald-300"
      : m.availability === "reserved"
        ? "text-amber-300"
        : "text-red-300";

  return (
    <div className="pointer-events-none space-y-2 p-4 text-left">
      <p className="font-mono text-[9px] font-bold uppercase tracking-[0.2em] text-white/70">
        [ {isKo ? "핵심 지표" : "Key metrics"} ]
      </p>
      <dl className="grid grid-cols-2 gap-x-3 gap-y-1.5 font-mono text-[11px] text-white">
        <dt className="text-white/55">{isKo ? "예상 노출" : "Est. reach"}</dt>
        <dd className="font-bold tabular-nums">{formatImpressions(m, isKo)}</dd>
        <dt className="text-white/55">CPM</dt>
        <dd className="font-bold tabular-nums">{formatCpm(m, locale)}</dd>
        <dt className="text-white/55">{isKo ? "가용" : "Status"}</dt>
        <dd className={`font-bold ${availClass}`}>{avail}</dd>
        {m.price > 0 ? (
          <>
            <dt className="text-white/55">{isKo ? "월 단가" : "Monthly"}</dt>
            <dd className="font-bold tabular-nums">
              {formatCatalogPriceFieldWon(m.price, locale)}
            </dd>
          </>
        ) : null}
      </dl>
      {tags.length > 0 ? (
        <div className="flex flex-wrap gap-1.5 pt-1">
          {tags.map((t) => (
            <span
              key={t}
              className="rounded-md border border-white/20 bg-white/10 px-2 py-0.5 text-[10px] font-semibold text-white/90"
            >
              {t}
            </span>
          ))}
        </div>
      ) : null}
    </div>
  );
}
