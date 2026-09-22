import { NextResponse } from "next/server";
import { fetchUploadedContractPdfVerified } from "@/lib/ooh-contract-upload-pdf";
import { getPrisma } from "@/lib/prisma";
import { formatSignedAtKst } from "@/lib/signature-audit";
import {
  buildSignedUploadContractPdf,
  takeOverlayFontSource,
} from "@/lib/upload-contract-sign-pdf";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/** 배포 확인용. 확인 후 이 라우트는 제거한다. */
const SAMPLE_TOKEN = "overlay-font-check-7f3c";
const CONTRACT_ID = "cmucegp5i000b04jx5n3alogg";

export async function GET(req: Request) {
  const url = new URL(req.url);
  if (url.searchParams.get("k") !== SAMPLE_TOKEN) {
    return new NextResponse("Not found", { status: 404 });
  }

  const db = getPrisma();
  const contract = await db.oohContract.findUnique({
    where: { id: CONTRACT_ID },
    include: { auditLogs: { orderBy: { signedAt: "desc" }, take: 1 } },
  });
  if (
    !contract?.uploadedPdfUrl ||
    !contract.signatureImage ||
    !contract.signerName ||
    !contract.signerEmail ||
    !contract.signedAt
  ) {
    return NextResponse.json({ error: "contract_incomplete" }, { status: 404 });
  }

  const audit = contract.auditLogs[0];
  const sourcePdf = await fetchUploadedContractPdfVerified(
    contract.uploadedPdfUrl,
    contract.uploadedPdfSha256,
  );
  const signed = await buildSignedUploadContractPdf(
    sourcePdf,
    { signaturePngBase64: contract.signatureImage },
    {
      signerName: contract.signerName,
      signerEmail: contract.signerEmail,
      signedAtKst: formatSignedAtKst(contract.signedAt),
      documentContentSha256:
        audit?.documentHash || contract.uploadedPdfSha256 || "",
      signatureImageSha256: audit?.signatureImageHash || "",
    },
  );
  const buf = Buffer.from(signed.pdfBase64, "base64");
  return new NextResponse(buf, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": 'inline; filename="overlay-font-sample.pdf"',
      "Cache-Control": "no-store",
      "X-Overlay-Font": takeOverlayFontSource(),
      "X-Signed-Sha256": signed.sha256,
    },
  });
}
