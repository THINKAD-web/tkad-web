import { mediaData, type MediaItem } from "@/lib/media-data";

export type CampaignGoal = "awareness" | "consideration" | "launch";

export type TargetAudience = "genz" | "millennial" | "family" | "biz" | "mass";

export type Industry =
  | "retail"
  | "fintech"
  | "fmcg"
  | "auto"
  | "entertainment"
  | "beauty"
  | "other";

export type AiRecommendInput = {
  goal: CampaignGoal;
  target: TargetAudience;
  /** 월 예산 상한 (만원) */
  budgetMaxMan: number;
  region: string;
  industry: Industry;
};

export type MatchReason = { ko: string; en: string };

export type ScoredMedia = {
  item: MediaItem;
  score: number;
  reasons: MatchReason[];
};

function industryBoost(
  industry: Industry,
  m: MediaItem,
): { add: number; reason?: MatchReason } {
  const f = `${m.features ?? ""} ${m.targetAge ?? ""}`.toLowerCase();
  const fe = `${m.featuresEn ?? ""}`.toLowerCase();

  if (industry === "entertainment" && (f.includes("k-pop") || f.includes("팬"))) {
    return {
      add: 12,
      reason: {
        ko: "엔터·팬 타깃과 궁합이 좋은 랜드마크 매체",
        en: "Strong fit for entertainment & fan audiences",
      },
    };
  }
  if (industry === "fintech") {
    if (m.type === "digital" && (f.includes("직장") || fe.includes("business"))) {
      return {
        add: 10,
        reason: {
          ko: "비즈니스·금융 타깃 유동인구와 연계",
          en: "Aligns with business district traffic",
        },
      };
    }
  }
  if (industry === "auto" && (f.includes("고속") || fe.includes("highway"))) {
    return {
      add: 10,
      reason: { ko: "자동차 브랜드에 적합한 노출 환경", en: "Suited for auto brand visibility" },
    };
  }
  if (industry === "fmcg" || industry === "retail") {
    if (m.dailyFootTraffic >= 200000) {
      return {
        add: 8,
        reason: {
          ko: "대중 소비재에 유리한 고유동 노출",
          en: "High footfall for mass-market goods",
        },
      };
    }
  }
  if (industry === "beauty" && (f.includes("프리미엄") || f.includes("청담"))) {
    return {
      add: 8,
      reason: {
        ko: "뷰티·프리미엄 이미지에 맞는 상권",
        en: "Premium district fit for beauty brands",
      },
    };
  }
  return { add: 0 };
}

function audienceBoost(
  target: TargetAudience,
  m: MediaItem,
): { add: number; reason?: MatchReason } {
  if (target === "genz" || target === "millennial") {
    if (m.type === "digital" || m.type === "subway") {
      return {
        add: 10,
        reason: {
          ko: "MZ층 도달에 유리한 디지털/교통 매체",
          en: "Digital & transit effective for younger audiences",
        },
      };
    }
  }
  if (target === "family") {
    if (m.type === "subway" || m.region === "national") {
      return {
        add: 8,
        reason: {
          ko: "가족 단위 이동 동선과 겹치는 매체",
          en: "Covers family mobility patterns",
        },
      };
    }
  }
  if (target === "biz") {
    if (m.type === "digital" && m.region === "seoul") {
      return {
        add: 10,
        reason: {
          ko: "서울 상권 B2B·직장인 노출",
          en: "Seoul business district reach",
        },
      };
    }
  }
  if (target === "mass") {
    if (m.dailyFootTraffic >= 250000) {
      return {
        add: 8,
        reason: { ko: "대중 도달 규모가 큼", en: "Broad reach volume" },
      };
    }
  }
  return { add: 0 };
}

function goalBoost(
  goal: CampaignGoal,
  m: MediaItem,
): { add: number; reason?: MatchReason } {
  if (goal === "awareness") {
    let add = Math.min(18, Math.round(m.dailyFootTraffic / 45000));
    const reason: MatchReason = {
      ko: "브랜드 인지도 확대에 유리한 노출 규모",
      en: "Scale suited for awareness goals",
    };
    if (m.type === "digital" || m.type === "billboard") add += 6;
    return { add, reason };
  }
  if (goal === "consideration") {
    if (m.type === "subway" || m.type === "digital") {
      return {
        add: 14,
        reason: {
          ko: "반복 노출로 관심·고려 단계 강화",
          en: "Frequency-friendly for consideration stage",
        },
      };
    }
    return { add: 6 };
  }
  if (goal === "launch") {
    if (m.type === "digital" || m.dailyFootTraffic >= 300000) {
      return {
        add: 16,
        reason: {
          ko: "런칭 집중도를 높이는 임팩트 포맷",
          en: "High-impact format for launch bursts",
        },
      };
    }
    return { add: 8 };
  }
  return { add: 0 };
}

function scoreOne(m: MediaItem, input: AiRecommendInput): ScoredMedia {
  let score = 42;
  const reasons: MatchReason[] = [];

  if (input.region !== "all") {
    if (m.region === input.region) {
      score += 18;
      reasons.push({
        ko: "선택한 지역과 일치",
        en: "Matches your selected region",
      });
    } else {
      score -= 22;
    }
  } else {
    score += 4;
    reasons.push({
      ko: "전국 단위 노출 옵션",
      en: "Nationwide placement option",
    });
  }

  if (input.budgetMaxMan > 0) {
    if (m.price <= input.budgetMaxMan) {
      score += 20;
      reasons.push({
        ko: "월 예산 상한 내 단가",
        en: "Within your monthly budget cap",
      });
    } else {
      score -= 18;
      reasons.push({
        ko: "예산 대비 단가 확인 필요",
        en: "May exceed budget — review with planner",
      });
    }
  }

  const g = goalBoost(input.goal, m);
  score += g.add;
  if (g.reason) reasons.push(g.reason);

  const a = audienceBoost(input.target, m);
  score += a.add;
  if (a.reason) reasons.push(a.reason);

  const i = industryBoost(input.industry, m);
  score += i.add;
  if (i.reason) reasons.push(i.reason);

  score += Math.min(10, Math.round(m.dailyFootTraffic / 120000));

  const uniq: MatchReason[] = [];
  const seen = new Set<string>();
  for (const r of reasons) {
    const k = r.ko;
    if (!seen.has(k)) {
      seen.add(k);
      uniq.push(r);
    }
  }

  return {
    item: m,
    score: Math.max(0, Math.min(100, Math.round(score))),
    reasons: uniq.slice(0, 4),
  };
}

export function recommendMedia(
  input: AiRecommendInput,
  catalog: MediaItem[] = mediaData,
): ScoredMedia[] {
  return catalog
    .map((m) => scoreOne(m, input))
    .filter((s) => s.score >= 38)
    .sort((a, b) => b.score - a.score)
    .slice(0, 15);
}

/** 한반도 근사 바운딩 박스 내 정규화 좌표 (%) */
export function mediaToMapPosition(m: MediaItem): { x: number; y: number } {
  const minLat = 33.1;
  const maxLat = 38.65;
  const minLng = 125.0;
  const maxLng = 132.0;
  const x = ((m.lng - minLng) / (maxLng - minLng)) * 100;
  const y = ((maxLat - m.lat) / (maxLat - minLat)) * 100;
  return {
    x: Math.max(4, Math.min(96, x)),
    y: Math.max(4, Math.min(96, y)),
  };
}
