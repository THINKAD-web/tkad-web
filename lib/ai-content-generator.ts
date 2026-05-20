import Anthropic from "@anthropic-ai/sdk";
import type { AcademyLesson, SuccessCase, TrendReport } from "@prisma/client";
import type { Prisma } from "@prisma/client";
import { trendAnalystSystemOverlay } from "@/lib/content-auto/generators";
import {
  CAMPAIGN_COMPLETION_PDF_GUIDANCE,
  CAMPAIGN_REPORT_TASK_GUIDANCE,
  SUCCESS_CASE_TASK_GUIDANCE,
  withOohExpertContext,
} from "@/lib/ai-ooh-expert";
import prisma, {
  getPrisma,
  isDatabaseConfigured,
} from "@/lib/prisma";

/** Default Claude 3.5 Sonnet snapshot; override with ANTHROPIC_MODEL. */
export const ANTHROPIC_DEFAULT_MODEL = "claude-sonnet-4-5-20250929";

const TREND_TOOL = "emit_trend_report" as const;
const ACADEMY_TOOL = "emit_academy_lesson" as const;
const SUCCESS_CASE_TOOL = "emit_success_case" as const;
const CAMPAIGN_COMPLETION_TOOL = "emit_campaign_completion_report" as const;

/**
 * THINKAD Academy — 시스템 프롬프트 (레슨 1개 생성).
 * 구조화 출력은 `emit_academy_lesson` 툴 스키마에 맞춥니다.
 */
export const ACADEMY_LESSON_SYSTEM_PROMPT = `Additionally, you design and write THINKAD Academy curriculum modules—a professional training program for the Korean OOH and DOOH industry.

Audience: brand marketers, agency planners, and media buyers—mostly Korean-speaking, beginner to intermediate. Assume they run or evaluate outdoor and digital-out-of-home campaigns in Korea.

Language:
- Primary language for descriptionKo, objectivesKo, and all chapter content is Korean (존댓말·실무 톤, 과장 없이 명확하게).
- titleEn is optional; when present, use concise, natural English (title case or sentence case is fine).

Pedagogy:
- Each chapter should teach one idea, then connect it to decisions buyers actually make (매체 선정, 기간, 예산, 검증).
- Use Markdown in every chapter \`content\`: ## / ### headings, bullet lists, short paragraphs; use bold sparingly for key terms.
- End the lesson with a short recap or checklist in the final chapter when it fits the topic.

Quizzes (when included):
- 2–5 items. Each question has exactly four options (strings).
- Exactly one option is correct. The \`answer\` string must match one of \`options\` verbatim (same spelling and spacing).
- Distractors should be plausible to someone who skimmed the lesson.

Factual discipline:
- Do not invent specific statistics, vendor names, or law articles unless they are generic common knowledge; prefer qualitative guidance and “검토 포인트” framing.

Output: you must submit the lesson only by calling the tool \`emit_academy_lesson\` once, with complete fields.`;

export function buildAcademyLessonUserPrompt(
  courseTitle: string,
  lessonTitle: string,
): string {
  return `다음 커리큘럼 맥락에서 **한 개의 레슨**만 생성하세요.

## 커스(과정 그룹)
${courseTitle}

## 이번 레슨의 초점
${lessonTitle}

## 산출물 (툴 입력 필드)
- **titleKo**: 레슨 초점을 반영한 한국어 제목 (브랜드명 THINKAD는 필요할 때만 자연스럽게).
- **titleEn**: 선택. 있으면 영문 제목 한 줄.
- **descriptionKo**: 2–4문장. 누가, 무엇을, 왜 배우는지(학습 가치).
- **objectivesKo**: 4–7개. “~할 수 있다” 형태의 측정 가능한 학습목표.
- **chapters**: 5–8개 권장. 각 항목은 \`title\`(짧은 한국어) + \`content\`(Markdown 본문).
  권장 흐름: 맥락·용어 정리 → 핵심 개념 → 실무 적용 → 체크리스트·주의사항 →(선택) 요약.
- **quizzes**: 선택이지만 **가능하면 3문항 이상** 포함. 각 문항은 4지선다, \`answer\`는 options 중 정확히 하나와 동일한 문자열.
- **durationMin**: 이 레슨을 읽고 퀴즈까지 포함해 소요되는 현실적인 시간(분). 보통 15–50분 범위.
- **thumbnailUrl**: 없으면 생략(null).

한국어 본문은 업계에서 쓰는 용어(OOH, DOOH, 노출, 송출, 패널, 프로그래매틱 등)를 일관되게 사용하세요.`;
}

