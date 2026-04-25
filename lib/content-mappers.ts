import type {
  AcademyLesson as AcademyLessonRow,
  SuccessCase,
  TrendReport,
} from "@prisma/client";
import type {
  PublicSuccessCaseDetail,
  PublicSuccessCaseListItem,
} from "@/lib/success-case-public";
import type { AcademyLesson } from "@/lib/academy-content";
import { DEMO_VIDEO_EMBED } from "@/lib/academy-content";
import type {
  InsightReport,
  InsightVerticalTag,
  VerticalStrategyBlock,
} from "@/lib/insights-reports";

function isVerticalBlock(x: unknown): x is VerticalStrategyBlock {
  if (!x || typeof x !== "object") return false;
  const o = x as Record<string, unknown>;
  return (
    typeof o.labelKo === "string" &&
    typeof o.labelEn === "string" &&
    Array.isArray(o.bulletsKo) &&
    Array.isArray(o.bulletsEn) &&
    o.bulletsKo.every((z) => typeof z === "string") &&
    o.bulletsEn.every((z) => typeof z === "string")
  );
}

export function parseVerticalStrategyBlocks(
  json: unknown,
): VerticalStrategyBlock[] {
  if (!Array.isArray(json)) return [];
  return json.filter(isVerticalBlock);
}

function inferVerticalTags(blocks: VerticalStrategyBlock[]): InsightVerticalTag[] {
  const tags = new Set<InsightVerticalTag>(["general"]);
  const hay = blocks
    .map((b) => `${b.labelKo} ${b.labelEn}`)
    .join(" ")
    .toLowerCase();
  if (/패션|뷰티|fashion|beauty/.test(hay)) tags.add("fashion");
  if (/자동차|automotive|전기차|\bev\b|오토/.test(hay)) tags.add("auto");
  if (/식음료|f&b|fnb|카페|레스토랑|food|beverage/.test(hay)) tags.add("fb");
  return [...tags];
}

function defaultVerticalBlock(summaryKo: string[]): VerticalStrategyBlock {
  const lines = summaryKo.length > 0 ? summaryKo : ["콘텐츠를 확인해 주세요."];
  return {
    labelKo: "핵심 요약",
    labelEn: "Key takeaways",
    bulletsKo: lines.slice(0, 4),
    bulletsEn: lines.slice(0, 4),
  };
}

/** Maps a DB row to the public InsightReport shape (PDF·카드 UI용). */
export function trendReportToInsightReport(row: TrendReport): InsightReport {
  let blocks = parseVerticalStrategyBlocks(row.verticalStrategies);
  if (blocks.length === 0) {
    blocks = [defaultVerticalBlock(row.summaryKo)];
  }
  const verticalTags = inferVerticalTags(blocks);
  const [yStr, mStr] = row.month.split("-");
  const y = Number(yStr);
  const m = Number(mStr);
  const labelKo =
    Number.isFinite(y) && Number.isFinite(m) ? `${y}년 ${m}월` : row.month;
  const labelEn =
    Number.isFinite(y) && Number.isFinite(m)
      ? new Date(Date.UTC(y, m - 1, 1)).toLocaleDateString("en-US", {
          month: "long",
          year: "numeric",
          timeZone: "UTC",
        })
      : row.month;
  const publishedIso = row.publishedAt
    ? row.publishedAt.toISOString().slice(0, 10)
    : `${row.month}-28`;
  const titleEn = row.titleEn?.trim() || row.titleKo;
  const enSummary = row.summaryKo;
  return {
    id: row.id,
    period: "monthly",
    labelKo,
    labelEn,
    titleKo: row.titleKo,
    titleEn,
    publishedIso,
    summaryKo: row.summaryKo,
    summaryEn: enSummary,
    marketTrendKo: row.marketTrendKo,
    marketTrendEn: row.marketTrendKo,
    doohKo: row.doohTrendKo,
    doohEn: row.doohTrendKo,
    verticalBlocks: blocks,
    pdfBaseName: `thinkad-ooh-insight-${row.month.replace(/-/g, "")}`,
    verticalTags,
  };
}

function extractChapterTitles(chapters: unknown): string[] {
  if (!Array.isArray(chapters)) return [];
  return chapters
    .map((c) => {
      if (c && typeof c === "object" && "title" in c) {
        return String((c as { title: unknown }).title).trim();
      }
      return "";
    })
    .filter(Boolean);
}

/** Maps DB academy row to legacy AcademyLesson UI type (동영상·PDF는 플레이스홀더). */
export function dbAcademyLessonToUi(row: AcademyLessonRow): AcademyLesson {
  const outlineFromChapters = extractChapterTitles(row.chapters);
  const outlineKo =
    row.objectivesKo.length > 0 ? row.objectivesKo : outlineFromChapters;
  const titleEn = row.titleEn?.trim() || row.titleKo;
  return {
    id: row.id,
    titleKo: row.titleKo,
    titleEn,
    descKo: row.descriptionKo,
    descEn: row.descriptionKo,
    durationMin: row.durationMin,
    videoEmbedUrl: DEMO_VIDEO_EMBED,
    pdfFileName: `thinkad-academy-${row.id}-outline.pdf`,
    outlineKo,
    outlineEn: outlineKo,
  };
}

function metricsAsRecord(json: unknown): Record<string, unknown> | null {
  if (!json || typeof json !== "object" || Array.isArray(json)) return null;
  return json as Record<string, unknown>;
}

export function successCaseToPublicListItem(
  row: SuccessCase,
): PublicSuccessCaseListItem {
  return {
    id: row.id,
    industry: row.industry,
    clientName: row.clientName,
    titleKo: row.titleKo,
    titleEn: row.titleEn?.trim() ? row.titleEn : null,
    summaryKo: row.summaryKo,
    thumbnailUrl: row.thumbnailUrl,
    mediaUsed: row.mediaUsed,
    mediaIds: row.mediaIds ?? [],
    publishedAtIso: row.publishedAt ? row.publishedAt.toISOString() : null,
  };
}

export function successCaseToPublicDetail(
  row: SuccessCase,
): PublicSuccessCaseDetail {
  return {
    ...successCaseToPublicListItem(row),
    challengeKo: row.challengeKo,
    solutionKo: row.solutionKo,
    resultsKo: row.resultsKo,
    metricsJson: metricsAsRecord(row.metricsJson),
    periodStartIso: row.periodStart ? row.periodStart.toISOString() : null,
    periodEndIso: row.periodEnd ? row.periodEnd.toISOString() : null,
    galleryUrls: row.galleryUrls ?? [],
    testimonialKo: row.testimonialKo,
  };
}
