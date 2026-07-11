import type { MediaItem } from "@/lib/media-data";
import { catalogPriceFieldToPriceMan } from "@/lib/media-price-format";
import {
  executePlanFromBrief,
  type PlanFromBriefItem,
  type PlanFromBriefResult,
} from "@/lib/ai-chatbot-plan-from-brief";
import {
  executeChatbotTool,
  type AiChatbotMediaCard,
} from "@/lib/ai-chatbot-tools";
import { parsePlannerFreetextBrief } from "@/lib/planner/parse-freetext-brief";

export const RULE_CHATBOT_MODEL = "rule-based-v1" as const;

export type RuleChatbotResult = {
  reply: string;
  media: AiChatbotMediaCard[];
  recommendDeeplink: string | null;
  plannerDeeplink: string | null;
  engine: "rule";
  tokensUsed: 0;
  inputTokens: 0;
  outputTokens: 0;
  model: typeof RULE_CHATBOT_MODEL;
};

type SearchToolResult = {
  query: string;
  totalMatches: number;
  returned: number;
  items: AiChatbotMediaCard[];
};

type BudgetToolResult = {
  maxPrice: number;
  totalMatches: number;
  returned: number;
  items: AiChatbotMediaCard[];
};

function displayName(card: AiChatbotMediaCard, isKo: boolean): string {
  return isKo ? card.name : card.nameEn || card.name;
}

function formatPriceMan(price: number, isKo: boolean): string {
  return isKo
    ? `월 ${price.toLocaleString("ko-KR")}만원`
    : `${price.toLocaleString()}M KRW/mo`;
}

function contactFooter(isKo: boolean): string {
  return isKo
    ? "\n\n맛보기 수준의 추천입니다. 확정 견적·집행 상담은 [/contact](/contact)에서 요청해 주세요."
    : "\n\nThis is a quick preview. For confirmed quotes and execution, please [/contact](/contact).";
}

function buildPlanReply(plan: PlanFromBriefResult, locale: "ko" | "en"): string {
  const isKo = locale === "ko";
  const lines: string[] = [plan.parseSummary];

  if (plan.items.length === 0) {
    lines.push(
      isKo
        ? "\n조건에 맞는 매체를 찾지 못했습니다. 조건을 조금 바꿔 보시거나 문의로 상담을 요청해 주세요."
        : "\nNo media matched these conditions. Try adjusting your brief or contact us for help.",
    );
    return lines.join("") + contactFooter(isKo);
  }

  lines.push(
    isKo
      ? `\n\n아래 ${plan.items.length}개 매체를 추천드려요.`
      : `\n\nHere are ${plan.items.length} picks for you.`,
  );

  plan.items.slice(0, 4).forEach((item: PlanFromBriefItem, idx) => {
    const name = displayName(item, isKo);
    const reasons =
      item.reasonLabels.length > 0
        ? item.reasonLabels.slice(0, 3).join(isKo ? " · " : " · ")
        : isKo
          ? "조건 적합"
          : "Good fit";
    lines.push(
      `\n${idx + 1}. ${name} — ${reasons}\n   [/media/${item.id}](/media/${item.id})`,
    );
  });

  if (plan.recommendDeeplink) {
    lines.push(
      isKo
        ? `\n\n빠른 추천 보기: [추천 받기](${plan.recommendDeeplink})`
        : `\n\nQuick picks: [Get recommendations](${plan.recommendDeeplink})`,
    );
  }

  if (plan.plannerDeeplink) {
    lines.push(
      isKo
        ? `\n단계별 설계: [플래너에서 상세 설계](${plan.plannerDeeplink})`
        : `\nStep-by-step: [Open planner](${plan.plannerDeeplink})`,
    );
  }

  return lines.join("") + contactFooter(isKo);
}

function buildSearchReply(
  query: string,
  result: SearchToolResult,
  locale: "ko" | "en",
): string {
  const isKo = locale === "ko";
  const lines: string[] = [
    isKo
      ? `"${query}" 검색 결과 ${result.totalMatches}건 중 ${result.returned}건입니다.`
      : `"${query}": showing ${result.returned} of ${result.totalMatches} matches.`,
  ];

  result.items.slice(0, 4).forEach((item, idx) => {
    lines.push(
      `\n${idx + 1}. ${displayName(item, isKo)} — ${item.location} (${formatPriceMan(item.price, isKo)})\n   [/media/${item.id}](/media/${item.id})`,
    );
  });

  return lines.join("") + contactFooter(isKo);
}

function buildBudgetReply(
  maxPrice: number,
  result: BudgetToolResult,
  locale: "ko" | "en",
): string {
  const isKo = locale === "ko";
  const lines: string[] = [
    isKo
      ? `월 ${maxPrice.toLocaleString("ko-KR")}만원 이하 매체 ${result.totalMatches}건 중 ${result.returned}건입니다.`
      : `Up to ${maxPrice.toLocaleString()}M KRW/mo: ${result.returned} of ${result.totalMatches} options.`,
  ];

  result.items.slice(0, 4).forEach((item, idx) => {
    lines.push(
      `\n${idx + 1}. ${displayName(item, isKo)} — ${formatPriceMan(item.price, isKo)}\n   [/media/${item.id}](/media/${item.id})`,
    );
  });

  return lines.join("") + contactFooter(isKo);
}

function buildClarificationReply(
  hint: string,
  locale: "ko" | "en",
): string {
  const isKo = locale === "ko";
  return (
    hint +
    (isKo
      ? "\n\n조건을 조금만 더 알려주시면 맞춤 매체를 바로 추천해 드릴게요."
      : "\n\nShare a bit more and I can suggest tailored media right away.") +
    contactFooter(isKo)
  );
}