type TrendReportToolInput = {
  titleKo: string;
  titleEn?: string | null;
  contentKo: string;
  summaryKo: string[];
  marketTrendKo: string[];
  doohTrendKo: string[];
  verticalStrategies?: unknown;
  thumbnailUrl?: string | null;
};

type AcademyChapter = { title: string; content: string };
type AcademyQuiz = {
  question: string;
  options: string[];
  answer: string;
};

type AcademyLessonToolInput = {
  titleKo: string;
  titleEn?: string | null;
  descriptionKo: string;
  objectivesKo: string[];
  chapters: AcademyChapter[];
  quizzes?: AcademyQuiz[] | null;
  durationMin?: number | null;
  thumbnailUrl?: string | null;
};

type SuccessCaseToolInput = {
  titleKo: string;
  titleEn?: string | null;
  summaryKo: string;
  challengeKo: string;
  solutionKo: string;
  resultsKo: string[];
  industry: string;
  metricsJson?: Record<string, unknown> | null;
  mediaUsed: string[];
  periodStart?: string | null;
  periodEnd?: string | null;
  thumbnailUrl?: string | null;
  galleryUrls?: string[] | null;
  testimonialKo?: string | null;
};

export function getAnthropicClient(): Anthropic {
  const key = process.env.ANTHROPIC_API_KEY?.trim();
  if (!key) {
    throw new Error(
      "ANTHROPIC_API_KEY is not set. Add it to your environment to generate content.",
    );
  }
  return new Anthropic({ apiKey: key });
}

export function resolveModel(): string {
  return process.env.ANTHROPIC_MODEL?.trim() || ANTHROPIC_DEFAULT_MODEL;
}

function assertMonthFormat(month: string): void {
  if (!/^\d{4}-\d{2}$/.test(month)) {
    throw new Error(
      `Invalid month "${month}". Expected YYYY-MM (e.g. 2026-03).`,
    );
  }
}

function courseIdFromTitle(courseTitle: string): string {
  const base = courseTitle
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9가-힣-]/g, "")
    .slice(0, 80);
  return base || "course";
}

function extractToolInput<T>(message: Anthropic.Message, toolName: string): T {
  for (const block of message.content) {
    if (block.type === "tool_use" && block.name === toolName) {
      return block.input as T;
    }
  }
  throw new Error(`Model did not return tool "${toolName}".`);
}

function usageTotal(message: Anthropic.Message): number | null {
  const u = message.usage;
  if (!u) return null;
  return (u.input_tokens ?? 0) + (u.output_tokens ?? 0);
}

async function appendGenerationLog(entry: {
  type: string;
  targetId?: string | null;
  prompt: string;
  response?: string | null;
  model: string;
  tokensUsed?: number | null;
  status: string;
  errorMsg?: string | null;
}): Promise<void> {
  if (!isDatabaseConfigured()) return;
  try {
    await prisma.generationLog.create({
      data: {
        type: entry.type,
        targetId: entry.targetId ?? null,
        prompt: entry.prompt,
        response: entry.response ?? null,
        model: entry.model,
        tokensUsed: entry.tokensUsed ?? null,
        status: entry.status,
        errorMsg: entry.errorMsg ?? null,
      },
    });
  } catch {
    // Logging must not break generation callers.
  }
}

