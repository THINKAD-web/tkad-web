import { getPrisma, isDatabaseConfigured } from "@/lib/prisma";
import type { InternalInsight } from "@/lib/insights/types";

/**
 * 자체 매체 DB 에서 차별화 인사이트를 추출.
 * 외부 검색·LLM 내부 지식과 합쳐져 generator 입력으로 들어감.
 *
 * 의도적으로 **public 행동 로그 (검색·비교 카운터) 는 사용하지 않음** —
 * 그런 테이블은 현재 없음. 카탈로그 메타로만 가능한 통계만 추출.
 *
 * 모든 쿼리는 try/catch 로 감쌌고 한 항목 실패가 다른 항목 차단하지 않음.
 */

interface RegionCount {
  region: string;
  count: number;
}

interface TypeCount {
  type: string;
  count: number;
}

interface NewMediaSummary {
  count: number;
  sample: string[]; // 최대 5개 매체명
}

interface AdvertiserSummary {
  count: number;
  topAdvertisers: string[]; // 최대 5개
}

interface FeaturedMediaSummary {
  highVisibility: { name: string; region: string; score: number }[];
  highTraffic: { name: string; region: string; daily: number }[];
}

async function getRegionDistribution(): Promise<InternalInsight | null> {
  try {
    const db = getPrisma();
    const rows = await db.media.groupBy({
      by: ["region"],
      where: { isActive: true },
      _count: { _all: true },
    });
    const stats: RegionCount[] = rows
      .map((r) => ({ region: r.region, count: r._count._all }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);
    if (stats.length === 0) return null;
    const summary = stats
      .map((s) => `${s.region} ${s.count}건`)
      .join(", ");
    return {
      title: "지역별 매체 분포 TOP 5",
      summary: `THINKAD 검증 매체 지역 분포: ${summary}.`,
      raw: { regions: stats },
    };
  } catch (e) {
    console.warn(
      "[internal-insights] region distribution failed:",
      e instanceof Error ? e.message : e,
    );
    return null;
  }
}

async function getTypeDistribution(): Promise<InternalInsight | null> {
  try {
    const db = getPrisma();
    const rows = await db.media.groupBy({
      by: ["type"],
      where: { isActive: true },
      _count: { _all: true },
    });
    const stats: TypeCount[] = rows
      .map((r) => ({ type: r.type, count: r._count._all }))
      .sort((a, b) => b.count - a.count);
    if (stats.length === 0) return null;
    const summary = stats.map((s) => `${s.type} ${s.count}건`).join(", ");
    return {
      title: "매체 유형 비중",
      summary: `검증 매체 유형 비율 — ${summary}. 디지털·정적·모빌 OOH 의 시장 분포 단서.`,
      raw: { types: stats },
    };
  } catch (e) {
    console.warn(
      "[internal-insights] type distribution failed:",
      e instanceof Error ? e.message : e,
    );
    return null;
  }
}

async function getNewlyAdded(days = 30): Promise<InternalInsight | null> {
  try {
    const db = getPrisma();
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
    const rows = await db.media.findMany({
      where: { isActive: true, createdAt: { gte: since } },
      select: { name: true, region: true, type: true },
      orderBy: { createdAt: "desc" },
      take: 30,
    });
    if (rows.length === 0) return null;
    const sample = rows.slice(0, 5).map((r) => r.name);
    const summary = `최근 ${days}일간 신규 등록 매체 ${rows.length}건 (예: ${sample.join(", ")}).`;
    const data: NewMediaSummary = { count: rows.length, sample };
    return {
      title: `신규 등록 매체 ${days}일`,
      summary,
      raw: { newlyAdded: data },
    };
  } catch (e) {
    console.warn(
      "[internal-insights] newly added failed:",
      e instanceof Error ? e.message : e,
    );
    return null;
  }
}

async function getRecentAdvertisers(): Promise<InternalInsight | null> {
  try {
    const db = getPrisma();
    const rows = await db.mediaAdvertiserExecution.findMany({
      orderBy: { createdAt: "desc" },
      take: 60,
      select: { advertiserName: true },
    });
    if (rows.length === 0) return null;
    const counts = new Map<string, number>();
    for (const r of rows) {
      const n = r.advertiserName.trim();
      if (!n) continue;
      counts.set(n, (counts.get(n) ?? 0) + 1);
    }
    const top = [...counts.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([name]) => name);
    if (top.length === 0) return null;
    const data: AdvertiserSummary = { count: rows.length, topAdvertisers: top };
    return {
      title: "최근 광고주 집행",
      summary: `최근 등록된 ${rows.length}건의 매체 집행 이력 — 다회 등장 광고주: ${top.join(", ")}.`,
      raw: { advertisers: data },
    };
  } catch (e) {
    console.warn(
      "[internal-insights] recent advertisers failed:",
      e instanceof Error ? e.message : e,
    );
    return null;
  }
}

async function getFeaturedMedia(): Promise<InternalInsight | null> {
  try {
    const db = getPrisma();
    const [byVisibility, byTraffic] = await Promise.all([
      db.media.findMany({
        where: { isActive: true, visibilityScore: { gt: 0 } },
        select: { name: true, region: true, visibilityScore: true },
        orderBy: { visibilityScore: "desc" },
        take: 5,
      }),
      db.media.findMany({
        where: { isActive: true, dailyFootfall: { not: null, gt: 0 } },
        select: { name: true, region: true, dailyFootfall: true },
        orderBy: { dailyFootfall: "desc" },
        take: 5,
      }),
    ]);
    if (byVisibility.length === 0 && byTraffic.length === 0) return null;
    const data: FeaturedMediaSummary = {
      highVisibility: byVisibility.map((m) => ({
        name: m.name,
        region: m.region,
        score: m.visibilityScore,
      })),
      highTraffic: byTraffic.map((m) => ({
        name: m.name,
        region: m.region,
        daily: m.dailyFootfall ?? 0,
      })),
    };
    const lines: string[] = [];
    if (data.highVisibility.length > 0) {
      lines.push(
        `시인성 TOP — ${data.highVisibility
          .map((m) => `${m.name}(${m.region})`)
          .join(", ")}`,
      );
    }
    if (data.highTraffic.length > 0) {
      lines.push(
        `유동인구 TOP — ${data.highTraffic
          .map((m) => `${m.name}(${m.daily.toLocaleString()}/일)`)
          .join(", ")}`,
      );
    }
    return {
      title: "주목 매체 (시인성·유동)",
      summary: lines.join(" / "),
      raw: { featured: data },
    };
  } catch (e) {
    console.warn(
      "[internal-insights] featured failed:",
      e instanceof Error ? e.message : e,
    );
    return null;
  }
}

/**
 * 모든 인사이트 모듈을 병렬 실행하고 성공한 것만 반환.
 * cron / admin 호출에서 사용.
 */
export async function fetchInternalMediaInsights(): Promise<InternalInsight[]> {
  if (!isDatabaseConfigured()) return [];
  const all = await Promise.all([
    getRegionDistribution(),
    getTypeDistribution(),
    getNewlyAdded(30),
    getRecentAdvertisers(),
    getFeaturedMedia(),
  ]);
  return all.filter((x): x is InternalInsight => x !== null);
}
