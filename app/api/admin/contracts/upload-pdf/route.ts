import { randomBytes } from "node:crypto";
import { NextRequest } from "next/server";
import { assertAdminDb, json } from "@/lib/admin-guard";
import {
  isCloudinaryConfigured,
  uploadOohContractSourcePdf,
} from "@/lib/cloudinary-upload-contract";
import {
  assertUploadPdfBuffer,
  hashUploadPdfBuffer,
} from "@/lib/ooh-contract-upload-pdf";

export const dynamic = "force-dynamic";

const MAX_BYTES = 10 * 1024 * 1024;

export async function POST(request: NextRequest) {
  const deny = assertAdminDb(request);
  if (deny) return deny;

  if (!isCloudinaryConfigured()) {
    return json({ error: "cloudinary_not_configured" }, 503);
  }

  const form = await request.formData().catch(() => null);
  const file = form?.get("file");
  if (!(file instanceof File)) {
    return json({ error: "missing_file" }, 400);
  }

  const type = (file.type || "").toLowerCase();
  if (type && type !== "application/pdf") {
    return json({ error: "pdf_only" }, 400);
  }

  const bytes = await file.arrayBuffer();
  if (bytes.byteLength < 1 || bytes.byteLength > MAX_BYTES) {
    return json({ error: "invalid_pdf_size" }, 400);
  }

  const buf = Buffer.from(bytes);
  try {
    assertUploadPdfBuffer(buf);
  } catch {
    return json({ error: "not_pdf" }, 400);
  }

  const sha256 = hashUploadPdfBuffer(buf);
  const token = randomBytes(12).toString("hex");
  const url = await uploadOohContractSourcePdf(buf, token);
  const fileName = (file.name || "contract.pdf").slice(0, 255);

  return json({
    ok: true,
    uploadedPdfUrl: url,
    uploadedPdfSha256: sha256,
    uploadedPdfFileName: fileName,
  });
}