function trendReportTool(): Anthropic.Tool {
  return {
    name: TREND_TOOL,
    description:
      "Submit the completed Korean OOH / DOOH monthly trend report as structured fields. Call exactly once.",
    input_schema: {
      type: "object",
      properties: {
        titleKo: { type: "string", description: "Korean report title" },
        titleEn: { type: "string", description: "English title (optional)" },
        contentKo: {
          type: "string",
          description: "Full body in Markdown (Korean)",
        },
        summaryKo: {
          type: "array",
          items: { type: "string" },
          description: "3–6 executive summary bullets (Korean)",
        },
        marketTrendKo: {
          type: "array",
          items: { type: "string" },
          description: "Korea OOH market trend bullets",
        },
        doohTrendKo: {
          type: "array",
          items: { type: "string" },
          description: "DOOH-specific trend bullets (Korean)",
        },
        verticalStrategies: {
          type: "array",
          description:
            "Vertical strategy blocks: labelKo, labelEn, bulletsKo[], bulletsEn[]",
          items: {
            type: "object",
            properties: {
              labelKo: { type: "string" },
              labelEn: { type: "string" },
              bulletsKo: { type: "array", items: { type: "string" } },
              bulletsEn: { type: "array", items: { type: "string" } },
            },
            required: ["labelKo", "labelEn", "bulletsKo", "bulletsEn"],
          },
        },
        thumbnailUrl: { type: "string", description: "Optional hero image URL" },
      },
      required: [
        "titleKo",
        "contentKo",
        "summaryKo",
        "marketTrendKo",
        "doohTrendKo",
      ],
    },
  };
}

function academyLessonTool(): Anthropic.Tool {
  return {
    name: ACADEMY_TOOL,
    description:
      "Submit one academy lesson: objectives, chapter bodies, optional quizzes. Call exactly once.",
    input_schema: {
      type: "object",
      properties: {
        titleKo: { type: "string" },
        titleEn: { type: "string" },
        descriptionKo: {
          type: "string",
          description: "Lesson intro / overview (Korean)",
        },
        objectivesKo: {
          type: "array",
          items: { type: "string" },
          description: "Learning objectives (Korean)",
        },
        chapters: {
          type: "array",
          description:
            "5–8 chapters recommended (minimum 4). Each: Korean title + Markdown content.",
          items: {
            type: "object",
            properties: {
              title: { type: "string" },
              content: { type: "string", description: "Markdown body" },
            },
            required: ["title", "content"],
          },
        },
        quizzes: {
          type: "array",
          items: {
            type: "object",
            properties: {
              question: { type: "string" },
              options: { type: "array", items: { type: "string" } },
              answer: {
                type: "string",
                description: "Correct option text (must match one of options)",
              },
            },
            required: ["question", "options", "answer"],
          },
        },
        durationMin: { type: "number" },
        thumbnailUrl: { type: "string" },
      },
      required: ["titleKo", "descriptionKo", "objectivesKo", "chapters"],
    },
  };
}

function successCaseTool(): Anthropic.Tool {
  return {
    name: SUCCESS_CASE_TOOL,
    description:
      "Submit one OOH/DOOH success case (성공사례) draft. Call exactly once.",
    input_schema: {
      type: "object",
      properties: {
        titleKo: { type: "string" },
        titleEn: { type: "string" },
        summaryKo: {
          type: "string",
          description: "한 줄 요약 (카드용)",
        },
        challengeKo: {
          type: "string",
          description: "과제·목표·배경 (Markdown 가능)",
        },
        solutionKo: {
          type: "string",
          description: "매체·운영 전략 (Markdown 가능)",
        },
        resultsKo: {
          type: "array",
          items: { type: "string" },
          description: "성과 bullet 3–7",
        },
        industry: {
          type: "string",
          description: "업종 (한국어)",
        },
        metricsJson: {
          type: "object",
          additionalProperties: true,
          description: "노출·도달·CTR 등 (불확실하면 최소화)",
        },
        mediaUsed: {
          type: "array",
          items: { type: "string" },
          description: "사용 매체 목록 (사실 기반)",
        },
        periodStart: {
          type: "string",
          description: "YYYY-MM-DD 또는 빈 문자열",
        },
        periodEnd: {
          type: "string",
          description: "YYYY-MM-DD 또는 빈 문자열",
        },
        thumbnailUrl: { type: "string" },
        galleryUrls: { type: "array", items: { type: "string" } },
        testimonialKo: { type: "string" },
      },
      required: [
        "titleKo",
        "summaryKo",
        "challengeKo",
        "solutionKo",
        "resultsKo",
        "industry",
        "mediaUsed",
      ],
    },
  };
}

export type CampaignCompletionAiSections = {
  overviewKo: string;
  mediaDetailKo: string;
  performanceKo: string;
  aiInsightsKo: string;
};