function tryBudgetPath(
  message: string,
  catalog: readonly MediaItem[],
  locale: "ko" | "en",
): RuleChatbotResult | null {
  const parsed = parsePlannerFreetextBrief(message);
  const maxPrice = parsed.fields.budgetMan.value;
  if (maxPrice == null || maxPrice <= 0) return null;
  if (countParsedFieldsForRoute(parsed) > 1) return null;

  const { result, cards } = executeChatbotTool(
    "getMediaByBudget",
    { maxPrice, limit: 6 },
    [...catalog],
    locale,
  );
  const budget = result as BudgetToolResult;
  if (budget.totalMatches <= 0) return null;

  return {
    reply: buildBudgetReply(maxPrice, budget, locale),
    media: cards,
    plannerDeeplink: null,
    recommendDeeplink: null,
    engine: "rule",
    tokensUsed: 0,
    inputTokens: 0,
    outputTokens: 0,
    model: RULE_CHATBOT_MODEL,
  };
}

function countParsedFieldsForRoute(
  result: ReturnType<typeof parsePlannerFreetextBrief>,
): number {
  const { fields } = result;
  let n = 0;
  if (fields.campaignGoal.value != null) n++;
  if (fields.regions.value?.length) n++;
  if (fields.seoulZones.value?.length) n++;
  if (fields.busanZones.value?.length) n++;
  if (fields.gyeonggiZones.value?.length) n++;
  if (fields.ageKeys.value?.length) n++;
  if (fields.industryKey.value != null) n++;
  if (fields.budgetMan.value != null) n++;
  if (fields.months.value != null) n++;
  if (fields.durationDays.value != null) n++;
  if (fields.categories.value?.length) n++;
  return n;
}

function looksLikePlaceSearch(message: string): boolean {
  return /역|빌딩|타워|센터|몰|공항|학교|대학|병원|스크린|빌보드|station|screen|tower|mall/i.test(
    message,
  );
}

/** 0-token rule chatbot — planFromBrief + search/budget fallbacks. */
export function completeRuleChatbot(params: {
  message: string;
  catalog: readonly MediaItem[];
  locale: "ko" | "en";
}): RuleChatbotResult {
  const trimmed = params.message.trim();
  const catalog = [...params.catalog];
  const locale = params.locale;
  const isKo = locale === "ko";

  const plan = executePlanFromBrief(trimmed, catalog, locale, 6);

  if (!("error" in plan)) {
    if (plan.parsedFieldCount > 0) {
      const cards = plan.items.slice(0, 6).map(
        ({ score: _s, reasonKeys: _k, reasonLabels: _l, ...card }) => card,
      );
      return {
        reply: buildPlanReply(plan, locale),
        media: cards,
        recommendDeeplink: plan.recommendDeeplink,
        plannerDeeplink: plan.plannerDeeplink,
        engine: "rule",
        tokensUsed: 0,
        inputTokens: 0,
        outputTokens: 0,
        model: RULE_CHATBOT_MODEL,
      };
    }

    if (plan.clarificationHint) {
      const search = executeChatbotTool(
        "searchMedia",
        { query: trimmed, limit: 6 },
        catalog,
        locale,
      );
      const searchResult = search.result as SearchToolResult;
      if (searchResult.totalMatches > 0) {
        return {
          reply: buildSearchReply(trimmed, searchResult, locale),
          media: search.cards,
          plannerDeeplink: null,
          recommendDeeplink: null,
          engine: "rule",
          tokensUsed: 0,
          inputTokens: 0,
          outputTokens: 0,
          model: RULE_CHATBOT_MODEL,
        };
      }

      const budget = tryBudgetPath(trimmed, catalog, locale);
      if (budget) return budget;

      return {
        reply: buildClarificationReply(plan.clarificationHint, locale),
        media: [],
        plannerDeeplink: null,
        recommendDeeplink: null,
        engine: "rule",
        tokensUsed: 0,
        inputTokens: 0,
        outputTokens: 0,
        model: RULE_CHATBOT_MODEL,
      };
    }
  }

  if (looksLikePlaceSearch(trimmed)) {
    const search = executeChatbotTool(
      "searchMedia",
      { query: trimmed, limit: 6 },
      catalog,
      locale,
    );
    const searchResult = search.result as SearchToolResult;
    if (searchResult.totalMatches > 0) {
      return {
        reply: buildSearchReply(trimmed, searchResult, locale),
        media: search.cards,
        plannerDeeplink: null,
        recommendDeeplink: null,
        engine: "rule",
        tokensUsed: 0,
        inputTokens: 0,
        outputTokens: 0,
        model: RULE_CHATBOT_MODEL,
      };
    }
  }

  const budget = tryBudgetPath(trimmed, catalog, locale);
  if (budget) return budget;

  const fallbackHint =
    plan && !("error" in plan) && plan.clarificationHint
      ? plan.clarificationHint
      : isKo
        ? "지역·목표·예산·매체 유형(택시·버스·디지털 등)을 알려주시면 맞춤 추천을 드릴게요."
        : "Share region, goal, budget, or format (taxi, bus, digital) for tailored picks.";

  return {
    reply: buildClarificationReply(fallbackHint, locale),
    media: [],
    plannerDeeplink: null,
    recommendDeeplink: null,
    engine: "rule",
    tokensUsed: 0,
    inputTokens: 0,
    outputTokens: 0,
    model: RULE_CHATBOT_MODEL,
  };
}

export function isChatbotClaudeEnabled(): boolean {
  return (
    process.env.CHATBOT_USE_CLAUDE === "true" &&
    Boolean(process.env.ANTHROPIC_API_KEY?.trim())
  );
}
