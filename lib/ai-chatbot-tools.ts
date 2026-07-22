import { executePlanFromBrief } from "@/lib/ai-chatbot-plan-from-brief";
import type { MediaItem, MediaPricePeriodKey } from "@/lib/media-data";
import {
  getPrimaryMediaImageUrl,
  matchesMediaTextQuery,
  typeLabels,
} from "@/lib/media-data";
import { CATALOG_MEDIA_TYPES } from "@/lib/media-auto-categorize";
import {
  matchesPlannerCategory,
  type PlannerCategory,
} from "@/lib/planner-logic";
import { catalogPriceFieldToPriceMan } from "@/lib/media-price-format";

/** JSON Schema object for tool `parameters` (OpenAI / xAI 호환) */
export type AiChatbotToolInputSchema = {
  type: "object";
  properties: Record<string, unknown>;
  required?: string[];
};

export type AiChatbotToolSpec = {
  name: string;
  description: string;
  input_schema: AiChatbotToolInputSchema;
};

export type AiChatbotMediaCard = {
  id: string;
  name: string;
  nameEn: string;
  location: string;
  price: number;
  pricePeriod?: MediaPricePeriodKey;
  type: string;
  region: string;
  /** 썸네일 URL (없으면 카드에서 플레이스홀더) */
  imageUrl?: string | null;
};

function compact(m: MediaItem): AiChatbotMediaCard {
  return {
    id: m.id,
    name: m.name,
    nameEn: m.nameEn,
    location: m.location,
    price: catalogPriceFieldToPriceMan(m.price),
    pricePeriod: m.pricePeriod,
    type: m.type,
    region: m.region,
    imageUrl: getPrimaryMediaImageUrl(m),
  };
}

function clampLimit(n: unknown, fallback: number, cap: number): number {
  const x = typeof n === "number" && Number.isFinite(n) ? Math.floor(n) : fallback;
  return Math.min(cap, Math.max(1, x));
}

function searchBlob(m: MediaItem): string {
  const parts = [
    m.name,
    m.nameEn,
    m.location,
    m.locationEn,
    m.district,
    m.city,
    m.nearbyStations,
    m.nearbyFacilities,
    m.nearbyLandmarks,
    m.subCategory,
    typeLabels[m.type]?.ko,
    typeLabels[m.type]?.en,
    ...(m.tags ?? []),
  ];
  return parts.filter(Boolean).join(" ").toLowerCase();
}

/** 텍스트 검색: 전체 구문 또는 공백 분리 토큰 전부 포함 */
function matchesSearchQuery(m: MediaItem, query: string): boolean {
  const lower = query.trim().toLowerCase();
  if (!lower) return false;
  if (matchesMediaTextQuery(m, lower)) return true;
  const tokens = lower.split(/\s+/).filter((t) => t.length > 1);
  if (tokens.length < 2) return false;
  const blob = searchBlob(m);
  return tokens.every((t) => blob.includes(t));
}

export function getAiChatbotTools(): AiChatbotToolSpec[] {
  return [
    {
      name: "planFromBrief",
      description:
        "Parse a natural-language campaign brief with the rule-based planner parser (0 tokens), then rank media with the same scoreMedia engine as /planner Step 4. Prefer for mixed briefs: region + goal + budget + age + format (택시, 버스, 이동형, 경기, 30대, 강남 브랜딩, etc.). Returns parseSummary, parsed fields, reasonLabels per item, and /planner?brief= deeplink. Do not invent fields missing from parse.",
      input_schema: {
        type: "object",
        properties: {
          brief: {
            type: "string",
            description:
              "User campaign utterance in Korean or English (pass the user's words, trimmed)",
          },
          limit: {
            type: "number",
            description: "Max ranked items (default 6, max 10)",
          },
        },
        required: ["brief"],
      },
    },
    {
      name: "searchMedia",
      description:
        "Search THINKAD public OOH media by free text: station names (e.g. 논현역), district, address keywords, format, tags. Monthly price is in 만원 (10,000 KRW units). Use before answering location/format questions.",
      input_schema: {
        type: "object",
        properties: {
          query: {
            type: "string",
            description: "Search query in Korean or English",
          },
          limit: {
            type: "number",
            description: "Max items to return (default 12, max 20)",
          },
        },
        required: ["query"],
      },
    },
    {
      name: "getMediaByBudget",
      description:
        "List media whose monthly rate (만원) is between minPrice and maxPrice inclusive. Use when the user gives a budget in 만원 per month.",
      input_schema: {
        type: "object",
        properties: {
          minPrice: {
            type: "number",
            description: "Minimum monthly price in 만원 (default 0)",
          },
          maxPrice: {
            type: "number",
            description: "Maximum monthly price in 만원 (required)",
          },
          limit: {
            type: "number",
            description: "Max results (default 15, max 25)",
          },
        },
        required: ["maxPrice"],
      },
    },
    {
      name: "recommendMedia",
      description:
        "Legacy fallback only when planFromBrief is unsuitable. Simple filter by region (seoul|busan|jeju|national), type (digital|static|mobile), max monthly price in 만원, and keywords. Prefer planFromBrief for campaign-style briefs.",
      input_schema: {
        type: "object",
        properties: {
          goals: {
            type: "string",
            description: "Campaign goal or context (used with keywords)",
          },
          region: {
            type: "string",
            description: "Filter by region code or empty",
          },
          type: {
            type: "string",
            description:
              "digital|static|mobile (legacy: billboard, bus, subway). Empty = any.",
          },
          maxPrice: {
            type: "number",
            description: "Maximum monthly price in 만원 — optional",
          },
          keywords: {
            type: "string",
            description: "Extra search terms (location, audience, format)",
          },
          limit: {
            type: "number",
            description: "Max results (default 10, max 20)",
          },
        },
      },
    },
  ];
}