function campaignCompletionReportTool(): Anthropic.Tool {
  return {
    name: CAMPAIGN_COMPLETION_TOOL,
    description:
      "Submit four Korean sections for a campaign completion PDF. Call exactly once.",
    input_schema: {
      type: "object",
      properties: {
        overviewKo: { type: "string", description: "캠페인 개요" },
        mediaDetailKo: { type: "string", description: "매체·집행 상세" },
        performanceKo: { type: "string", description: "성과 분석" },
        aiInsightsKo: { type: "string", description: "개선점·다음 캠페인 제안" },
      },
      required: [
        "overviewKo",
        "mediaDetailKo",
        "performanceKo",
        "aiInsightsKo",
      ],
    },
  };
}

function normalizeStringArray(v: unknown): string[] {
  if (!Array.isArray(v)) return [];
  return v.filter((x): x is string => typeof x === "string");
}

function toVerticalStrategiesJson(
  raw: unknown,
): Prisma.JsonValue | null {
  if (raw === undefined || raw === null) return null;
  if (Array.isArray(raw)) return raw as Prisma.JsonValue;
  return null;
}

function toQuizzesJson(
  raw: AcademyQuiz[] | null | undefined,
): Prisma.JsonValue | null {
  if (!raw || raw.length === 0) return null;
  return raw as Prisma.JsonValue;
}

function newRowTimestamps() {
  const now = new Date();
  return { createdAt: now, updatedAt: now };
}

function newId(): string {
  return crypto.randomUUID();
}

function parseOptionalIsoDate(value: unknown): Date | null {
  if (value == null) return null;
  const s = String(value).trim();
  if (!s) return null;
  if (!/^\d{4}-\d{2}-\d{2}/.test(s)) return null;
  const d = new Date(s.slice(0, 10));
  return Number.isNaN(d.getTime()) ? null : d;
}

function mergeMetricsJson(
  baseline: Record<string, unknown>,
  fromAi: unknown,
): Prisma.JsonValue | null {
  const extra =
    fromAi && typeof fromAi === "object" && !Array.isArray(fromAi)
      ? (fromAi as Record<string, unknown>)
      : {};
  const merged = { ...baseline, ...extra };
  if (Object.keys(merged).length === 0) return null;
  return merged as Prisma.JsonValue;
}

function successCaseFromToolInput(
  raw: SuccessCaseToolInput,
  opts: {
    campaignId: string | null;
    clientName: string;
    /** When set, overrides tool `industry` (manual 입력값 고정) */
    industryOverride?: string;
    metricsBaseline: Record<string, unknown>;
    /** When AI omits mediaUsed, fall back to these strings */
    fallbackMediaUsed?: string[];
  },
): SuccessCase {
  const aiMedia = normalizeStringArray(raw.mediaUsed);
  const fallback = opts.fallbackMediaUsed ?? [];
  const mediaUsed =
    aiMedia.length > 0 ? aiMedia : fallback.length > 0 ? fallback : [];

  const industry =
    opts.industryOverride?.trim() ||
    raw.industry?.trim() ||
    "미분류";

  return {
    id: newId(),
    campaignId: opts.campaignId,
    status: "draft",
    clientName: opts.clientName.trim(),
    industry,
    titleKo: raw.titleKo.trim(),
    titleEn: raw.titleEn?.trim() || null,
    summaryKo: raw.summaryKo.trim(),
    challengeKo: raw.challengeKo.trim(),
    solutionKo: raw.solutionKo.trim(),
    resultsKo: normalizeStringArray(raw.resultsKo),
    metricsJson: mergeMetricsJson(opts.metricsBaseline, raw.metricsJson ?? null),
    mediaUsed,
    mediaIds: [],
    periodStart: parseOptionalIsoDate(raw.periodStart),
    periodEnd: parseOptionalIsoDate(raw.periodEnd),
    thumbnailUrl: raw.thumbnailUrl?.trim() || null,
    galleryUrls: normalizeStringArray(raw.galleryUrls ?? []),
    testimonialKo: raw.testimonialKo?.trim() || null,
    publishedAt: null,
    ...newRowTimestamps(),
  };
}

