import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { catalogPriceFieldToWon } from "@/lib/media-price-format";

/**
 * `/report/dashboard` 위젯들이 사용하는 집계 데이터.
 * - 데모 단계라 단순 집계 위주. 캐시는 페이지 단(force-dynamic + cache: no-store) 에서 처리.
 * - 모든 함수는 DB 가 비어 있어도 빈 결과로 graceful 하게 동작.
 */

export type ReportDashboardData = {
  generatedAt: string;
  /** 이번 달 문의/예약이 많이 들린 매체 Top 10 */
  hotMedia: HotMediaRow[];
  /** 매체 유형(카테고리)별 비중 — 이번 달 booking 활동 기준 */
  industrySplit: IndustrySplitRow[];
  /** 최근 30일 등록된 신규 매체 */
  newMedia: NewMediaRow[];
  /** 월별 평균 CPM 추정치 (지난 6개월) */
  cpmTrend: CpmTrendPoint[];
};

export type HotMediaRow = {
  mediaId: string;
  name: string;
  region: string;
  type: string;
  bookingCount: number;
  inquiryCount: number;
  favoriteCount: number;
  /** 합산 점수 — 정렬 기준 */
  score: number;
};

export type IndustrySplitRow = {
  /** 매체 type — DB MediaType 그대로 ("dooh" | "static" | "mobile" | "network" 등) */
  key: string;
  label: string;
  count: number;
  pct: number;
};

export type NewMediaRow = {
  id: string;
  name: string;
  region: string;
  type: string;
  createdAt: string;
};

export type CpmTrendPoint = {
  /** YYYY-MM */
  ymKey: string;
  label: string;
  /** 월별 평균 CPM (원/1,000회) */
  cpmKrw: number;
  /** 데이터 포인트 신뢰도 — 표본 수 */
  bookingCount: number;
};

const TYPE_LABEL_KO: Record<string, string> = {
  digital: "디지털 사이니지",
  static: "정적/포스터",
  mobile: "이동형",
  network: "네트워크",
};

const TYPE_LABEL_EN: Record<string, string> = {
  digital: "Digital Signage",
  static: "Static / Poster",
  mobile: "Mobile / Vehicle",
  network: "Network",
};

function ymKey(d: Date): string {
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
}

