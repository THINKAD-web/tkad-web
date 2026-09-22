import { sha256Hex } from "@/lib/signature-audit";

const MAX_UPLOAD_PDF_BYTES = 10 * 1024 * 1024;

export function assertUploadPdfBuffer(buf: Buffer): void {
  if (buf.length < 5) {
    throw new Error("empty_pdf");
  }
  if (buf.length > MAX_UPLOAD_PDF_BYTES) {
    throw new Error("pdf_too_large");
  }
  const head = buf.subarray(0, 5).toString("ascii");
  if (!head.startsWith("%PDF-")) {
    throw new Error("not_pdf");
  }
}

export function hashUploadPdfBuffer(buf: Buffer): string {
  return sha256Hex(buf);
}

/** Cloudinary secure URL — 서버 전용 fetch (고객 UI에 URL 미노출) */
export async function fetchUploadedContractPdfBuffer(
  uploadedPdfUrl: string,
): Promise<Buffer> {
  const url = uploadedPdfUrl.trim();
  if (!url.startsWith("https://")) {
    throw new Error("invalid_upload_url");
  }
  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) {
    throw new Error("upload_fetch_failed");
  }
  const ab = await res.arrayBuffer();
  const buf = Buffer.from(ab);
  assertUploadPdfBuffer(buf);
  return buf;
}

export async function fetchUploadedContractPdfVerified(
  uploadedPdfUrl: string,
  expectedSha256: string | null | undefined,
): Promise<Buffer> {
  const buf = await fetchUploadedContractPdfBuffer(uploadedPdfUrl);
  const hash = hashUploadPdfBuffer(buf);
  const expected = expectedSha256?.trim().toLowerCase();
  if (expected && hash !== expected) {
    throw new Error("upload_sha_mismatch");
  }
  return buf;
}
