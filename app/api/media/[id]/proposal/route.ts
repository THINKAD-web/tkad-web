import { NextRequest, NextResponse } from "next/server";
import { getPrisma, isDatabaseConfigured } from "@/lib/prisma";
import { prismaMediaToMediaItem } from "@/lib/public-media-catalog";
import { publicActiveMediaWhere } from "@/lib/media-review-status";
import { generateMediaProposalPdf } from "@/lib/generate-media-proposal";
import { mediaProposalDownloadFilename } from "@/lib/media-proposal-filename";
import { getCurrentUser } from "@/lib/user-session";
import { checkReportAccess } from "@/lib/report-access";
import { accessDeniedErrorMessage } from "@/lib/entitlements/tier-copy";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type Params = { params: Promise<{ id: string }> };

function asciiFilename(name: string): string {
  return name.replace(/[^\x20-\x7E]/g, "_").replace(/_+/g, "_") || "proposal.pdf";
}

export async function GET(request: NextRequest, { params }: Params) {
  const { id } = await params;

  if (!isDatabaseConfigured()) {
    return NextResponse.json({ error: "Database unavailable" }, { status: 503 });
  }

  const db = getPrisma();
  const row = await db.media.findFirst({
    where: publicActiveMediaWhere({ id }),
    include: {
      advertiserExecutions: {
        select: { advertiserName: true },
        orderBy: { createdAt: "desc" },
      },
    },
  });

  if (!row) {
    return NextResponse.json({ error: "Media not found" }, { status: 404 });
  }

  const user = await getCurrentUser();
  const pdfAccess = await checkReportAccess(user?.id ?? null, "planner_pdf");
  if (!pdfAccess.allowed) {
    return NextResponse.json(
      {
        error: accessDeniedErrorMessage(
          "planner_pdf",
          pdfAccess.reason === "login" ? 401 : 403,
        ),
      },
      { status: pdfAccess.reason === "login" ? 401 : 403 },
    );
  }

  // 항상 고급 자동 제안서를 생성 (운영자 업로드 proposalUrl 리다이렉트 제거)
  const detailAccess = await checkReportAccess(user?.id ?? null, "detail_data");
  const includeProDetails = detailAccess.allowed;

  const locale =
    request.nextUrl.searchParams.get("locale")?.trim().toLowerCase() ?? "ko";
  const isKo = !locale.startsWith("en");

  const media = prismaMediaToMediaItem(row);
  const pdf = await generateMediaProposalPdf({
    media,
    isKo,
    includeProDetails,
    trafficPattern:
      (row.trafficPattern as Parameters<typeof generateMediaProposalPdf>[0]["trafficPattern"]) ??
      null,
  });

  const filename = mediaProposalDownloadFilename(media, isKo);
  const encoded = encodeURIComponent(filename);

  return new NextResponse(new Uint8Array(pdf), {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${asciiFilename(filename)}"; filename*=UTF-8''${encoded}`,
      "Cache-Control": "private, max-age=86400",
    },
  });
}
