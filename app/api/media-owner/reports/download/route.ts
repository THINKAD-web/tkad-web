import { NextRequest } from "next/server";
import { downloadReportByToken } from "@/lib/media-owner-report-service";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get("token")?.trim();
  if (!token) {
    return new Response(JSON.stringify({ error: "token required" }), {
      status: 400,
    });
  }

  const result = await downloadReportByToken(token);
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
