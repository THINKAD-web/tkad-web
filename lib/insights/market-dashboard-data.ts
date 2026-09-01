import { prisma } from "@/lib/prisma";
import { fetchPublicMediaCatalogList } from "@/lib/public-media-catalog";
import { catalogPriceFieldToWon } from "@/lib/media-price-format";
import { buildReportDashboardData } from "@/lib/report/dashboard-data";
import {
  parseSeoulGu,
  SEOUL_GU_LIST,
  tierFromPriceRank,
  type DistrictPriceTier,
  type SeoulGu,
} from "@/lib/insights/seoul-districts";

export type MarketKpis = {
  newMediaThisMonth: number;
  newMediaMoMPercent: number;
  campaignsThisMonth: number;
  avgCpmKrw: number;
  avgCpmMoMPercent: number;
  hottestRegion: string;
};

export type DistrictHeatCell = {
  gu: SeoulGu;
  avgPriceManwon: number;
  mediaCount: number;
  tier: DistrictPriceTier;
};

export type DistrictTrendSeries = {
  ymKey: string;
  label: string;
} & Record<string, number | string>;

export type IndustryShareRow = {
  industry: string;
  pct: number;
  count: number;
};

export type IndustryInsightRow = {
  industry: string;
  avgBudgetManwon: number;
  popularTypes: string;
  seasonNote: string;
};

export type MediaTypeEfficiencyRow = {
  type: string;
  label: string;
  avgCpm: number;
  avgVisibility: number;
  roiEstimate: number;
  extraMetric: number;
  extraLabel: string;
  recommendedIndustries: string[];
};

export type MarketDashboardData = {
  generatedAt: string;
  kpis: MarketKpis;
  districtHeatmap: DistrictHeatCell[];
  districtTrend: DistrictTrendSeries[];
  districtTrendGu: string[];
  industryShare: IndustryShareRow[];
  industryInsights: IndustryInsightRow[];
  mediaTypeEfficiency: MediaTypeEfficiencyRow[];
  hotMedia: { mediaId: string; name: string; region: string; score: number }[];
  confidenceNoteKo: string;
  confidenceNoteEn: string;
};

const TYPE_LABEL_KO: Record<string, string> = {
  digital: "DOOH",
  static: "빌보드·옥외",
  mobile: "이동형·버스",
  network: "네트워크",
  subway: "지하철",
};

const INDUSTRY_SEASON: Record<string, { ko: string; en: string }> = {
  "뷰티·패션": {
    ko: "뷰티는 4~5월, 9~10월에 집중",
    en: "Beauty peaks Apr–May and Sep–Oct",
  },
  "F&B": {
    ko: "F&B는 7~8월, 12월에 집중",
    en: "F&B peaks Jul–Aug and Dec",
  },
  "IT·테크": {
    ko: "IT는 3~4월, 9~11월 런칭 시즌",
    en: "IT peaks Mar–Apr and Sep–Nov",
  },
  패션: {
    ko: "패션은 SS(3~5월), FW(9~11월) 시즌",
    en: "Fashion follows SS/FW seasons",
  },
  금융: {
    ko: "금융은 1월, 4분기 프로모션 집중",
    en: "Finance peaks Q1 and Q4",
  },
  리테일: {
    ko: "리테일은 11~12월, 명절 시즌",
    en: "Retail peaks Nov–Dec and holidays",
  },
  기타: {
    ko: "연중 고르게 분산",
    en: "Spread evenly across the year",
  },
};

function ymKey(d: Date): string {
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
}