function compactCampaignForAi(c: {
  id: string;
  name: string;
  clientCompany: string;
  clientName: string;
  status: string;
  budgetMin: number | null;
  budgetMax: number | null;
  startDate: Date | null;
  endDate: Date | null;
  notes: string | null;
  mediaBookings: Array<{
    title: string;
    startsAt: Date;
    endsAt: Date;
    status: string;
    media: { name: string; location: string; type: string } | null;
  }>;
  proofPhotos: Array<{ imageUrl: string; caption: string | null }>;
  scheduleEvents: Array<{
    title: string;
    startsAt: Date;
    endsAt: Date;
    kind: string;
  }>;
}) {
  return {
    id: c.id,
    name: c.name,
    clientCompany: c.clientCompany,
    clientName: c.clientName,
    status: c.status,
    budgetMin: c.budgetMin,
    budgetMax: c.budgetMax,
    startDate: c.startDate?.toISOString().slice(0, 10) ?? null,
    endDate: c.endDate?.toISOString().slice(0, 10) ?? null,
    notes: c.notes,
    mediaBookings: c.mediaBookings.map((b) => ({
      title: b.title,
      startsAt: b.startsAt.toISOString(),
      endsAt: b.endsAt.toISOString(),
      status: b.status,
      mediaName: b.media?.name ?? null,
      mediaLocation: b.media?.location ?? null,
      mediaType: b.media?.type ?? null,
    })),
    proofPhotos: c.proofPhotos.map((p) => ({
      imageUrl: p.imageUrl,
      caption: p.caption,
    })),
    scheduleEvents: c.scheduleEvents.map((e) => ({
      title: e.title,
      startsAt: e.startsAt.toISOString(),
      endsAt: e.endsAt.toISOString(),
      kind: e.kind,
    })),
  };
}

/**
 * Generates a draft trend report for the given month (YYYY-MM) using Claude 3.5 Sonnet.
 * The model must respond via structured tool input (JSON schema).
 *
 * Optional `context` (PR-2): 외부 웹 출처 + 자체 매체 DB 인사이트를
 * user 프롬프트에 주입해 LLM 내부 지식만으로 작성되는 환각·재탕을 줄임.
 * 빈 컨텍스트면 기존 동작 유지.
 */
export interface TrendReportGenerationContext {
  webSources?: Array<{
    title: string;
    url: string;
    snippet: string;
    domain: string;
    publishedAt?: string | null;
  }>;
  internalInsights?: Array<{ title: string; summary: string }>;
}

function buildContextSection(ctx?: TrendReportGenerationContext): string {
  if (!ctx) return "";
  const parts: string[] = [];
  if (ctx.webSources && ctx.webSources.length > 0) {
    const lines = ctx.webSources
      .slice(0, 8)
      .map(
        (s, i) =>
          `[${i + 1}] ${s.title} — ${s.snippet.slice(0, 280)} (출처: ${s.domain}${
            s.publishedAt ? `, ${s.publishedAt}` : ""
          })`,
      )
      .join("\n");
    parts.push(`Reference web sources (cite by [n]):\n${lines}`);
  }
  if (ctx.internalInsights && ctx.internalInsights.length > 0) {
    const lines = ctx.internalInsights
      .map((i) => `- ${i.title}: ${i.summary}`)
      .join("\n");
    parts.push(`THINKAD internal data (use to differentiate):\n${lines}`);
  }
  return parts.length > 0 ? `\n\n${parts.join("\n\n")}` : "";
}

