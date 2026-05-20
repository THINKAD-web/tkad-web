import { NextRequest } from "next/server";
import { apiOk, apiError } from "@/lib/api-response";
import { getCurrentUser } from "@/lib/user-session";
import { submitMediaOwnerReview } from "@/lib/media-owner-ratings";
import { isDatabaseConfigured } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  if (!isDatabaseConfigured()) return apiError("SERVICE_UNAVAILABLE", 503);

  const user = await getCurrentUser();
  if (!user) return apiError("UNAUTHORIZED", 401);

  let body: {
    ownerUserId?: string;
    campaignId?: string;
    oohQuoteId?: string;
    responseSpeed?: number;
    materialAccuracy?: number;
    executionQuality?: number;
    proofPhotoProvided?: number;
    comment?: string;
  };
  try {
    body = await request.json();
  } catch {
    return apiError("INVALID_JSON", 400);
  }

  if (!body.ownerUserId) {
    return apiError("VALIDATION", 400, { message: "ownerUserId required" });
  }

  const scores = [
    body.responseSpeed,
    body.materialAccuracy,
    body.executionQuality,
    body.proofPhotoProvided,
  ];
  if (scores.some((s) => s == null || !Number.isFinite(Number(s)))) {
    return apiError("VALIDATION", 400, { message: "All scores 1-5 required" });
  }

  const result = await submitMediaOwnerReview({
    ownerUserId: body.ownerUserId,
    reviewerUserId: user.id,
    campaignId: body.campaignId,
    oohQuoteId: body.oohQuoteId,
    responseSpeed: Number(body.responseSpeed),
    materialAccuracy: Number(body.materialAccuracy),
    executionQuality: Number(body.executionQuality),
    proofPhotoProvided: Number(body.proofPhotoProvided),
    comment: body.comment,
  });

  if (!result) return apiError("FAILED", 500);
  return apiOk(result);
}
