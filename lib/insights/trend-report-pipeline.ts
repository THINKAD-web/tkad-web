import { Prisma } from "@prisma/client";
import {
  generateTrendReport,
  resolveModel,
  type TrendReportGenerationContext,
} from "@/lib/ai-content-generator";
import { fetchInternalMediaInsights } from "@/lib/insights/sources/internal";
import { fetchOOHWebSources } from "@/lib/insights/sources/tavily";
import { getPrisma } from "@/lib/prisma";

/** Admin·월간 cron 공통 Tavily 검색어 */
export const ADMIN_TREND_SEARCH_KEYWORDS = [
  "OOH advertising Korea 2026",
  "옥외광고 트렌드",
  "DOOH Korea market",
  "디지털 옥외광고 트렌드",
] as const;

export type TrendReportPipelinePhase =
  | "searching"
  | "sources"
  | "generating"
  | "saving"
  | "complete"
  | "error";

export type TrendReportPipelineEvent =
  | { phase: "searching"; message: string }
  | { phase: "sources"; count: number; keywordsUsed: string[] }
  | { phase: "generating"; message: string }
  | { phase: "saving"; message: string }
  | {
      phase: "complete";
      trendReport: {
        id: string;
        month: string | null;
        status: string;
        titleKo: string;
        contentKo: string;
        summaryKo: string[];
        marketTrendKo: string[];
        doohTrendKo: string[];
      };
    }
  | { phase: "error"; error: string };

export type TrendReportPipelineOptions = {
  month: string;
  /** 기존 row 갱신(재생성) */
  reportId?: string;
  slug?: string | null;
  generationMethod?: "manual" | "auto";
  /** 월간 cron: month unique 충돌 방지용 null */
  monthField?: string | null;
  onProgress?: (event: TrendReportPipelineEvent) => void;
};

function emit(
  onProgress: TrendReportPipelineOptions["onProgress"],
  event: TrendReportPipelineEvent,
): void {
  onProgress?.(event);
}

/**
 * Tavily → Claude 초안 → DB draft 저장.
 * cron·어드민 generate-ai 가 공유합니다.
 */
export async function runTrendReportDraftPipeline(
  opts: TrendReportPipelineOptions,
): Promise<TrendReportPipelineEvent & { phase: "complete" }> {
  const { month, reportId, onProgress } = opts;

  emit(onProgress, {
    phase: "searching",
    message: "Tavily로 최신 OOH 뉴스 검색 중…",
  });

  const [tavily, internalInsights] = await Promise.all([
    fetchOOHWebSources({
      keywords: [...ADMIN_TREND_SEARCH_KEYWORDS],
      days: 30,
      maxResults: 10,
    }),
    fetchInternalMediaInsights(),
  ]);

  emit(onProgress, {
    phase: "sources",
    count: tavily.sources.length,
    keywordsUsed: tavily.keywordsUsed,
  });

  const context: TrendReportGenerationContext = {
    webSources: tavily.sources,
    internalInsights: internalInsights.map((i) => ({
      title: i.title,
      summary: i.summary,
    })),
  };

  emit(onProgress, {
    phase: "generating",
    message: "Claude로 리포트 초안 작성 중…",
  });

  const g = await generateTrendReport(month, context);

  emit(onProgress, { phase: "saving", message: "초안 저장 중…" });

  const db = getPrisma();
  const data = {
    month: opts.monthField === undefined ? month : opts.monthField,
    slug: opts.slug ?? null,
    status: "draft" as const,
    titleKo: g.titleKo,
    titleEn: g.titleEn,
    contentKo: g.contentKo,
    summaryKo: g.summaryKo,
    marketTrendKo: g.marketTrendKo,
    doohTrendKo: g.doohTrendKo,
    verticalStrategies:
      g.verticalStrategies === null || g.verticalStrategies === undefined
        ? undefined
        : (g.verticalStrategies as Prisma.InputJsonValue),
    thumbnailUrl: g.thumbnailUrl,
    publishedAt: null,
    generationMethod: opts.generationMethod ?? "manual",
    aiModel: resolveModel(),
    sources: tavily.sources as unknown as Prisma.InputJsonValue,
    internalDataUsed: internalInsights.map((i) => i.title),
    validationScore: null,
    validationResult: Prisma.JsonNull,
  };

  const saved = reportId
    ? await db.trendReport.update({ where: { id: reportId }, data })
    : await db.trendReport.create({ data });

  const complete = {
    phase: "complete" as const,
    trendReport: {
      id: saved.id,
      month: saved.month,
      status: saved.status,
      titleKo: saved.titleKo,
      contentKo: saved.contentKo,
      summaryKo: saved.summaryKo,
      marketTrendKo: saved.marketTrendKo,
      doohTrendKo: saved.doohTrendKo,
    },
  };
  emit(onProgress, complete);
  return complete;
}
