import { NextRequest, NextResponse } from "next/server";
import {
  isPlannerReportExportPayload,
  plannerReportFileBase,
  type PlannerReportExportFormat,
} from "@/lib/planner-report-export/types";

/** Content-Disposition: ASCII fallback + RFC 5987 UTF-8 (한글 파일명 지원) */
function contentDisposition(filename: string): string {
  const ascii = filename.replace(/[^\x20-\x7E]/g, "_").replace(/"/g, "");
  const utf8 = encodeURIComponent(filename);
  return `attachment; filename="${ascii}"; filename*=UTF-8''${utf8}`;
}

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

  const base = plannerReportFileBase(payload);

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
          "Content-Disposition": contentDisposition(`${base}.pdf`),
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
        "Content-Disposition": contentDisposition(`${base}.pptx`),
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
