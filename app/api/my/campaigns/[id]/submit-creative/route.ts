import { z } from "zod";
import {
  apiError,
  apiOk,
  apiServerError,
  apiZodError,
  readJson,
} from "@/lib/api-response";
import { getCurrentUser } from "@/lib/user-session";
import { getPrisma, isDatabaseConfigured } from "@/lib/prisma";
import { submitCampaignCreative } from "@/lib/campaign-creative-submit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const Body = z.object({
  creativeId: z.string().min(1),
  mediaId: z.string().optional(),
  locale: z.string().max(8).optional(),
});

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const user = await getCurrentUser();
    if (!user) return apiError("UNAUTHORIZED", 401);

    if (!isDatabaseConfigured()) {
      return apiError("SERVICE_UNAVAILABLE", 503);
    }

    const { id: campaignId } = await params;
    const body = await readJson(req);
    if (!body) return apiError("INVALID_JSON", 400);
    const parsed = Body.safeParse(body);
    if (!parsed.success) return apiZodError(parsed.error);

    const db = getPrisma();
    const result = await submitCampaignCreative(db, {
      campaignId,
      creativeId: parsed.data.creativeId,
      userId: user.id,
      mediaId: parsed.data.mediaId,
      locale: parsed.data.locale,
    });

    return apiOk(result);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "";
    if (msg === "CAMPAIGN_NOT_FOUND") {
      return apiError("NOT_FOUND", 404);
    }
    if (msg === "CREATIVE_NOT_FOUND") {
      return apiError("NOT_FOUND", 404, { message: "소재를 찾을 수 없습니다." });
    }
    return apiServerError(e, "campaign/submit-creative");
  }
}
