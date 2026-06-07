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
