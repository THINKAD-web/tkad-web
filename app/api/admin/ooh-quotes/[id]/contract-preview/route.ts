import { NextRequest, NextResponse } from "next/server";
import {
  ContractPreviewError,
  buildContractPreviewPdfBuffer,
  contentDispositionInlinePdf,
} from "@/lib/contract-preview-pdf";
import { assertAdminDb } from "@/lib/admin-guard";
import { getPrisma, isDatabaseConfigured } from "@/lib/prisma";
import { ensureOohContractExists } from "@/lib/ooh-contract-ensure";
import { loadOoHQuoteForContract } from "@/lib/ooh-contract-context";

export const dynamic = "force-dynamic";

const CUID_RE = /^c[a-z0-9]{24,}$/i;

type Params = { params: Promise<{ id: string }> };

/** 어드민 계약 PDF 미리보기 — 업로드 PDF·발송 전 상태 포함 (public preview와 동일 버퍼, 인증만 다름) */
export async function GET(request: NextRequest, { params }: Params) {
  const deny = assertAdminDb(request);
  if (deny) return deny;

  const { id } = await params;
  if (!id || !CUID_RE.test(id)) {
    return new NextResponse("Not found", { status: 404 });
  }
  if (!isDatabaseConfigured()) {
    return new NextResponse("Unavailable", { status: 503 });
  }

  try {
    const db = getPrisma();
    let row = await loadOoHQuoteForContract(db, id);
    if (!row) return new NextResponse("Not found", { status: 404 });

    await ensureOohContractExists(db, id, row.status);
    row = (await loadOoHQuoteForContract(db, id))!;
    const contract = row.oohContract;
    if (!contract) return new NextResponse("Not found", { status: 404 });

    const { buffer, fileName } = await buildContractPreviewPdfBuffer(
      db,
      row,
      contract,
    );

    return new NextResponse(buffer, {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": contentDispositionInlinePdf(fileName),
        "Cache-Control": "no-store, private",
      },
    });
  } catch (e) {
    if (e instanceof ContractPreviewError) {
      if (e.code === "NOT_FOUND") {
        return new NextResponse("Not found", { status: 404 });
      }
      console.error("[admin contract preview]", {
        quoteId: id,
        code: e.code,
        err: e.message,
      });
      return new NextResponse("Unavailable", { status: 503 });
    }
    console.error("[admin contract preview] unexpected", { quoteId: id, err: e });
    return new NextResponse("Unavailable", { status: 503 });
  }
}
