import { NextRequest } from "next/server";
import { OoHQuoteStatus } from "@prisma/client";
import { assertAdminDb, json } from "@/lib/admin-guard";
import { getPrisma } from "@/lib/prisma";
import { serializeOoHQuotePublic } from "@/lib/ooh-quote";

export const dynamic = "force-dynamic";

const STATUSES = new Set(Object.values(OoHQuoteStatus));

export async function GET(request: NextRequest) {
  const deny = assertAdminDb(request);
  if (deny) return deny;

  const { searchParams } = new URL(request.url);
  const statusRaw = searchParams.get("status")?.trim() ?? "";
  const take = Math.min(Number(searchParams.get("take") ?? 100) || 100, 200);

  const db = getPrisma();
  const where =
    statusRaw && statusRaw !== "all" && STATUSES.has(statusRaw as OoHQuoteStatus)
      ? { status: statusRaw as OoHQuoteStatus }
      : {};

  const rows = await db.ooHQuote.findMany({
    where,
    orderBy: { updatedAt: "desc" },
    take,
  });

  return json({
    quotes: rows.map((r: (typeof rows)[number]) => ({
      ...serializeOoHQuotePublic(r),
      clientEmail: r.clientEmail,
      clientPhone: r.clientPhone,
      adminNote: r.adminNote,
      quotePdfSentAt: r.quotePdfSentAt?.toISOString() ?? null,
      paymentAmount: r.paymentAmount,
      cancelReason: r.cancelReason,
      campaignId: r.campaignId,
      updatedAt: r.updatedAt.toISOString(),
      // PR-9 — 마법사 확장 필드 노출 (admin 목록 + 상세 모두)
      quoteNumber: r.quoteNumber,
      customerBusinessNumber: r.customerBusinessNumber,
      customerAddress: r.customerAddress,
      customerPosition: r.customerPosition,
      customerMessage: r.customerMessage,
      creativeMode: r.creativeMode,
      creativeAssets: r.creativeAssets,
      compositeLogoUrl: r.compositeLogoUrl,
      designBrief: r.designBrief,
      needsDesignService: r.needsDesignService,
      timeSlot: r.timeSlot,
      expiresAt: r.expiresAt?.toISOString() ?? null,
      quoteSource: r.quoteSource,
      quoteSourceId: r.quoteSourceId,
    })),
  });
}
