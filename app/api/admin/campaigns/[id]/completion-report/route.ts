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
  });

  const filename = `completion-${c.id.slice(0, 12)}.pdf`;
  return new Response(new Uint8Array(buf), {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename*=UTF-8''${encodeURIComponent(filename)}`,
      "Cache-Control": "no-store",
    },
  });
}
