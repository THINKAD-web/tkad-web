import { randomBytes } from "node:crypto";
import { NextRequest } from "next/server";
import { assertAdminDb, json } from "@/lib/admin-guard";
import { buildOohContractSourcePdfBunnyPath } from "@/lib/bunny-upload-path";
import {
  getBunnyStorageConfigStatus,
  isBunnyStorageConfigured,
  uploadToBunnyStorage,
} from "@/lib/bunny-storage";
import {
  formatCloudinaryUploadError,
  isCloudinaryConfigured,
  uploadOohContractSourcePdf,
} from "@/lib/cloudinary-upload-contract";
import {
  assertUploadPdfBuffer,
  hashUploadPdfBuffer,
} from "@/lib/ooh-contract-upload-pdf";

export const dynamic = "force-dynamic";

const MAX_BYTES = 10 * 1024 * 1024;

function bunnyUploadErrorDetail(err: unknown): string {
  if (err instanceof Error) {
    if (err.message === "BUNNY_STORAGE_NOT_CONFIGURED") {
      const st = getBunnyStorageConfigStatus();
      return st.missingEnvVars.length
        ? `missing: ${st.missingEnvVars.join(", ")}`
        : "not configured";
    }
    return err.message.slice(0, 240);
  }
  return "unknown";
}

export async function POST(request: NextRequest) {
  const deny = assertAdminDb(request);
  if (deny) return deny;

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
  const fileName = (file.name || "contract.pdf").slice(0, 255);

  let url: string;
  let storage: "bunny" | "cloudinary";

  if (isBunnyStorageConfigured()) {
    try {
      const path = buildOohContractSourcePdfBunnyPath(token);
      const uploaded = await uploadToBunnyStorage({
        path,
        bytes,
        contentType: "application/pdf",
      });
      url = uploaded.publicUrl;
      storage = "bunny";
    } catch (e) {
      const detail = bunnyUploadErrorDetail(e);
      console.error("[upload-pdf] bunny", detail, e);
      return json({ error: "bunny_upload_failed", detail }, 502);
    }
  } else if (isCloudinaryConfigured()) {
    try {
      url = await uploadOohContractSourcePdf(buf, token);
      storage = "cloudinary";
    } catch (e) {
      const detail = formatCloudinaryUploadError(e);
      console.error("[upload-pdf] cloudinary", detail, e);
      return json({ error: "cloudinary_upload_failed", detail }, 502);
    }
  } else {
    return json(
      {
        error: "contract_pdf_storage_not_configured",
        detail: "Set BUNNY_STORAGE_* (preferred) or CLOUDINARY_*",
      },
      503,
    );
  }

  return json({
    ok: true,
    storage,
    uploadedPdfUrl: url,
    uploadedPdfSha256: sha256,
    uploadedPdfFileName: fileName,
  });
}
