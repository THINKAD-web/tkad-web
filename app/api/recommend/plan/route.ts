import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { fetchPublicMediaCatalog } from "@/lib/public-media-catalog";
import { generateCampaignProposal } from "@/lib/proposal/generate-proposal";
import { proposalInputSchema } from "@/lib/proposal/types";
import { recommendInputSchema } from "@/lib/schemas/recommend";
import { buildPlanProposalInput } from "@/lib/recommend-plan-input";
import { getCurrentUser } from "@/lib/user-session";
import {
  resolveIsPro,
  enforceAiPlanRateLimit,
} from "@/lib/ai-rate-limit";
import type { AiRecommendInput } from "@/lib/ai-media-recommend";

/**
 * AI 플래너 2단계 — 추천 결과 + 파싱 브리프로 실제 집행 플랜(예산배분·일정·근거) 생성.
 *
 * - PRO 전용(하드 게이트). 비PRO 는 Sonnet 호출 전에 403.
 * - Sonnet 비용이 커 추천(Haiku)과 **분리된 별도 쿼터**(PRO 일 5회) 적용 — enforceAiPlanRateLimit.
 * - generateCampaignProposal(기존)·매체 카탈로그·proposalInputSchema 재사용. 신규는 입력 빌더뿐.
 */
export const dynamic = "force-dynamic";

function json(body: unknown, init?: ResponseInit) {
  return NextResponse.json(body, {
    ...init,
    headers: { "Cache-Control": "no-store, private" },
  });
}

const planBodySchema = z.object({
  brief: recommendInputSchema,
  mediaIds: z.array(z.string().min(1)).min(1).max(20),
  fields: z.object({
    brandName: z.string().max(120).default(""),
    campaignName: z.string().max(160).default(""),
    startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  }),
  locale: z.enum(["ko", "en"]).optional().default("ko"),
});

export async function POST(request: NextRequest) {
  const user = await getCurrentUser().catch(() => null);
  const userId = user?.id ?? null;

  // 1) PRO 하드 게이트
  const pro = await resolveIsPro(userId);
  if (!pro) {
    return json(
      {
        ok: false,
        error: "pro_required",
        message: "AI 플랜 생성은 PRO 전용 기능입니다.",
      },
      { status: 403 },
    );
  }

  // 2) Sonnet 전용 별도 쿼터(PRO 일 5회) — 추천 쿼터와 분리
  const rl = await enforceAiPlanRateLimit(request, userId, true);
  if (!rl.allowed) {
    return json(
      {
        ok: false,
        rateLimited: true,
        reason: rl.reason,
        remaining: 0,
        limit: rl.limit,
        message:
          rl.reason === "abuse"
            ? "잠시 후 다시 시도해주세요."
            : `오늘 생성 가능한 플랜을 모두 사용했어요 (0/${rl.limit}). 내일 다시 이용하실 수 있습니다.`,
      },
      { status: 429 },
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return json({ ok: false, error: "invalid_json" }, { status: 400 });
  }
  const parsed = planBodySchema.safeParse(body);
  if (!parsed.success) {
    return json(
      { ok: false, error: "invalid_payload", issues: parsed.error.flatten() },
      { status: 400 },
    );
  }
  const { brief, mediaIds, fields, locale } = parsed.data;

  if (new Date(fields.endDate) < new Date(fields.startDate)) {
    return json(
      { ok: false, error: "bad_dates", message: "종료일은 시작일 이후여야 합니다." },
      { status: 400 },
    );
  }

  // 브리프 → ProposalInput (규칙 기반, 추가 LLM 호출 없음)
  const input = buildPlanProposalInput(
    brief as AiRecommendInput,
    mediaIds,
    fields,
    locale,
  );
  const inputCheck = proposalInputSchema.safeParse(input);
  if (!inputCheck.success) {
    return json(
      { ok: false, error: "invalid_input", issues: inputCheck.error.flatten() },
      { status: 400 },
    );
  }

  // 매체 매핑 (네트워크는 v1 추천 단계에서 제외되므로 방어적으로 한 번 더 제외)
  const catalog = await fetchPublicMediaCatalog();
  const byId = new Map(catalog.map((m) => [m.id, m]));
  const selectedMedia = inputCheck.data.mediaIds
    .map((id) => byId.get(id))
    .filter(
      (m): m is NonNullable<typeof m> =>
        !!m && m.catalogSource !== "network" && m.type !== "network",
    );
  if (selectedMedia.length === 0) {
    return json(
      { ok: false, error: "no_valid_media", message: "유효한 매체가 없습니다." },
      { status: 400 },
    );
  }

  try {
    const proposal = await generateCampaignProposal(inputCheck.data, selectedMedia);
    return json({
      ok: true,
      proposal,
      input: inputCheck.data,
      remaining: rl.remaining,
      limit: rl.limit,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("[api/recommend/plan]", msg);
    return json(
      { ok: false, error: "generate_failed", message: "플랜 생성에 실패했습니다. 잠시 후 다시 시도해주세요." },
      { status: 500 },
    );
  }
}
