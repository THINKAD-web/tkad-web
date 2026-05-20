import { NextRequest } from "next/server";
import type { MediaOwnerReportType } from "@prisma/client";
import { requireMediaOwner } from "@/lib/media-owner-guard";
import {
  getMediaOwnerReportAccess,
  isAnnualReportAvailable,
} from "@/lib/media-owner-report-access";
import { loadOwnerMediaSummaries } from "@/lib/media-owner-report-data";
import { apiOk } from "@/lib/api-response";

export const dynamic = "force-dynamic";

export async function GET() {
  const auth = await requireMediaOwner();
  if (!auth.ok) return auth.response;

  const [media, access] = await Promise.all([
    loadOwnerMediaSummaries(auth.user.id),
    getMediaOwnerReportAccess(auth.user.id),
  ]);

  return apiOk({
    media,
    access,
    annualAvailable: isAnnualReportAvailable(),
  });
}

export async function POST(request: NextRequest) {
  const auth = await requireMediaOwner();
  if (!auth.ok) return auth.response;

  let body: {
    mediaId?: string;
    reportType?: MediaOwnerReportType;
    mediaIds?: string[];
    periodMonth?: string;
    year?: number;
  };
  try {
    body = await request.json();
  } catch {
    return new Response(JSON.stringify({ error: "Invalid JSON" }), {
      status: 400,
    });
  }

  const { generateMediaOwnerReport, generateCatalogReport } = await import(
    "@/lib/media-owner-report-service"
  );

  if (body.reportType === "CATALOG" && body.mediaIds?.length) {
    const result = await generateCatalogReport({
      ownerUserId: auth.user.id,
      mediaIds: body.mediaIds,
    });
    if ("error" in result) {
      return new Response(JSON.stringify({ error: result.error }), {
        status: result.status,
      });
    }
    return new Response(result.buffer, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename*=UTF-8''${encodeURIComponent(result.filename)}`,
        "Cache-Control": "no-store",
      },
    });
  }

  if (!body.mediaId || !body.reportType) {
    return new Response(JSON.stringify({ error: "mediaId and reportType required" }), {
      status: 400,
    });
  }

  if (body.reportType === "ANNUAL" && !isAnnualReportAvailable()) {
    return new Response(
      JSON.stringify({ error: "연간 보고서는 12월에만 다운로드할 수 있습니다." }),
      { status: 403 },
    );
  }

  const result = await generateMediaOwnerReport({
    ownerUserId: auth.user.id,
    mediaId: body.mediaId,
    reportType: body.reportType,
    periodMonth: body.periodMonth,
    year: body.year,
  });

  if ("error" in result) {
    return new Response(JSON.stringify({ error: result.error }), {
      status: result.status,
    });
  }

  return new Response(result.buffer, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename*=UTF-8''${encodeURIComponent(result.filename)}`,
      "Cache-Control": "no-store",
    },
  });
}