export async function generateTrendReport(
  month: string,
  context?: TrendReportGenerationContext,
): Promise<TrendReport> {
  assertMonthFormat(month);
  const model = resolveModel();
  const client = getAnthropicClient();

  const system = withOohExpertContext(trendAnalystSystemOverlay(month));

  const baseUser = `Call emit_trend_report once with every required field for month ${month}.
- titleKo and optional titleEn
- contentKo: long-form Markdown (snapshot, market, DOOH, outlook)
- summaryKo: 3–6 bullets; marketTrendKo and doohTrendKo: 3–5 bullets each
- verticalStrategies: 3–5 verticals (fashion, auto, F&B, etc.) with labelKo, labelEn, bulletsKo, bulletsEn
- optional thumbnailUrl (omit or null if none)`;
  const user = `${baseUser}${buildContextSection(context)}`;

  const promptStored = `SYSTEM:\n${system}\n\nUSER:\n${user}`;

  try {
    const message = await client.messages.create({
      model,
      max_tokens: 16384,
      system,
      tools: [trendReportTool()],
      tool_choice: { type: "tool", name: TREND_TOOL },
      messages: [{ role: "user", content: user }],
    });

    const raw = extractToolInput<TrendReportToolInput>(message, TREND_TOOL);
    const verticalStrategies = toVerticalStrategiesJson(raw.verticalStrategies);

    const row: TrendReport = {
      id: newId(),
      month,
      slug: null,
      status: "draft",
      titleKo: raw.titleKo.trim(),
      titleEn: raw.titleEn?.trim() || null,
      contentKo: raw.contentKo.trim(),
      summaryKo: normalizeStringArray(raw.summaryKo),
      marketTrendKo: normalizeStringArray(raw.marketTrendKo),
      doohTrendKo: normalizeStringArray(raw.doohTrendKo),
      verticalStrategies,
      thumbnailUrl: raw.thumbnailUrl?.trim() || null,
      publishedAt: null,
      generationMethod: "manual",
      aiModel: model,
      sources: (context?.webSources ?? []) as unknown as TrendReport["sources"],
      internalDataUsed: (context?.internalInsights ?? []).map((i) => i.title),
      validationScore: null,
      validationResult: null,
      metaDescription: null,
      tags: [],
      scheduledAt: null,
      ...newRowTimestamps(),
    };

    await appendGenerationLog({
      type: "trend_report",
      prompt: promptStored,
      response: JSON.stringify(raw),
      model,
      tokensUsed: usageTotal(message),
      status: "success",
    });

    return row;
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    await appendGenerationLog({
      type: "trend_report",
      prompt: promptStored,
      model,
      status: "error",
      errorMsg: msg,
    });
    throw e;
  }
}

/**
 * Generates a draft academy lesson from course and lesson titles.
 * courseId is derived from courseTitle (slug); order defaults to 0.
 */
export async function generateAcademyLesson(
  courseTitle: string,
  lessonTitle: string,
): Promise<AcademyLesson> {
  const model = resolveModel();
  const client = getAnthropicClient();
  const courseId = courseIdFromTitle(courseTitle);

  const system = withOohExpertContext(ACADEMY_LESSON_SYSTEM_PROMPT);
  const user = buildAcademyLessonUserPrompt(courseTitle, lessonTitle);

  const promptStored = `SYSTEM:\n${system}\n\nUSER:\n${user}`;

  try {
    const message = await client.messages.create({
      model,
      max_tokens: 16384,
      system,
      tools: [academyLessonTool()],
      tool_choice: { type: "tool", name: ACADEMY_TOOL },
      messages: [{ role: "user", content: user }],
    });

    const raw = extractToolInput<AcademyLessonToolInput>(message, ACADEMY_TOOL);
    const durationMin =
      typeof raw.durationMin === "number" && Number.isFinite(raw.durationMin)
        ? Math.max(5, Math.round(raw.durationMin))
        : 15;

    const row: AcademyLesson = {
      id: newId(),
      courseId,
      order: 0,
      status: "draft",
      titleKo: raw.titleKo.trim(),
      titleEn: raw.titleEn?.trim() || null,
      descriptionKo: raw.descriptionKo.trim(),
      objectivesKo: normalizeStringArray(raw.objectivesKo),
      chapters: raw.chapters as unknown as Prisma.JsonValue,
      quizzes: toQuizzesJson(raw.quizzes ?? null),
      durationMin,
      thumbnailUrl: raw.thumbnailUrl?.trim() || null,
      publishedAt: null,
      ...newRowTimestamps(),
    };

    await appendGenerationLog({
      type: "academy_lesson",
      prompt: promptStored,
      response: JSON.stringify(raw),
      model,
      tokensUsed: usageTotal(message),
      status: "success",
    });

    return row;
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    await appendGenerationLog({
      type: "academy_lesson",
      prompt: promptStored,
      model,
      status: "error",
      errorMsg: msg,
    });
    throw e;
  }
}

/**
 * 성공사례 초안 생성 (캠페인 미연동). `metrics`는 metricsJson 병합의 베이스라인으로 쓰입니다.
 */