export function executeChatbotTool(
  name: string,
  rawInput: unknown,
  catalog: MediaItem[],
  locale: "ko" | "en" = "ko",
): { result: unknown; cards: AiChatbotMediaCard[] } {
  const input = rawInput && typeof rawInput === "object" ? (rawInput as Record<string, unknown>) : {};

  if (name === "planFromBrief") {
    const brief = String(input.brief ?? "").trim();
    const out = executePlanFromBrief(brief, catalog, locale, input.limit);
    if ("error" in out) {
      return { result: { error: out.error }, cards: [] };
    }
    const cards = out.items.slice(0, 6).map(
      ({
        score: _s,
        reasonKeys: _k,
        reasonLabels: _l,
        matchPrecision: _p,
        matchPrecisionLabel: _pl,
        ...card
      }) => card,
    );
    return { result: out, cards };
  }

  if (name === "searchMedia") {
    const query = String(input.query ?? "").trim();
    const limit = clampLimit(input.limit, 12, 20);
    if (!query) {
      return { result: { error: "query is required" }, cards: [] };
    }
    const matched = catalog.filter((m) => matchesSearchQuery(m, query));
    const items = matched.slice(0, limit).map(compact);
    return {
      result: {
        query,
        totalMatches: matched.length,
        returned: items.length,
        items,
      },
      cards: items.slice(0, 6),
    };
  }

  if (name === "getMediaByBudget") {
    const maxPrice = Number(input.maxPrice);
    if (!Number.isFinite(maxPrice) || maxPrice < 0) {
      return { result: { error: "maxPrice must be a non-negative number" }, cards: [] };
    }
    const minPrice =
      input.minPrice !== undefined && input.minPrice !== null
        ? Number(input.minPrice)
        : 0;
    const lo = Number.isFinite(minPrice) && minPrice >= 0 ? minPrice : 0;
    const limit = clampLimit(input.limit, 15, 25);
    const matched = catalog.filter((m) => {
      const p = catalogPriceFieldToPriceMan(m.price);
      return p >= lo && p <= maxPrice;
    });
    const sorted = [...matched].sort(
      (a, b) => catalogPriceFieldToPriceMan(a.price) - catalogPriceFieldToPriceMan(b.price),
    );
    const items = sorted.slice(0, limit).map(compact);
    return {
      result: {
        minPrice: lo,
        maxPrice,
        totalMatches: matched.length,
        returned: items.length,
        items,
      },
      cards: items.slice(0, 6),
    };
  }

  if (name === "recommendMedia") {
    const limit = clampLimit(input.limit, 10, 20);
    const region = String(input.region ?? "")
      .trim()
      .toLowerCase();
    const typeFilter = String(input.type ?? "")
      .trim()
      .toLowerCase();
    const maxPrice =
      input.maxPrice !== undefined && input.maxPrice !== null
        ? Number(input.maxPrice)
        : null;
    const keywords = [String(input.goals ?? ""), String(input.keywords ?? "")]
      .join(" ")
      .trim();
    const lowerKw = keywords.toLowerCase();

    let pool = catalog;
    if (region && ["seoul", "busan", "jeju", "national"].includes(region)) {
      pool = pool.filter((m) => m.region === region);
    }
    const legacyPlannerType: Record<string, PlannerCategory> = {
      billboard: "static",
      bus: "mobile",
      subway: "mobile",
    };
    const plannerCats: PlannerCategory[] = ["digital", "static", "mobile"];
    const plannerResolved =
      typeFilter && legacyPlannerType[typeFilter]
        ? legacyPlannerType[typeFilter]
        : typeFilter && plannerCats.includes(typeFilter as PlannerCategory)
          ? (typeFilter as PlannerCategory)
          : null;
    if (plannerResolved) {
      pool = pool.filter((m) => matchesPlannerCategory(m, plannerResolved));
    } else if (
      typeFilter &&
      (CATALOG_MEDIA_TYPES as readonly string[]).includes(typeFilter)
    ) {
      pool = pool.filter((m) => m.type === typeFilter);
    }
    if (maxPrice != null && Number.isFinite(maxPrice) && maxPrice >= 0) {
      pool = pool.filter(
        (m) => catalogPriceFieldToPriceMan(m.price) <= maxPrice,
      );
    }
    if (lowerKw) {
      pool = pool.filter((m) => matchesSearchQuery(m, lowerKw));
    }

    const scored = pool.map((m) => {
      let s = 0;
      const priceMan = catalogPriceFieldToPriceMan(m.price);
      if (maxPrice != null && Number.isFinite(maxPrice) && priceMan <= maxPrice) {
        s += 2;
      }
      if (lowerKw && matchesMediaTextQuery(m, lowerKw)) s += 3;
      s += Math.min(2, m.dailyFootTraffic / 200_000);
      return { m, s };
    });
    scored.sort(
      (a, b) =>
        b.s - a.s ||
        catalogPriceFieldToPriceMan(a.m.price) - catalogPriceFieldToPriceMan(b.m.price),
    );
    const items = scored.slice(0, limit).map(({ m }) => compact(m));
    return {
      result: {
        filters: { region: region || null, type: typeFilter || null, maxPrice },
        keywords: keywords || null,
        totalAfterFilter: pool.length,
        returned: items.length,
        items,
      },
      cards: items.slice(0, 6),
    };
  }

  return { result: { error: `unknown tool: ${name}` }, cards: [] };
}
