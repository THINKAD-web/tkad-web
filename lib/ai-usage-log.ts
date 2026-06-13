import { getPrisma, isDatabaseConfigured } from "@/lib/prisma";

/** AI 호출 사용량 기록 — GenerationLog(generation_logs) 재사용. 실패해도 호출 흐름 방해 안 함. */
export async function logAiUsage(entry: {
  /** 기능 식별자 (예: recommendation, chat_reply, creative_review) */
  type: string;
  model: string;
  tokensUsed?: number | null;
  status?: string;
  /** 짧은 라벨(프롬프트 컬럼이 NOT NULL) */
  note?: string;
  targetId?: string | null;
}): Promise<void> {
  if (!isDatabaseConfigured()) return;
  try {
    await getPrisma().generationLog.create({
      data: {
        type: entry.type,
        model: entry.model,
        tokensUsed: entry.tokensUsed ?? null,
        status: entry.status ?? "success",
        prompt: (entry.note ?? entry.type).slice(0, 500),
        response: null,
        targetId: entry.targetId ?? null,
      },
    });
  } catch (e) {
    console.error("[ai-usage-log]", e instanceof Error ? e.message : e);
  }
}

/**
 * AI 호출 통합 사용량 기록 — AiUsageLog(ai_usage_logs). 입력/출력 토큰 분리.
 * 비차단: 실패해도 호출 흐름에 영향 없음.
 */
export async function recordAiUsage(entry: {
  /** chatbot | recommendation | content | creative_review | chat_reply */
  feature: string;
  model: string;
  inputTokens?: number | null;
  outputTokens?: number | null;
  userId?: string | null;
}): Promise<void> {
  if (!isDatabaseConfigured()) return;
  try {
    await getPrisma().aiUsageLog.create({
      data: {
        feature: entry.feature,
        model: entry.model,
        inputTokens: Math.max(0, Math.round(entry.inputTokens ?? 0)),
        outputTokens: Math.max(0, Math.round(entry.outputTokens ?? 0)),
        userId: entry.userId ?? null,
      },
    });
  } catch (e) {
    console.error("[ai-usage]", e instanceof Error ? e.message : e);
  }
}
