import { NextRequest } from "next/server";
import { requireMediaOwner, assertOwnsMedia } from "@/lib/media-owner-guard";
import { getPrisma } from "@/lib/prisma";
import {
  generateMediaQrDataUrl,
  buildAdvertiserProposalEmail,
  defaultProposalHighlights,
} from "@/lib/media-owner-sales-kit";
import { apiOk, apiError } from "@/lib/api-response";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const auth = await requireMediaOwner();
  if (!auth.ok) return auth.response;

  const mediaId = request.nextUrl.searchParams.get("mediaId")?.trim();
  if (!mediaId) return apiError("INVALID_REQUEST", 400, { message: "mediaId required" });

  const owns = await assertOwnsMedia(auth.user.id, mediaId);
  if (!owns) return apiError("FORBIDDEN", 403);

  const qrDataUrl = await generateMediaQrDataUrl(mediaId);
  return apiOk({ qrDataUrl, mediaUrl: `/media/${mediaId}` });
}

export async function POST(request: NextRequest) {
  const auth = await requireMediaOwner();
  if (!auth.ok) return auth.response;

  let body: { mediaId?: string };
  try {
    body = await request.json();
  } catch {
    return apiError("INVALID_JSON", 400);
  }

  const mediaId = body.mediaId?.trim();
  if (!mediaId) return apiError("INVALID_REQUEST", 400);

  const owns = await assertOwnsMedia(auth.user.id, mediaId);
  if (!owns) return apiError("FORBIDDEN", 403);

  const db = getPrisma();
  const [media, branding, user] = await Promise.all([
    db.media.findUnique({
      where: { id: mediaId },
      select: { name: true, location: true, region: true, type: true, dailyFootfall: true },
    }),
    db.mediaOwnerBranding.findUnique({ where: { ownerUserId: auth.user.id } }),
    db.user.findUnique({
      where: { id: auth.user.id },
      select: { name: true, email: true, phone: true, company: true },
    }),
  ]);

  if (!media) return apiError("NOT_FOUND", 404);

  const template = buildAdvertiserProposalEmail({
    mediaName: media.name,
    location: media.location,
    companyName: branding?.companyName ?? user?.company ?? "매체사",
    contactName: user?.name ?? "담당자",
    contactEmail: branding?.contactEmail ?? user?.email ?? "",
    contactPhone: branding?.contactPhone ?? user?.phone ?? undefined,
    highlights: defaultProposalHighlights(media),
  });

  return apiOk({ template });
}
