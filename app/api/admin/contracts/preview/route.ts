import { NextRequest, NextResponse } from "next/server";
import { assertAdmin } from "@/lib/admin-guard";
import { buildOohContractPdf } from "@/lib/ooh-contract-pdf";
import {
  newStandaloneContractDraftId,
  StandaloneContractPreviewBody,
  standaloneContractToPdfVars,
} from "@/lib/standalone-contract";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  const deny = assertAdmin(request);
  if (deny) return deny;

  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  const parsed = StandaloneContractPreviewBody.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "validation_failed", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const draftId =
    typeof raw === "object" &&
    raw !== null &&
    "draftId" in raw &&
    typeof (raw as { draftId?: unknown }).draftId === "string" &&
    (raw as { draftId: string }).draftId.trim()
      ? (raw as { draftId: string }).draftId.trim()
      : newStandaloneContractDraftId();

  const vars = standaloneContractToPdfVars(parsed.data, draftId);
  const { pdfBase64 } = await buildOohContractPdf(vars);
  const buf = Buffer.from(pdfBase64, "base64");

  const disposition = parsed.data.download ? "attachment" : "inline";
  const filename = `thinkad-contract-${draftId.slice(-8).toLowerCase()}.pdf`;

  return new NextResponse(buf, {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `${disposition}; filename="${filename}"`,
      "Cache-Control": "no-store, private",
      "X-Contract-Draft-Id": draftId,
    },
  });
}
