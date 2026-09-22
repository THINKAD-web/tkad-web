import { NextResponse } from "next/server";
import {
  buildSignedUploadContractPdf,
  takeOverlayFontSource,
} from "@/lib/upload-contract-sign-pdf";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/** 배포 확인용. 확인 후 이 라우트는 제거한다. */
const SAMPLE_TOKEN = "overlay-font-check-7f3c";
const SOURCE_PDF =
  "https://tkad-cdn.b-cdn.net/tkad/contracts/source/75f38db084fa9c66604e0d62.pdf";

const SIGNATURE_PNG =
  "iVBORw0KGgoAAAANSUhEUgAAAaQAAAB4CAYAAAC9x4bVAAAHP0lEQVR4Ae3BAZJiyXZEwbi5h9j/AmMRoZY0Mv0eqwcPiioSOO7TVgAAPNsSAAAbWAIAYANLAABsYAkAgA0sAQCwgSUAADawBADABpYAANjAEgAAG1gCAGADSwAAbGAJAIANLAEAsIElAAA2sAQAwAaWAADYwBIAABtYAgBgA0sAAGxgCQCADSwBALCBJQAANrAEAMAGlgAA2MASAAAbWAIAYANLAABsYAkAgA0sAQCwgSUAADawBADABpYAANjAEgAAG1gCAGADSwAAbGAJAIANLAEAsIElAAA2sAQAwAaWAADYwBIAABtYAgBgA0sAAGxgCQCADSwBALCBJQAANrAEAMAG/gvIDInWGsOH+gAAAABJRU5ErkJggg==";

export async function GET(req: Request) {
  const url = new URL(req.url);
  if (url.searchParams.get("k") !== SAMPLE_TOKEN) {
    return new NextResponse("Not found", { status: 404 });
  }

  const res = await fetch(SOURCE_PDF);
  if (!res.ok) {
    return NextResponse.json({ error: "source_fetch_failed" }, { status: 502 });
  }
  const sourcePdf = Buffer.from(await res.arrayBuffer());
  const signed = await buildSignedUploadContractPdf(
    sourcePdf,
    { signaturePngBase64: SIGNATURE_PNG },
    {
      signerName: "홍 용 기",
      signerEmail: "mannote@naver.com",
      signedAtKst: "2026. 9. 22. 18:57:55",
      documentContentSha256: "ab".repeat(32),
      signatureImageSha256: "cd".repeat(32),
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
