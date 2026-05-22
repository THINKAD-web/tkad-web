import { getPrisma, isDatabaseConfigured } from "@/lib/prisma";
import {
  anonymizeBrandName,
  industryFromText,
  industryLabel,
} from "@/lib/insights/industry-classify";
import { isMissingContentTableError } from "@/lib/prisma-content-guards";

export type MediaRecentBrandRow = {
  anonymizedName: string;
  industry: string;
  industryLabel: string;
  periodLabelKo: string;
  periodLabelEn: string;
};

export type MediaRecentBrandsData = {
  brands: MediaRecentBrandRow[];
  regionCompetitorCount: number;
  regionNoteKo: string;
  regionNoteEn: string;
};

function formatPeriod(
  start: Date | null | undefined,
  end: Date | null | undefined,
  isKo: boolean,
): { ko: string; en: string } {
  if (!start && !end) {
    return isKo
      ? { ko: "최근 3개월", en: "Last 3 months" }
      : { ko: "—", en: "—" };
  }
  const fmt = (d: Date) =>
    isKo
      ? `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, "0")}`
      : d.toLocaleDateString("en-US", { year: "numeric", month: "short" });
  if (start && end) {
    return { ko: `${fmt(start)} ~ ${fmt(end)}`, en: `${fmt(start)} – ${fmt(end)}` };
  }
  const d = start ?? end!;
  return { ko: fmt(d), en: fmt(d) };
}

export async function getMediaRecentBrands(
  mediaId: string,
  region: string,
  isKo: boolean,
): Promise<MediaRecentBrandsData> {
  const empty: MediaRecentBrandsData = {
    brands: [],
    regionCompetitorCount: 0,
    regionNoteKo: "",
    regionNoteEn: "",
  };

  if (!isDatabaseConfigured()) return empty;

  try {
    const db = getPrisma();
    const since = new Date(Date.now() - 180 * 86400_000);
    const regionPrefix = region?.trim().slice(0, 2) || "서울";

    const [executions, regionExecCount] = await Promise.all([
      db.mediaAdvertiserExecution.findMany({
        where: { mediaId },
        orderBy: [{ periodEnd: "desc" }, { createdAt: "desc" }],
        take: 8,
        select: {
          advertiserName: true,
          campaignLabel: true,
          periodStart: true,
          periodEnd: true,
        },
      }),
      db.mediaAdvertiserExecution.count({
        where: {
          createdAt: { gte: since },
          media: { region: { contains: regionPrefix } },
        },
      }),
    ]);

    const brands: MediaRecentBrandRow[] = executions.map((e, i) => {
      const text = [e.advertiserName, e.campaignLabel].filter(Boolean).join(" ");
      const industry = industryFromText(text);
      const period = formatPeriod(e.periodStart, e.periodEnd, isKo);
      return {
        anonymizedName: anonymizeBrandName(text, i, isKo),
        industry,
        industryLabel: industryLabel(industry, isKo),
        periodLabelKo: period.ko,
        periodLabelEn: period.en,
      };
    });

    const regionNoteKo =
      regionExecCount >= 5
        ? `이 지역(${region})에서 경쟁사 집행이 활발합니다 (최근 6개월 ${regionExecCount}건).`
        : regionExecCount >= 2
          ? `이 지역에서 ${regionExecCount}건의 OOH 집행이 확인되었습니다.`
          : "";

    const regionNoteEn =
      regionExecCount >= 5
        ? `Active OOH competition in this region (${regionExecCount} flights in 6 months).`
        : regionExecCount >= 2
          ? `${regionExecCount} OOH flights recorded in this region recently.`
          : "";

    return {
      brands,
      regionCompetitorCount: regionExecCount,
      regionNoteKo,
      regionNoteEn,
    };
  } catch (e) {
    if (isMissingContentTableError(e)) return empty;
    console.warn("[media-recent-brands]", e);
    return empty;
  }
}
