import { NextRequest } from "next/server";
import { assertAdminDb } from "@/lib/admin-guard";
import { campaignCompletionPdfToBuffer } from "@/lib/build-campaign-completion-pdf";
import { getPrisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string }> };

export async function GET(request: NextRequest, { params }: Params) {
  const deny = assertAdminDb(request);
  if (deny) return deny;
  const { id } = await params;
  const db = getPrisma();
  const c = await db.campaign.findUnique({
    where: { id },
    include: {
      scheduleEvents: { orderBy: { startsAt: "asc" } },
      proofPhotos: { orderBy: { createdAt: "asc" } },
      financialDocs: { orderBy: { createdAt: "asc" } },
      mediaBookings: { include: { media: true } },
    },
  });
  if (!c) {
    return new Response("Not found", { status: 404 });
  }

  const buf = await campaignCompletionPdfToBuffer({
    campaignName: c.name,
    clientCompany: c.clientCompany,
    clientName: c.clientName,
    clientEmail: c.clientEmail,
    status: c.status,
    notes: c.notes,
    startDate: c.startDate ?? null,
    endDate: c.endDate ?? null,
    scheduleEvents: c.scheduleEvents.map((e) => ({
      title: e.title,
      startsAt: e.startsAt,
      endsAt: e.endsAt,
      kind: e.kind,
    })),
    proofPhotos: c.proofPhotos.map((p) => ({
      imageUrl: p.imageUrl,
      caption: p.caption,
    })),
    financialDocs: c.financialDocs.map((d) => ({
      kind: d.kind,
      title: d.title,
      amountKrw: d.amountKrw,
      status: d.status,
    })),
    mediaBookings: c.mediaBookings.map((b) => ({
      title: b.title,
      mediaName: b.media?.name ?? "—",
      location: b.media?.location ?? "—",
      type: b.media?.type ?? "—",
      startsAt: b.startsAt,
      endsAt: b.endsAt,
      status: b.status,
      dailyFootTraffic: b.media?.dailyFootfall ?? null,
      region: b.media?.region ?? null,
    })),
  });

  const filename = buildClientReportFilename(c.clientCompany);
  return new Response(new Uint8Array(buf), {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${asciiFallbackFilename(c.id)}"; filename*=UTF-8''${encodeURIComponent(filename)}`,
      "Cache-Control": "no-store",
    },
  });
}

/**
 * #5 PDF 파일명 자동 생성:
 *   "[클라이언트명]_THINKAD_옥외광고_성과보고서_YYYYMM.pdf"
 *
 * 클라이언트명이 비어있으면 "클라이언트미지정" 으로 fallback.
 * 파일명 금지 문자(\\/:*?"<>|)는 제거. 공백은 _ 로.
 */
function buildClientReportFilename(clientCompany: string | null | undefined): string {
  const raw = (clientCompany ?? "").trim() || "클라이언트미지정";
  const safe = raw.replace(/[\\/:*?"<>|]/g, "").replace(/\s+/g, "_");
  const now = new Date();
  const yyyymm = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}`;
  return `${safe}_THINKAD_옥외광고_성과보고서_${yyyymm}.pdf`;
}

/** 한글 파싱 못 하는 클라이언트용 ASCII fallback (Content-Disposition 의 filename=). */
function asciiFallbackFilename(campaignId: string): string {
  const now = new Date();
  const yyyymm = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}`;
  return `THINKAD-OOH-Report-${campaignId.slice(0, 8)}-${yyyymm}.pdf`;
}
