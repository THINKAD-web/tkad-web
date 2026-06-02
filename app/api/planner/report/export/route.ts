import { NextRequest, NextResponse } from "next/server";
import {
  isPlannerReportExportPayload,
  type PlannerReportExportFormat,
} from "@/lib/planner-report-export/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * 플래너 보고서 서버 출력 — PDF(jsPDF) / PPTX(pptxgenjs).
 * 클라이언트가 화면에서 계산한 payload 를 받아 서버에서 문서를 생성한다.
 * (html2canvas DOM 캡처 방식 대체 — oklch/그라데이션 검정 폴백·모바일 폭 캡처 문제 제거)
 */
export async function POST(request: NextRequest) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const { format, payload } = (body ?? {}) as {
    format?: PlannerReportExportFormat;
    payload?: unknown;
  };

  if (format !== "pdf" && format !== "pptx") {
    return NextResponse.json(
      { error: "format must be 'pdf' or 'pptx'." },
      { status: 400 },
    );
  }
  if (!isPlannerReportExportPayload(payload)) {
    return NextResponse.json({ error: "Invalid payload." }, { status: 400 });
  }

  const stamp = new Date().toISOString().slice(0, 10).replace(/-/g, "");
  const base = `thinkad-${payload.kind === "integrated" ? "integrated-" : ""}plan-${stamp}`;

  try {
    if (format === "pdf") {
      const { buildPlannerReportPdf } = await import(
        "@/lib/planner-report-export/build-pdf"
      );
      const bytes = await buildPlannerReportPdf(payload);
      return new NextResponse(new Blob([bytes as BlobPart]), {
        status: 200,
        headers: {
          "Content-Type": "application/pdf",
          "Content-Disposition": `attachment; filename="${base}.pdf"`,
          "Cache-Control": "private, no-store",
        },
      });
    }

    const { buildPlannerReportPptx } = await import(
      "@/lib/planner-report-export/build-pptx"
    );
    const bytes = await buildPlannerReportPptx(payload);
    return new NextResponse(new Blob([bytes as BlobPart]), {
      status: 200,
      headers: {
        "Content-Type":
          "application/vnd.openxmlformats-officedocument.presentationml.presentation",
        "Content-Disposition": `attachment; filename="${base}.pptx"`,
        "Cache-Control": "private, no-store",
      },
    });
  } catch (e) {
    const err = e instanceof Error ? e : new Error(String(e));
    console.error("[planner-report-export] failed", {
      format,
      kind: payload.kind,
      message: err.message,
      stack: err.stack,
    });
    return NextResponse.json(
      {
        error: "Failed to generate document.",
        detail: process.env.NODE_ENV === "development" ? err.message : undefined,
      },
      { status: 500 },
    );
  }
}
