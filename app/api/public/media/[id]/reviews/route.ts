import { NextRequest, NextResponse } from "next/server";
import {
  getMediaReviewStats,
  listApprovedMediaReviews,
  reviewAuthorLabel,
} from "@/lib/media-reviews";
import { getCurrentUser } from "@/lib/user-session";

export const dynamic = "force-dynamic";

function json(body: unknown, init?: ResponseInit) {
  const headers = new Headers(init?.headers);
  headers.set("Cache-Control", "no-store, private");
  return NextResponse.json(body, { ...init, headers });
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id: mediaId } = await params;
  const { searchParams } = new URL(request.url);
  const limit = Math.min(
    50,
    Math.max(1, Number(searchParams.get("limit") ?? "10") || 10),
  );
  const offset = Math.max(0, Number(searchParams.get("offset") ?? "0") || 0);
  const locale = searchParams.get("locale") === "en" ? "en" : "ko";
  const isKo = locale === "ko";

  const user = await getCurrentUser();
  const [stats, { items, total }] = await Promise.all([
    getMediaReviewStats(mediaId),
    listApprovedMediaReviews(mediaId, {
      viewerUserId: user?.id ?? null,
      limit,
      offset,
    }),
  ]);

  const localizedItems = items.map((item) => ({
    ...item,
    authorLabel: reviewAuthorLabel(item.industry, isKo),
  }));

  return json({
    stats,
    items: localizedItems,
    total,
    hasMore: offset + items.length < total,
  });
}