export async function generateSuccessCase(
  clientName: string,
  industry: string,
  mediaUsed: string[],
  metrics: Record<string, unknown>,
): Promise<SuccessCase> {
  const model = resolveModel();
  const client = getAnthropicClient();
  const system = withOohExpertContext(SUCCESS_CASE_TASK_GUIDANCE);
  const metricsBaseline: Record<string, unknown> = {
    source: "manual_input",
    ...metrics,
  };

  const user = `emit_success_case 도구를 **한 번만** 호출하세요.

- **clientName** (표기): ${clientName.trim()}
- **industry** 필드는 반드시 다음 문자열과 동일하게: ${industry.trim()}
- **mediaUsed**: 아래 목록의 매체를 빠짐없이 포함(표기만 다듬기 가능):
${JSON.stringify(mediaUsed, null, 2)}
- **metricsJson** 초기값으로 아래를 병합하되, 검증 없는 수치는 단정하지 마세요:
${JSON.stringify(metrics, null, 2)}`;

  const promptStored = `SYSTEM:\n${system}\n\nUSER:\n${user}`;

  try {
    const message = await client.messages.create({
      model,
      max_tokens: 8192,
      system,
      tools: [successCaseTool()],
      tool_choice: { type: "tool", name: SUCCESS_CASE_TOOL },
      messages: [{ role: "user", content: user }],
    });

    const raw = extractToolInput<SuccessCaseToolInput>(
      message,
      SUCCESS_CASE_TOOL,
    );
    const row = successCaseFromToolInput(raw, {
      campaignId: null,
      clientName: clientName.trim(),
      industryOverride: industry.trim(),
      metricsBaseline,
      fallbackMediaUsed: mediaUsed,
    });

    await appendGenerationLog({
      type: "success_case",
      prompt: promptStored,
      response: JSON.stringify(raw),
      model,
      tokensUsed: usageTotal(message),
      status: "success",
    });

    return row;
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    await appendGenerationLog({
      type: "success_case",
      prompt: promptStored,
      model,
      status: "error",
      errorMsg: msg,
    });
    throw e;
  }
}

/**
 * 캠페인 완료(또는 정리) 시 CRM 스냅샷으로 성공사례 초안 생성. DB에 `campaignId`가 연결된 행으로 저장 가능.
 */
export async function generateCampaignReport(
  campaignId: string,
): Promise<SuccessCase> {
  if (!isDatabaseConfigured()) {
    throw new Error(
      "DATABASE_URL is required for generateCampaignReport.",
    );
  }

  const db = getPrisma();
  const campaign = await db.campaign.findUnique({
    where: { id: campaignId },
    include: {
      mediaBookings: { include: { media: true } },
      proofPhotos: { orderBy: { createdAt: "desc" }, take: 24 },
      scheduleEvents: { orderBy: { startsAt: "asc" }, take: 40 },
    },
  });

  if (!campaign) {
    throw new Error(`Campaign not found: ${campaignId}`);
  }

  const snapshot = compactCampaignForAi(campaign);
  let json = JSON.stringify(snapshot, null, 2);
  if (json.length > 120_000) {
    json = `${json.slice(0, 120_000)}\n/* …truncated… */`;
  }

  const metricsBaseline: Record<string, unknown> = {
    source: "campaign_crm",
    campaignId: campaign.id,
    campaignStatus: campaign.status,
    budgetMin: campaign.budgetMin,
    budgetMax: campaign.budgetMax,
  };

  const fallbackMedia = campaign.mediaBookings.map((b) =>
    b.media
      ? `${b.media.name} · ${b.media.location} (${b.media.type})`
      : b.title,
  );

  const clientLabel =
    campaign.clientCompany?.trim() ||
    campaign.clientName?.trim() ||
    "클라이언트";

  const model = resolveModel();
  const client = getAnthropicClient();
  const system = withOohExpertContext(CAMPAIGN_REPORT_TASK_GUIDANCE);
  const user = `연결 campaignId: ${campaignId}

광고주 표기용 clientName: ${clientLabel}

## CRM 스냅샷 (JSON)
\`\`\`json
${json}
\`\`\`

요구사항:
- **mediaUsed**는 예약/송출 스냅샷에서 추출
- **galleryUrls**에 증빙 사진 URL을 넣을 수 있으면 포함
- **industry**는 스냅샷 맥락에서 추정 (불확실하면 "종합" 또는 넓은 업종)
- emit_success_case 를 한 번만 호출`;

  const promptStored = `SYSTEM:\n${system}\n\nUSER:\n${user}`;

  try {
    const message = await client.messages.create({
      model,
      max_tokens: 8192,
      system,
      tools: [successCaseTool()],
      tool_choice: { type: "tool", name: SUCCESS_CASE_TOOL },
      messages: [{ role: "user", content: user }],
    });

    const raw = extractToolInput<SuccessCaseToolInput>(
      message,
      SUCCESS_CASE_TOOL,
    );
    const row = successCaseFromToolInput(raw, {
      campaignId,
      clientName: clientLabel,
      metricsBaseline,
      fallbackMediaUsed: fallbackMedia,
    });

    await appendGenerationLog({
      type: "campaign_report",
      targetId: campaignId,
      prompt: promptStored,
      response: JSON.stringify(raw),
      model,
      tokensUsed: usageTotal(message),
      status: "success",
    });

    return row;
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    await appendGenerationLog({
      type: "campaign_report",
      targetId: campaignId,
      prompt: promptStored,
      model,
      status: "error",
      errorMsg: msg,
    });
    throw e;
  }
}