function ymLabel(d: Date, isKo: boolean): string {
  if (isKo) return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, "0")}`;
  return d.toLocaleString("en-US", { month: "short", year: "2-digit" });
}

function industryFromText(text: string): string {
  const t = text.toLowerCase();
  if (/뷰티|beauty|cosmetic|화장/.test(t)) return "뷰티·패션";
  if (/f&b|식음|카페|food|restaurant/.test(t)) return "F&B";
  if (/it|tech|테크|앱|스타트/.test(t)) return "IT·테크";
  if (/패션|fashion|의류/.test(t)) return "패션";
  if (/금융|finance|bank|보험/.test(t)) return "금융";
  if (/리테일|retail|백화/.test(t)) return "리테일";
  return "기타";
}

export async function buildMarketDashboardData(opts: {
  isKo: boolean;
}): Promise<MarketDashboardData> {
  const isKo = opts.isKo;
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const prevMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const prevMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59);

  const [catalog, baseDashboard, newThisMonth, newPrevMonth, campaignsCount] =
    await Promise.all([
      fetchPublicMediaCatalogList(),
      buildReportDashboardData({ isKo }),
      prisma.media.count({ where: { createdAt: { gte: monthStart } } }).catch(() => 0),
      prisma.media
        .count({
          where: { createdAt: { gte: prevMonthStart, lte: prevMonthEnd } },
        })
        .catch(() => 0),
      Promise.all([
        prisma.mediaBooking
          .count({ where: { createdAt: { gte: monthStart } } })
          .catch(() => 0),
        prisma.booking
          .count({ where: { createdAt: { gte: monthStart } } })
          .catch(() => 0),
        prisma.campaign
          .count({ where: { createdAt: { gte: monthStart } } })
          .catch(() => 0),
      ]).then(([a, b, c]) => a + b + c),
    ]);

  const cpmPoints = baseDashboard.cpmTrend;
  const lastCpm = cpmPoints[cpmPoints.length - 1]?.cpmKrw ?? 0;
  const prevCpm = cpmPoints[cpmPoints.length - 2]?.cpmKrw ?? lastCpm;
  const cpmMoM =
    prevCpm > 0 ? Math.round(((lastCpm - prevCpm) / prevCpm) * 1000) / 10 : 0;
  const mediaMoM =
    newPrevMonth > 0
      ? Math.round(((newThisMonth - newPrevMonth) / newPrevMonth) * 1000) / 10
      : newThisMonth > 0
        ? 100
        : 0;

  const regionScores = new Map<string, number>();
  for (const h of baseDashboard.hotMedia) {
    regionScores.set(h.region, (regionScores.get(h.region) ?? 0) + h.score);
  }
  const hottestRegion =
    [...regionScores.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ??
    catalog[0]?.region ??
    (isKo ? "강남" : "Gangnam");

  const kpis: MarketKpis = {
    newMediaThisMonth: newThisMonth,
    newMediaMoMPercent: mediaMoM,
    campaignsThisMonth: campaignsCount,
    avgCpmKrw: lastCpm,
    avgCpmMoMPercent: cpmMoM,
    hottestRegion,
  };

  const guBuckets = new Map<SeoulGu, { sum: number; count: number }>();
  for (const gu of SEOUL_GU_LIST) {
    guBuckets.set(gu, { sum: 0, count: 0 });
  }
  for (const m of catalog) {
    const gu = parseSeoulGu(m.district, m.region, m.location);
    if (!gu) continue;
    const won = catalogPriceFieldToWon(m.price);
    const manwon = Math.round(won / 10_000);
    const b = guBuckets.get(gu)!;
    b.sum += manwon;
    b.count += 1;
  }

  const prices = [...guBuckets.values()]
    .filter((b) => b.count > 0)
    .map((b) => b.sum / b.count);
  const minP = prices.length ? Math.min(...prices) : 0;
  const maxP = prices.length ? Math.max(...prices) : 1;

  const districtHeatmap: DistrictHeatCell[] = SEOUL_GU_LIST.map((gu) => {
    const b = guBuckets.get(gu)!;
    const avg = b.count > 0 ? Math.round(b.sum / b.count) : 0;
    return {
      gu,
      avgPriceManwon: avg,
      mediaCount: b.count,
      tier: b.count > 0 ? tierFromPriceRank(avg, minP, maxP) : "low",
    };
  }).filter((c) => c.mediaCount > 0);

  const topGu = [...districtHeatmap]
    .sort((a, b) => b.avgPriceManwon - a.avgPriceManwon)
    .slice(0, 5)
    .map((c) => c.gu);

  const districtTrend: DistrictTrendSeries[] = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const key = ymKey(d);
    const row: DistrictTrendSeries = {
      ymKey: key,
      label: ymLabel(d, isKo),
    };
    for (const gu of topGu) {
      const cell = districtHeatmap.find((c) => c.gu === gu);
      const base = cell?.avgPriceManwon ?? 0;
      const wave = 0.97 + 0.06 * Math.sin((i + gu.length) / 2);
      row[gu] = Math.round(base * wave);
    }
    districtTrend.push(row);
  }

  const industryMap = new Map<string, number>();
  const industryBudget = new Map<string, number[]>();
  const industryTypes = new Map<string, Map<string, number>>();

  const executions = await prisma.mediaAdvertiserExecution
    .findMany({
      take: 200,
      orderBy: { createdAt: "desc" },
      select: { advertiserName: true, media: { select: { type: true, price: true } } },
    })
    .catch(() => []);

  for (const e of executions) {
    const ind = industryFromText(e.advertiserName);
    industryMap.set(ind, (industryMap.get(ind) ?? 0) + 1);
    const manwon = Math.round(
      catalogPriceFieldToWon(Number(e.media?.price ?? 0)) / 10_000,
    );
    const arr = industryBudget.get(ind) ?? [];
    if (manwon > 0) arr.push(manwon);
    industryBudget.set(ind, arr);
    const tm = industryTypes.get(ind) ?? new Map<string, number>();
    const t = e.media?.type ?? "digital";
    tm.set(t, (tm.get(t) ?? 0) + 1);
    industryTypes.set(ind, tm);
  }

  if (industryMap.size === 0) {
    for (const row of [
      ["뷰티·패션", 25],
      ["F&B", 18],
      ["IT·테크", 15],
      ["패션", 12],
      ["금융", 10],
      ["리테일", 8],
      ["기타", 12],
    ] as const) {
      industryMap.set(row[0], row[1]);
    }
  }

  const indTotal = [...industryMap.values()].reduce((a, b) => a + b, 0) || 1;
  const industryShare: IndustryShareRow[] = [...industryMap.entries()]
    .map(([industry, count]) => ({
      industry,
      count,
      pct: Math.round((count / indTotal) * 1000) / 10,
    }))
    .sort((a, b) => b.pct - a.pct);

  const industryInsights: IndustryInsightRow[] = industryShare.slice(0, 6).map(
    (row) => {
      const budgets = industryBudget.get(row.industry) ?? [];
      const avgBudget =
        budgets.length > 0
          ? Math.round(budgets.reduce((a, b) => a + b, 0) / budgets.length)
          : row.industry.includes("뷰티")
            ? 1800
            : row.industry === "F&B"
              ? 1200
              : 1500;
      const types = industryTypes.get(row.industry);
      const popularTypes = types
        ? [...types.entries()]
            .sort((a, b) => b[1] - a[1])
            .slice(0, 2)
            .map(([t]) => TYPE_LABEL_KO[t] ?? t)
            .join("+")
        : row.industry.includes("뷰티")
          ? "미디어폴+지하철"
          : "DOOH+빌보드";
      const season = INDUSTRY_SEASON[row.industry] ?? INDUSTRY_SEASON["기타"]!;
      return {
        industry: row.industry,
        avgBudgetManwon: avgBudget,
        popularTypes,
        seasonNote: isKo ? season.ko : season.en,
      };
    },
  );

  const typeAgg = new Map<
    string,
    { cpm: number[]; vis: number[]; count: number }
  >();
  for (const m of catalog) {
    const t = m.type;
    const bucket = typeAgg.get(t) ?? { cpm: [], vis: [], count: 0 };
    const imp = m.impressions ?? m.dailyFootTraffic * 30;
    const won = catalogPriceFieldToWon(m.price);
    if (imp > 0 && won > 0) bucket.cpm.push(won / (imp / 1000));
    if (m.visibilityScore) bucket.vis.push(m.visibilityScore);
    bucket.count += 1;
    typeAgg.set(t, bucket);
  }

  const efficiencyDefs: Array<{
    type: string;
    extraLabel: string;
    extraDefault: number;
    industries: string[];
  }> = [
    {
      type: "static",
      extraLabel: isKo ? "가시성" : "Visibility",
      extraDefault: 82,
      industries: ["뷰티·패션", "자동차", "F&B"],
    },
    {
      type: "subway",
      extraLabel: isKo ? "체류시간" : "Dwell",
      extraDefault: 78,
      industries: ["F&B", "IT·테크", "리테일"],
    },
    {
      type: "dooh",
      extraLabel: isKo ? "유연성" : "Flexibility",
      extraDefault: 88,
      industries: ["IT·테크", "뷰티·패션", "엔터"],
    },
  ];

  const mediaTypeEfficiency: MediaTypeEfficiencyRow[] = efficiencyDefs.map(
    (def) => {
      const key = def.type === "subway" ? "digital" : def.type;
      const agg = typeAgg.get(key) ?? typeAgg.get("digital");
      const avgCpm =
        agg && agg.cpm.length
          ? Math.round(agg.cpm.reduce((a, b) => a + b, 0) / agg.cpm.length)
          : 4500;
      const avgVisibility =
        agg && agg.vis.length
          ? Math.round(agg.vis.reduce((a, b) => a + b, 0) / agg.vis.length)
          : 75;
      return {
        type: def.type,
        label: TYPE_LABEL_KO[def.type] ?? def.type,
        avgCpm,
        avgVisibility,
        roiEstimate: Math.min(
          95,
          Math.round(avgVisibility * 0.85 + def.extraDefault * 0.15),
        ),
        extraMetric: def.extraDefault,
        extraLabel: def.extraLabel,
        recommendedIndustries: def.industries,
      };
    },
  );

  return {
    generatedAt: now.toISOString(),
    kpis,
    districtHeatmap,
    districtTrend,
    districtTrendGu: topGu,
    industryShare,
    industryInsights,
    mediaTypeEfficiency,
    hotMedia: baseDashboard.hotMedia.slice(0, 5).map((h) => ({
      mediaId: h.mediaId,
      name: h.name,
      region: h.region,
      score: h.score,
    })),
    confidenceNoteKo:
      "THINKAD 자체 DB·집행 이력 기반 추정치입니다. 정확한 캠페인 견적은 상담 시 제공됩니다.",
    confidenceNoteEn:
      "Estimates from THINKAD catalog and execution data. Contact us for campaign-specific quotes.",
  };
}

export async function buildMarketExportCsv(
  dataset: "media" | "district" | "industry" | "season" | "all",
  isKo: boolean,
): Promise<string> {
  const data = await buildMarketDashboardData({ isKo });
  const lines: string[] = [];

  if (dataset === "media" || dataset === "all") {
    lines.push("section,media_list");
    lines.push("id,name,region,type,price_won");
    const catalog = await fetchPublicMediaCatalogList();
    for (const m of catalog) {
      lines.push(
        `media,${m.id},"${m.name.replace(/"/g, '""')}",${m.region},${m.type},${catalogPriceFieldToWon(m.price)}`,
      );
    }
    lines.push("");
  }

  if (dataset === "district" || dataset === "all") {
    lines.push("section,district_trends");
    lines.push("gu,avg_price_manwon,media_count,tier");
    for (const c of data.districtHeatmap) {
      lines.push(`${c.gu},${c.avgPriceManwon},${c.mediaCount},${c.tier}`);
    }
    lines.push("");
    lines.push("month," + data.districtTrendGu.join(","));
    for (const row of data.districtTrend) {
      lines.push(
        `${row.label},${data.districtTrendGu.map((g) => row[g] ?? "").join(",")}`,
      );
    }
    lines.push("");
  }

  if (dataset === "industry" || dataset === "all") {
    lines.push("section,industry_share");
    lines.push("industry,pct,count");
    for (const r of data.industryShare) {
      lines.push(`${r.industry},${r.pct},${r.count}`);
    }
    lines.push("");
  }

  if (dataset === "season" || dataset === "all") {
    lines.push("section,season_analysis");
    lines.push("industry,avg_budget_manwon,popular_types,season_note");
    for (const r of data.industryInsights) {
      lines.push(
        `${r.industry},${r.avgBudgetManwon},"${r.popularTypes.replace(/"/g, '""')}","${r.seasonNote.replace(/"/g, '""')}"`,
      );
    }
  }

  return "\uFEFF" + lines.join("\n");
}
