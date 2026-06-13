import { getPrisma, isDatabaseConfigured } from "@/lib/prisma";

/**
 * 방문 전환 퍼널 — 세션 기준.
 * 홈 방문 → 매체 조회 → 플랜(플래너) → 견적 생성 → 문의/계약
 * 데이터: PageView(세션·경로) + ConversionEvent(media_view/quote_request/contract)
 */

export type FunnelStage = {
  key: string;
  label: string;
  count: number;
  /** 직전 단계 대비 전환율(%). 첫 단계는 null. */
  conversionPct: number | null;
  /** 전환율이 가장 낮은 "어려운 지점" */
  isBottleneck: boolean;
  source: string;
};

export type VisitFunnel = {
  periodDays: number;
  generatedAt: string;
  totalSessions: number;
  stages: FunnelStage[];
  bottleneckKey: string | null;
};

function sinceDate(days: number): Date {
  return new Date(Date.now() - days * 24 * 60 * 60 * 1000);
}

export async function getVisitConversionFunnel(
  periodDays = 30,
): Promise<VisitFunnel | null> {
  if (!isDatabaseConfigured()) return null;
  const db = getPrisma();
  const since = sinceDate(periodDays);

  const distinctPageSessions = async (
    where: Record<string, unknown>,
  ): Promise<number> => {
    const rows = await db.pageView.findMany({
      where: { createdAt: { gte: since }, ...where },
      distinct: ["sessionId"],
      select: { sessionId: true },
    });
    return rows.length;
  };
  const distinctConvSessions = async (type: string): Promise<number> => {
    const rows = await db.conversionEvent.findMany({
      where: {
        createdAt: { gte: since },
        type: type as never,
        sessionId: { not: null },
      },
      distinct: ["sessionId"],
      select: { sessionId: true },
    });
    return rows.length;
  };

  const [
    homeSessions,
    allSessions,
    mediaPv,
    mediaConv,
    plannerSessions,
    quoteConv,
    quotePv,
    contractConv,
    contactPv,
  ] = await Promise.all([
    distinctPageSessions({ path: { in: ["/", "/ko", "/en", "/ko/", "/en/"] } }),
    distinctPageSessions({}),
    distinctPageSessions({ path: { contains: "/media/" } }),
    distinctConvSessions("media_view"),
    distinctPageSessions({ path: { contains: "/planner" } }),
    distinctConvSessions("quote_request"),
    distinctPageSessions({ path: { contains: "/quote" } }),
    distinctConvSessions("contract"),
    distinctPageSessions({ path: { contains: "/contact" } }),
  ]);

  // 단계별: 페이지뷰 신호와 전환 이벤트 신호 중 더 강한 값 사용
  const home = homeSessions > 0 ? homeSessions : allSessions;
  const media = Math.max(mediaPv, mediaConv);
  const planner = plannerSessions;
  const quote = Math.max(quoteConv, quotePv);
  const contact = Math.max(contractConv, contactPv);

  const raw: Omit<FunnelStage, "conversionPct" | "isBottleneck">[] = [
    { key: "home", label: "홈 방문", count: home, source: "PageView" },
    { key: "media", label: "매체 조회", count: media, source: "PageView · media_view" },
    { key: "planner", label: "플랜 담기", count: planner, source: "PageView · /planner" },
    { key: "quote", label: "견적 생성", count: quote, source: "quote_request · /quote" },
    { key: "contact", label: "문의/계약", count: contact, source: "contract · /contact" },
  ];

  // 전환율 + 병목 계산
  let bottleneckKey: string | null = null;
  let minPct = Infinity;
  const stages: FunnelStage[] = raw.map((s, i) => {
    let conversionPct: number | null = null;
    if (i > 0) {
      const prev = raw[i - 1].count;
      conversionPct = prev > 0 ? Math.round((s.count / prev) * 1000) / 10 : 0;
      if (prev > 0 && conversionPct < minPct) {
        minPct = conversionPct;
        bottleneckKey = s.key;
      }
    }
    return { ...s, conversionPct, isBottleneck: false };
  });
  for (const s of stages) {
    if (s.key === bottleneckKey) s.isBottleneck = true;
  }

  return {
    periodDays,
    generatedAt: new Date().toISOString(),
    totalSessions: allSessions,
    stages,
    bottleneckKey,
  };
}
