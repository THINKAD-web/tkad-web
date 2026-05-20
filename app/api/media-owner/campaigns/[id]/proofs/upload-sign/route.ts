import { NextResponse } from "next/server";
import { signUploadParams } from "@/lib/cloudinary-sign";
import { apiError } from "@/lib/api-response";
import {
  assertOwnsMedia,
  requireMediaOwner,
} from "@/lib/media-owner-guard";
import { getPrisma } from "@/lib/prisma";
import { getOwnedMediaIds } from "@/lib/media-owner-guard";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const FOLDER = "tkad/media-owner/proofs";

type Params = { params: Promise<{ id: string }> };

export async function POST(_request: Request, { params }: Params) {
  const auth = await requireMediaOwner();
  if (!auth.ok) return auth.response;

  const { id: campaignId } = await params;
  const db = getPrisma();
  const mediaIds = await getOwnedMediaIds(auth.user.id);
  if (mediaIds.length === 0) {
    return apiError("FORBIDDEN", 403);
  }

  const linked = await db.mediaBooking.findFirst({
    where: {
      campaignId,
      mediaId: { in: mediaIds },
      status: { in: ["tentative", "confirmed"] },
    },
    select: { mediaId: true },
  });
  if (!linked || !(await assertOwnsMedia(auth.user.id, linked.mediaId))) {
    return apiError("FORBIDDEN", 403);
  }

  const signed = signUploadParams(FOLDER);
  if (!signed) {
    return NextResponse.json(
      { error: "Cloudinary가 설정되지 않았습니다." },
      { status: 503 },
    );
  }
  return NextResponse.json(signed);
}