function ymLabel(d: Date, isKo: boolean): string {
  if (isKo) return `${d.getUTCFullYear()}.${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
  return `${d.toLocaleString("en-US", { month: "short" })} ${d.getUTCFullYear()}`;
}

export async function buildReportDashboardData(opts: {
  isKo: boolean;
}): Promise<ReportDashboardData> {
  const isKo = opts.isKo;
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const last30Start = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 5, 1);

  // 1) Hot media — Booking + MediaBooking + UserFavoriteMedia 집계 (이번 달)
  const [bookingsByMedia, mediaBookingsByMedia, favoritesByMedia] =
    await Promise.all([
      prisma.booking
        .groupBy({
          by: ["mediaId"],
          where: { createdAt: { gte: monthStart } },
          _count: { _all: true },
        })
        .catch(() => [] as Array<{ mediaId: string; _count: { _all: number } }>),
      prisma.mediaBooking
        .groupBy({
          by: ["mediaId"],
          where: { createdAt: { gte: monthStart } },
          _count: { _all: true },
        })
        .catch(() => [] as Array<{ mediaId: string; _count: { _all: number } }>),
      prisma.userFavoriteMedia
        .groupBy({
          by: ["mediaId"],
          where: { createdAt: { gte: monthStart } },
          _count: { _all: true },
        })
        .catch(() => [] as Array<{ mediaId: string; _count: { _all: number } }>),
    ]);

  const scoreMap = new Map<
    string,
    { booking: number; inquiry: number; favorite: number }
  >();
  for (const r of bookingsByMedia) {
    const e = scoreMap.get(r.mediaId) ?? { booking: 0, inquiry: 0, favorite: 0 };
    e.booking += r._count._all;
    scoreMap.set(r.mediaId, e);
  }
  for (const r of mediaBookingsByMedia) {
    const e = scoreMap.get(r.mediaId) ?? { booking: 0, inquiry: 0, favorite: 0 };
    e.inquiry += r._count._all;
    scoreMap.set(r.mediaId, e);
  }
  for (const r of favoritesByMedia) {
    const e = scoreMap.get(r.mediaId) ?? { booking: 0, inquiry: 0, favorite: 0 };
    e.favorite += r._count._all;
    scoreMap.set(r.mediaId, e);
  }

  let hotMedia: HotMediaRow[] = [];
  if (scoreMap.size > 0) {
    const ids = [...scoreMap.keys()];
    const medias = await prisma.media
      .findMany({
        where: { id: { in: ids } },
        select: {
          id: true,
          name: true,
          nameEn: true,
          region: true,
          type: true,
        },
      })
      .catch(() => []);
    const byId = new Map(medias.map((m) => [m.id, m]));
    hotMedia = ids
      .map((id) => {
        const c = scoreMap.get(id)!;
        const m = byId.get(id);
        if (!m) return null;
        // 단순 가중치 — 실 예약 > 매체 부킹 > 찜
        const score =
          c.booking * 5 + c.inquiry * 3 + c.favorite * 1;
        return {
          mediaId: id,
          name: isKo ? m.name : m.nameEn || m.name,
          region: m.region,
          type: m.type,
          bookingCount: c.booking,
          inquiryCount: c.inquiry,
          favoriteCount: c.favorite,
          score,
        } satisfies HotMediaRow;
      })
      .filter((r): r is HotMediaRow => r != null)
      .sort((a, b) => b.score - a.score)
      .slice(0, 10);
  }

  // 2) Industry split — 이번 달 booking 활동의 매체 type 분포 (없으면 전체 매체 분포로 폴백)
  let industrySplit: IndustrySplitRow[] = [];
  {
    let typeCounts = new Map<string, number>();
    if (hotMedia.length > 0) {
      // hotMedia 가 가진 type × bookingCount 합으로 비중 산정
      for (const r of hotMedia) {
        const v = (typeCounts.get(r.type) ?? 0) + r.bookingCount + r.inquiryCount;
        typeCounts.set(r.type, v);
      }
    }
    if ([...typeCounts.values()].reduce((a, b) => a + b, 0) === 0) {
      // 데이터 부족 시 전체 카탈로그의 type 분포로 폴백
      const all = await prisma.media
        .groupBy({ by: ["type"], _count: { _all: true } })
        .catch(() => [] as Array<{ type: string; _count: { _all: number } }>);
      typeCounts = new Map(all.map((r) => [r.type, r._count._all]));
    }
    const total = [...typeCounts.values()].reduce((a, b) => a + b, 0) || 1;
    industrySplit = [...typeCounts.entries()]
      .map(([type, count]) => ({
        key: type,
        label: isKo
          ? TYPE_LABEL_KO[type] ?? type
          : TYPE_LABEL_EN[type] ?? type,
        count,
        pct: Math.round((count / total) * 1000) / 10,
      }))
      .sort((a, b) => b.count - a.count);
  }

  // 3) New media — 최근 30일
  const newMediaRows = await prisma.media
    .findMany({
      where: { createdAt: { gte: last30Start } },
      orderBy: { createdAt: "desc" },
      take: 12,
      select: {
        id: true,
        name: true,
        nameEn: true,
        region: true,
        type: true,
        createdAt: true,
      },
    })
    .catch(() => []);
  const newMedia: NewMediaRow[] = newMediaRows.map((m) => ({
    id: m.id,
    name: isKo ? m.name : m.nameEn || m.name,
    region: m.region,
    type: m.type,
    createdAt: m.createdAt.toISOString(),
  }));

  // 4) Monthly avg CPM — 지난 6개월. Booking.amount / (Media.dailyFootfall × days × 30) 의 추정.
  //    간단 모형: 매월 confirmed booking 의 (amount, mediaId) 쌍에서 매체 daily traffic 으로 노출 추정 → CPM 평균
  const recentBookings = await prisma.booking
    .findMany({
      where: { createdAt: { gte: sixMonthsAgo } },
      select: {
        mediaId: true,
        amount: true,
        startDate: true,
        endDate: true,
        createdAt: true,
        media: { select: { dailyFootfall: true, price: true } },
      },
    })
    .catch(() => [] as Array<{
      mediaId: string;
      amount: number;
      startDate: Date;
      endDate: Date;
      createdAt: Date;
      media: { dailyFootfall: number | null; price: Prisma.Decimal | number };
    }>);

  const trendBuckets = new Map<string, { sumCpm: number; count: number }>();
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    trendBuckets.set(ymKey(d), { sumCpm: 0, count: 0 });
  }
  for (const b of recentBookings) {
    const days = Math.max(
      1,
      Math.round(
        (b.endDate.getTime() - b.startDate.getTime()) / (24 * 60 * 60 * 1000),
      ) + 1,
    );
    const daily = Number(b.media?.dailyFootfall ?? 0);
    const impressions = daily * days;
    if (impressions <= 0) continue;
    const cpm = (b.amount / impressions) * 1000;
    if (!Number.isFinite(cpm) || cpm <= 0) continue;
    const key = ymKey(b.createdAt);
    const bucket = trendBuckets.get(key);
    if (!bucket) continue;
    bucket.sumCpm += cpm;
    bucket.count += 1;
  }

  let cpmTrend: CpmTrendPoint[] = [...trendBuckets.entries()].map(
    ([k, v]) => {
      const [y, m] = k.split("-");
      const d = new Date(Date.UTC(Number(y), Number(m) - 1, 1));
      return {
        ymKey: k,
        label: ymLabel(d, isKo),
        cpmKrw: v.count > 0 ? Math.round(v.sumCpm / v.count) : 0,
        bookingCount: v.count,
      } satisfies CpmTrendPoint;
    },
  );

  // 데이터가 전부 0 이면 카탈로그 단가/노출 추정으로 가짜 데모 라인 한 줄 (모든 월에 동일 평균)
  if (cpmTrend.every((p) => p.cpmKrw === 0)) {
    const sample = await prisma.media
      .findMany({
        where: { dailyFootfall: { gt: 0 } },
        take: 200,
        select: { dailyFootfall: true, price: true, impressions: true },
      })
      .catch(() => [] as Array<{
        dailyFootfall: number | null;
        price: Prisma.Decimal | number | null;
        impressions: number | null;
      }>);
    let sumCpm = 0;
    let n = 0;
    for (const s of sample) {
      const monthlyImp = (s.impressions ?? 0) || (s.dailyFootfall ?? 0) * 30;
      const won = catalogPriceFieldToWon(Number(s.price ?? 0));
      if (monthlyImp > 0 && won > 0) {
        sumCpm += won / (monthlyImp / 1000);
        n += 1;
      }
    }
    const avg = n > 0 ? Math.round(sumCpm / n) : 0;
    cpmTrend = cpmTrend.map((p, i) => ({
      ...p,
      cpmKrw: Math.round(avg * (0.95 + 0.04 * Math.cos(i / 2))),
      bookingCount: 0,
    }));
  }

  return {
    generatedAt: now.toISOString(),
    hotMedia,
    industrySplit,
    newMedia,
    cpmTrend,
  };
}