/**
 * 캠페인 완료 PDF용 AI 본문 4섹션 (개요·매체·성과·인사이트).
 */
export async function generateCampaignCompletionReportSections(
  campaignId: string,
): Promise<CampaignCompletionAiSections> {
  if (!isDatabaseConfigured()) {
    throw new Error(
      "DATABASE_URL is required for generateCampaignCompletionReportSections.",
    );
  }

  const db = getPrisma();
  const campaign = await db.campaign.findUnique({
    where: { id: campaignId },
    include: {
      mediaBookings: { include: { media: true } },
      proofPhotos: { orderBy: { createdAt: "desc" }, take: 24 },
      scheduleEvents: { orderBy: { startsAt: "asc" }, take: 40 },
      financialDocs: { orderBy: { createdAt: "desc" }, take: 20 },
    },
  });

  if (!campaign) {
    throw new Error(`Campaign not found: ${campaignId}`);
  }

  const snapshot = {
    ...compactCampaignForAi(campaign),
    financialDocsSummary: campaign.financialDocs.map((d) => ({
      kind: d.kind,
      title: d.title,
      status: d.status,
      amountKrw: d.amountKrw,
    })),
  };
  let json = JSON.stringify(snapshot, null, 2);
  if (json.length > 120_000) {
    json = `${json.slice(0, 120_000)}\n/* …truncated… */`;
  }

  const model = resolveModel();
  const client = getAnthropicClient();
  const system = withOohExpertContext(CAMPAIGN_COMPLETION_PDF_GUIDANCE);
  const user = `campaignId: ${campaignId}

아래 JSON은 CRM에서 추출한 캠페인 스냅샷입니다. 네 개 필드를 모두 채워 \`${CAMPAIGN_COMPLETION_TOOL}\` 를 한 번만 호출하세요.

\`\`\`json
${json}
\`\`\``;

  const promptStored = `SYSTEM:\n${system}\n\nUSER:\n${user}`;

  try {
    const message = await client.messages.create({
      model,
      max_tokens: 8192,
      system,
      tools: [campaignCompletionReportTool()],
      tool_choice: { type: "tool", name: CAMPAIGN_COMPLETION_TOOL },
      messages: [{ role: "user", content: user }],
    });

    const raw = extractToolInput<CampaignCompletionAiSections>(
      message,
      CAMPAIGN_COMPLETION_TOOL,
    );

    await appendGenerationLog({
      type: "campaign_completion_pdf",
      targetId: campaignId,
      prompt: promptStored,
      response: JSON.stringify(raw),
      model,
      tokensUsed: usageTotal(message),
      status: "success",
    });

    return {
      overviewKo: String(raw.overviewKo ?? "").trim(),
      mediaDetailKo: String(raw.mediaDetailKo ?? "").trim(),
      performanceKo: String(raw.performanceKo ?? "").trim(),
      aiInsightsKo: String(raw.aiInsightsKo ?? "").trim(),
    };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    await appendGenerationLog({
      type: "campaign_completion_pdf",
      targetId: campaignId,
      prompt: promptStored,
      model,
      status: "error",
      errorMsg: msg,
    });
    throw e;
  }
}
