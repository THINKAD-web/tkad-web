import { NextRequest } from "next/server";
import { assertAdminDb, json } from "@/lib/admin-guard";
import { getPrisma } from "@/lib/prisma";
import type { MediaReviewStatus } from "@prisma/client";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const deny = assertAdminDb(request);
  if (deny) return deny;

  const { searchParams } = new URL(request.url);
  const status = searchParams.get("status") as MediaReviewStatus | "all" | null;
  const page = Math.max(1, Number(searchParams.get("page") ?? "1") || 1);
  const pageSize = Math.min(
    50,
    Math.max(10, Number(searchParams.get("pageSize") ?? "20") || 20),
  );

  const db = getPrisma();
  const where =
    status && status !== "all" ? { status } : undefined;

  const [total, pendingCount, items] = await Promise.all([
    db.mediaReview.count({ where }),
    db.mediaReview.count({ where: { status: "PENDING" } }),
    db.mediaReview.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: {
        media: { select: { id: true, name: true } },
        user: { select: { id: true, name: true, email: true, company: true } },
      },
    }),
  ]);

  return json({
    items: items.map((r) => ({
      id: r.id,
      mediaId: r.mediaId,
      mediaName: r.media.name,
      userId: r.userId,
      userName: r.user.name,
      userEmail: r.user.email,
      userCompany: r.user.company,
      rating: r.rating,
      title: r.title,
      body: r.body,
      campaignPeriod: r.campaignPeriod,
      industry: r.industry,
      isVerified: r.isVerified,
      helpfulCount: r.helpfulCount,
      status: r.status,
      createdAt: r.createdAt.toISOString(),
    })),
    total,
    pendingCount,
    page,
    pageSize,
  });
}
