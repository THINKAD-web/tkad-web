import { NextRequest, NextResponse } from "next/server";
import { buildCampaignBuilderExportPayload } from "@/lib/admin-campaign-builder/build-export-payload";
import { loadOohCatalogItems } from "@/lib/admin-campaign-builder/ooh-catalog";
import { campaignBuilderPayloadSchema } from "@/lib/admin-campaign-builder/schemas";
import {
  assertAdminDb,
  adminDbQueryFailed,
  json,
} from "@/lib/admin-guard";
import { fetchLocalDigitalCatalog } from "@/lib/digital/local-catalog-fetch";
import { buildPlannerReportPdf } from "@/lib/planner-report-export/build-pdf";
import { buildPlannerReportPptx } from "@/lib/planner-report-export/build-pptx";
import { parsePlannerReportStyle } from "@/lib/planner-report-export/document-theme";
import {
  plannerReportFileBase,
  type PlannerReportExportFormat,
} from "@/lib/planner-report-export/types";
import { getPrisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

type RouteContext = { params: Promise<{ id: string }> };

function contentDisposition(filename: string): string {
  const ascii = filename.replace(/[^\x20-\x7E]/g, "_").replace(/"/g, "");
  const utf8 = encodeURIComponent(filename);
  return `attachment; filename="${ascii}"; filename*=UTF-8''${utf8}`;
}

export async function GET(request: NextRequest, context: RouteContext) {
  const deny = assertAdminDb(request);
  if (deny) return deny;

  const format = request.nextUrl.searchParams.get(
    "format",
  ) as PlannerReportExportFormat | null;
  if (format !== "pdf" && format !== "pptx") {
    return json({ error: "format must be 'pdf' or 'pptx'." }, 400);
  }

  const style = parsePlannerReportStyle(
    request.nextUrl.searchParams.get("style"),
  );

  try {
    const { id } = await context.params;
    const db = getPrisma();
    const report = await db.adminCampaignBuilderReport.findUnique({
      where: { id },
    });
    if (!report) {
      return json({ error: "Not found" }, 404);
    }

    const parsedPayload = campaignBuilderPayloadSchema.safeParse(report.payload);
    if (!parsedPayload.success) {
      return json(
        { error: "Invalid stored payload", details: parsedPayload.error.flatten() },
        400,
      );
    }

    const digitalResult = await fetchLocalDigitalCatalog();
    const oohCatalog = await loadOohCatalogItems();
    const digitalCatalog = digitalResult.ok ? digitalResult.views : [];

    const { payload, warnings } = buildCampaignBuilderExportPayload(
      { title: report.title, payload: parsedPayload.data },
      { digitalCatalog, oohCatalog },
      style,
    );

    if (warnings.length > 0) {
      console.warn("[campaign-builder export] catalog warnings", {
        reportId: id,
        warnings,
      });
    }

    const assets = { style };
    const bytes =
      format === "pdf"
        ? await buildPlannerReportPdf(payload, assets)
        : await buildPlannerReportPptx(payload, assets);

    const base = plannerReportFileBase(payload);
    const filename = `${base}.${format}`;
    const contentType =
      format === "pdf"
        ? "application/pdf"
        : "application/vnd.openxmlformats-officedocument.presentationml.presentation";

    return new NextResponse(bytes, {
      status: 200,
      headers: {
        "Content-Type": contentType,
        "Content-Disposition": contentDisposition(filename),
        "Cache-Control": "no-store",
      },
    });
  } catch (e) {
    return adminDbQueryFailed(e);
  }
}
