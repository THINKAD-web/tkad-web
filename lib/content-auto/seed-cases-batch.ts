import { Prisma } from "@prisma/client";
import {
  CASE_SEED_SYSTEM,
  CASE_SEED_TOPICS,
  caseSeedTitle,
  type CaseSeedTopic,
} from "@/lib/content-auto/case-seed-topics";
import {
  extractBulletLines,
  extractSummaryLines,
  firstParagraph,
  sectionByKeyword,
  splitMarkdownSections,
} from "@/lib/content-auto/seed-content-parse";
import { normalizeSummaryKo } from "@/lib/content-auto/success-case-summary";
import {
  generateSeedText,
  resolveSeedModel,
  withSeedDelay,
} from "@/lib/content-auto/seed-claude-direct";
import { getPrisma } from "@/lib/prisma";

export type CaseSeedItemResult = {
  title: string;
  brandName: string;
  status: "created" | "skipped" | "error";
  id?: string;
  href?: string;
  error?: string;
};

function parseSuccessCaseFields(content: string, topic: CaseSeedTopic) {
  const sections = splitMarkdownSections(content);
  const background =
    sectionByKeyword(sections, /배경|과제|목표/) ||
    sections[0]?.content ||
    content;
  const strategy =
    sectionByKeyword(sections, /전략|매체/) ||
    sections[1]?.content ||
    "";
  const execution =
    sectionByKeyword(sections, /집행|운영|소재/) || "";
  const performance =
    sectionByKeyword(sections, /성과|결과|효과/) || "";

  const challengeKo = [background, strategy].filter(Boolean).join("\n\n").trim();
  const solutionKo = [execution, strategy].filter(Boolean).join("\n\n").trim() || content;

  let resultsKo = extractBulletLines(performance || content, 6);
  if (resultsKo.length < 2) {
    resultsKo = extractSummaryLines(content, 3);
  }

  const summaryFallback = `${topic.goal} — ${topic.region} ${topic.mediaType} 집행 성과`;
  const summaryCandidates = [
    ...extractSummaryLines(performance || content, 4),
    ...extractSummaryLines(background || content, 2),
    firstParagraph(performance || content, 160),
    firstParagraph(background || content, 160),
  ].filter(Boolean);
  const summaryKo = normalizeSummaryKo(summaryCandidates, summaryFallback);

  return {
    challengeKo: challengeKo || content.slice(0, 1200),
    solutionKo: solutionKo || content,
    resultsKo,
    summaryKo,
  };
}

export async function runCaseSeedBatch(): Promise<{
  results: CaseSeedItemResult[];
  created: number;
  skipped: number;
  errors: number;
}> {
  const db = getPrisma();
  const model = resolveSeedModel();
  const results: CaseSeedItemResult[] = [];

  for (let i = 0; i < CASE_SEED_TOPICS.length; i++) {
    const topic = CASE_SEED_TOPICS[i];
    const titleKo = caseSeedTitle(topic);

    const existing = await db.successCase.findFirst({
      where: { clientName: topic.brandName, titleKo },
    });
    if (existing) {
      results.push({
        title: titleKo,
        brandName: topic.brandName,
        status: "skipped",
        id: existing.id,
        href: `/ko/cases/${existing.id}`,
      });
      continue;
    }

    try {
      const content = await withSeedDelay(i, () =>
        generateSeedText({
          system: CASE_SEED_SYSTEM,
          user: `다음 조건으로 성공 사례 작성:
브랜드: ${topic.brandName}
업종: ${topic.industry}
지역: ${topic.region}
매체: ${topic.mediaType}
예산: ${topic.budget}
기간: ${topic.period}
목표: ${topic.goal}
분량: 800자 이상`,
          maxTokens: 2000,
        }),
      );

      const parsed = parseSuccessCaseFields(content, topic);
      const now = new Date();

      const row = await db.successCase.create({
        data: {
          status: "published",
          clientName: topic.brandName,
          industry: topic.industry,
          titleKo,
          summaryKo: parsed.summaryKo,
          challengeKo: parsed.challengeKo,
          solutionKo: parsed.solutionKo,
          resultsKo: parsed.resultsKo,
          mediaUsed: [topic.mediaType, topic.region].filter(Boolean),
          metricsJson: {
            seed: true,
            budget: topic.budget,
            period: topic.period,
            goal: topic.goal,
            aiModel: model,
          } as Prisma.InputJsonValue,
          publishedAt: now,
        },
      });

      results.push({
        title: titleKo,
        brandName: topic.brandName,
        status: "created",
        id: row.id,
        href: `/ko/cases/${row.id}`,
      });
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      console.error("[seed/cases]", topic.brandName, msg);
      results.push({
        title: titleKo,
        brandName: topic.brandName,
        status: "error",
        error: msg,
      });
    }
  }

  return {
    results,
    created: results.filter((r) => r.status === "created").length,
    skipped: results.filter((r) => r.status === "skipped").length,
    errors: results.filter((r) => r.status === "error").length,
  };
}
