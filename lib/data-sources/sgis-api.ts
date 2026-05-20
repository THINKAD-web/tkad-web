/**
 * 통계청 SGIS+ 상권·인구 API (선택 연동)
 * 환경변수: SGIS_API_KEY, SGIS_API_URL
 */
import type { PartialSourcePayload } from "@/lib/data-source-types";
import { getPrisma, isDatabaseConfigured } from "@/lib/prisma";

export async function fetchSgisCommerceMix(opts: {
  latitude?: number | null;
  longitude?: number | null;
  district?: string | null;
}): Promise<PartialSourcePayload | null> {
  const apiKey = process.env.SGIS_API_KEY?.trim();
  if (!apiKey || opts.latitude == null || opts.longitude == null) return null;

  const cacheKey = `sgis:${opts.latitude.toFixed(4)}:${opts.longitude.toFixed(4)}`;
  if (isDatabaseConfigured()) {
    const db = getPrisma();
    const row = await db.externalDataCache.findUnique({ where: { sourceKey: cacheKey } });
    if (row && row.expiresAt >= new Date()) {
      return row.payload as PartialSourcePayload;
    }
  }

  const baseUrl =
    process.env.SGIS_API_URL?.trim() ||
    "https://sgis.kostat.go.kr/OpenAPI3";

  try {
    const url = `${baseUrl}/stats/commerce.json?accessToken=${apiKey}&x=${opts.longitude}&y=${opts.latitude}`;
    const res = await fetch(url, { signal: AbortSignal.timeout(12_000) });
    if (!res.ok) return null;
    const json = (await res.json()) as Record<string, unknown>;
    const result = json.result as Record<string, number> | undefined;
    if (!result) return null;

    const payload: PartialSourcePayload = {
      sourceId: "sgis",
      weight: 0.9,
      confidence: 88,
      labelKo: "통계청 SGIS+ 상권 분석",
      labelEn: "Statistics Korea SGIS+ trade area",
      level: "high",
      commerce: {
        cafe: result.cafe ?? 20,
        office: result.office ?? 35,
        shopping: result.retail ?? 25,
        residential: result.residential ?? 20,
      },
    };

    if (isDatabaseConfigured()) {
      const db = getPrisma();
      await db.externalDataCache.upsert({
        where: { sourceKey: cacheKey },
        create: {
          sourceKey: cacheKey,
          payload: payload as object,
          expiresAt: new Date(Date.now() + 30 * 86400_000),
        },
        update: {
          payload: payload as object,
          expiresAt: new Date(Date.now() + 30 * 86400_000),
        },
      });
    }
    return payload;
  } catch {
    return null;
  }
}
