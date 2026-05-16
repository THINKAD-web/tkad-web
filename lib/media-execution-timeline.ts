import { getPrisma, isDatabaseConfigured } from "@/lib/prisma";

export type ExecutionMonthCell = {
  /** YYYY-MM */
  key: string;
  /** 표시용 (ko: 2026년 5월 / en: May 2026) */
  label: string;
  executionCount: number;
  /** 익명화된 브랜드 라벨 */
  brandLabels: string[];
};

export type MediaExecutionTimeline = {
  months: ExecutionMonthCell[];
  /** 최근 6개월 창 내 고유 브랜드(익명) 수 */
  uniqueBrandCount: number;
  hasData: boolean;
};

const BRAND_LETTERS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";

function anonymizeBrandKey(raw: string): string {
  return raw.trim().toLowerCase().replace(/\s+/g, " ");
}

function brandLabelForIndex(index: number, isKo: boolean): string {
  const letter = BRAND_LETTERS[index % BRAND_LETTERS.length] ?? "A";
  return isKo ? `브랜드 ${letter}` : `Brand ${letter}`;
}

function monthKey(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  return `${y}-${m}`;
}

function monthLabel(key: string, isKo: boolean): string {
  const [y, m] = key.split("-");
  const monthNum = Number(m);
  if (!y || !Number.isFinite(monthNum)) return key;
  if (isKo) return `${y}년 ${monthNum}월`;
  const d = new Date(Number(y), monthNum - 1, 1);
  return d.toLocaleDateString("en-US", { month: "short", year: "numeric" });
}

function executionMonthKeys(
  periodStart: Date | null,
  periodEnd: Date | null,
  createdAt: Date,
): string[] {
  const start = periodStart ?? periodEnd ?? createdAt;
  const end = periodEnd ?? periodStart ?? createdAt;
  const from = start <= end ? start : end;
  const to = start <= end ? end : start;

  const keys = new Set<string>();
  const cursor = new Date(from.getFullYear(), from.getMonth(), 1);
  const endMonth = new Date(to.getFullYear(), to.getMonth(), 1);
  while (cursor <= endMonth) {
    keys.add(monthKey(cursor));
    cursor.setMonth(cursor.getMonth() + 1);
  }
  if (keys.size === 0) keys.add(monthKey(createdAt));
  return [...keys];
}

function lastSixMonthKeys(): string[] {
  const now = new Date();
  const keys: string[] = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    keys.push(monthKey(d));
  }
  return keys;
}

/** 최근 6개월 집행 이력 — 브랜드명 익명 처리. */
export async function fetchMediaExecutionTimeline(
  mediaId: string,
  isKo: boolean,
): Promise<MediaExecutionTimeline> {
  const windowKeys = lastSixMonthKeys();
  const empty: MediaExecutionTimeline = {
    months: windowKeys.map((key) => ({
      key,
      label: monthLabel(key, isKo),
      executionCount: 0,
      brandLabels: [],
    })),
    uniqueBrandCount: 0,
    hasData: false,
  };

  if (!isDatabaseConfigured()) return empty;

  const sixMonthsAgo = new Date();
  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
  sixMonthsAgo.setDate(1);
  sixMonthsAgo.setHours(0, 0, 0, 0);

  try {
    const db = getPrisma();
    const rows = await db.mediaAdvertiserExecution.findMany({
      where: {
        mediaId,
        OR: [
          { periodStart: { gte: sixMonthsAgo } },
          { periodEnd: { gte: sixMonthsAgo } },
          { createdAt: { gte: sixMonthsAgo } },
        ],
      },
      select: {
        advertiserName: true,
        periodStart: true,
        periodEnd: true,
        createdAt: true,
      },
      orderBy: [{ periodStart: "desc" }, { createdAt: "desc" }],
    });

    if (!rows.length) return empty;

    const brandKeyToLabel = new Map<string, string>();
    const monthBrands = new Map<string, Set<string>>();
    const monthCounts = new Map<string, number>();

    for (const row of rows) {
      const rawName = row.advertiserName.trim();
      if (!rawName) continue;
      const bKey = anonymizeBrandKey(rawName);
      if (!brandKeyToLabel.has(bKey)) {
        brandKeyToLabel.set(
          bKey,
          brandLabelForIndex(brandKeyToLabel.size, isKo),
        );
      }
      const label = brandKeyToLabel.get(bKey)!;

      const months = executionMonthKeys(
        row.periodStart,
        row.periodEnd,
        row.createdAt,
      );
      for (const mk of months) {
        if (!windowKeys.includes(mk)) continue;
        monthCounts.set(mk, (monthCounts.get(mk) ?? 0) + 1);
        if (!monthBrands.has(mk)) monthBrands.set(mk, new Set());
        monthBrands.get(mk)!.add(label);
      }
    }

    const months = windowKeys.map((key) => ({
      key,
      label: monthLabel(key, isKo),
      executionCount: monthCounts.get(key) ?? 0,
      brandLabels: [...(monthBrands.get(key) ?? [])].sort(),
    }));

    return {
      months,
      uniqueBrandCount: brandKeyToLabel.size,
      hasData: brandKeyToLabel.size > 0,
    };
  } catch (e) {
    console.error("[fetchMediaExecutionTimeline]", e);
    return empty;
  }
}
