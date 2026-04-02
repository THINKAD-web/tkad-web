import type { KeywordFilterMediaItem } from "@/lib/media-keyword-filter-types";
import type { MediaPriceOption } from "@/lib/media-data";

function parseRawPriceOptions(raw: unknown): MediaPriceOption[] | undefined {
  if (!Array.isArray(raw) || raw.length === 0) return undefined;
  const out: MediaPriceOption[] = [];
  for (const row of raw) {
    if (!row || typeof row !== "object") continue;
    const o = row as Record<string, unknown>;
    const label = String(o.label ?? "").trim();
    const price = Number(o.price);
    if (!label || !Number.isFinite(price) || price < 0) continue;
    const periodRaw = o.period;
    const period =
      periodRaw === undefined || periodRaw === null
        ? undefined
        : String(periodRaw);
    const desc = o.description != null ? String(o.description).trim() : "";
    out.push({
      label,
      price,
      period: period || undefined,
      description: desc || undefined,
    });
  }
  return out.length > 0 ? out : undefined;
}

/**
 * `data/media-items-keyword-filter.json` 항목을 느슨하게 읽어
 * `KeywordFilterMediaItem`으로 통일합니다.
 *
 * - `price_per_month`: 기본 만원; 값이 1_000_000 이상이면 원(KRW)으로 간주합니다.
 *   `priceUnit`/`price_per_month_unit`: `"krw"`|`"won"`|`"원"` 또는 `"man_won"`|`"만원"`으로 명시 가능.
 * - `media_name` → `mediaName` (실제 매체명).
 * - `full_address`, `city`는 검색·표시용으로 보존합니다.
 */
function resolvePricePerMonthAndBudgetWon(raw: Record<string, unknown>): {
  ppmMan: number;
  budgetWon: number;
  hasPpm: boolean;
} {
  const ppmInput = Number(raw.price_per_month);
  const hasPpm = Number.isFinite(ppmInput) && ppmInput > 0;
  if (!hasPpm) return { ppmMan: 0, budgetWon: 0, hasPpm: false };

  const unitRaw = String(
    raw.priceUnit ?? raw.price_per_month_unit ?? "",
  ).toLowerCase();
  const explicitKrw =
    unitRaw === "krw" ||
    unitRaw === "won" ||
    unitRaw === "원" ||
    unitRaw === "krw_won";
  const explicitMan =
    unitRaw === "man_won" ||
    unitRaw === "manwon" ||
    unitRaw === "만원" ||
    unitRaw === "m";

  const treatAsKrw =
    explicitKrw || (!explicitMan && ppmInput >= 1_000_000);

  const ppmMan = treatAsKrw
    ? Math.max(1, Math.round(ppmInput / 10_000))
    : Math.round(ppmInput);
  const budgetWon = Math.round(ppmMan * 10_000);

  return { ppmMan, budgetWon, hasPpm: true };
}

export function expandRawKeywordRecord(
  raw: Record<string, unknown>,
): KeywordFilterMediaItem {
  const id = String(raw.id ?? "");
  const title = String(raw.title ?? "");
  const mediaName = String(raw.media_name ?? "").trim();
  const region = Array.isArray(raw.region)
    ? raw.region.map((x) => String(x))
    : [];
  const media = Array.isArray(raw.media)
    ? raw.media.map((x) => String(x))
    : [];
  const target = Array.isArray(raw.target)
    ? raw.target.map((x) => String(x))
    : [];
  const searchKeywords = Array.isArray(raw.searchKeywords)
    ? raw.searchKeywords.map((x) => String(x))
    : [];

  const { ppmMan, budgetWon, hasPpm } = resolvePricePerMonthAndBudgetWon(raw);

  const budgetMin =
    typeof raw.budgetMin === "number" && Number.isFinite(raw.budgetMin)
      ? raw.budgetMin
      : budgetWon > 0
        ? budgetWon
        : 10_000_000;
  const budgetMax =
    typeof raw.budgetMax === "number" && Number.isFinite(raw.budgetMax)
      ? raw.budgetMax
      : Math.max(budgetMin, budgetWon > 0 ? budgetWon : budgetMin);

  const city = String(raw.city ?? "");
  const full_address = String(raw.full_address ?? "");
  const descFromRaw = String(raw.description ?? "").trim();
  const descBase =
    descFromRaw ||
    [mediaName || title, full_address, city].filter(Boolean).join(" · ");

  const vs = Number(raw.visibilityScore);
  const visibilityScore =
    Number.isFinite(vs) && vs >= 0 && vs <= 100 ? Math.round(vs) : undefined;

  const defaultPriceText =
    hasPpm && ppmMan > 0 ? `월 ${ppmMan.toLocaleString("ko-KR")}만원~` : "";

  return {
    id,
    title,
    mediaName: mediaName || undefined,
    region,
    media,
    target,
    industry: Array.isArray(raw.industry)
      ? raw.industry.map((x) => String(x))
      : ["기타"],
    budgetMin,
    budgetMax,
    duration: Array.isArray(raw.duration)
      ? raw.duration.map((x) => String(x))
      : ["협의"],
    exposureTime: Array.isArray(raw.exposureTime)
      ? raw.exposureTime.map((x) => String(x))
      : ["협의"],
    size: String(raw.size ?? "기타"),
    features: Array.isArray(raw.features)
      ? raw.features.map((x) => String(x))
      : [],
    specialFeature: Array.isArray(raw.specialFeature)
      ? raw.specialFeature.map((x) => String(x))
      : [],
    status: String(raw.status ?? "문의"),
    priceText: String(raw.priceText ?? (defaultPriceText || "문의")),
    thumbnail: String(
      raw.thumbnail ?? "https://picsum.photos/seed/tkad-kw/800/500",
    ),
    description: descBase,
    searchKeywords,
    full_address,
    city,
    price_per_month: hasPpm ? ppmMan : undefined,
    visibilityScore,
    priceOptions: parseRawPriceOptions(raw.priceOptions),
  };
}

export function normalizeKeywordFilterCatalog(
  mediaItems: readonly Record<string, unknown>[],
): KeywordFilterMediaItem[] {
  return mediaItems.map((r) => expandRawKeywordRecord(r));
}
