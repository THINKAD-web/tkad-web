import { v2 as cloudinary } from "cloudinary";
import { parseCloudinaryPublicId } from "@/lib/campaign-proof-cloudinary";
import {
  bunnyPathFromPublicUrl,
  fetchFromBunnyStorage,
  isBunnyStorageConfigured,
} from "@/lib/bunny-storage";
import {
  getCloudinaryCredentials,
  isCloudinaryConfigured,
} from "@/lib/cloudinary-env";
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

function cloudinarySignedRawDeliveryUrl(storedUrl: string): string | null {
  if (!isCloudinaryConfigured()) return null;
  const publicId = parseCloudinaryPublicId(storedUrl);
  if (!publicId) return null;
  const c = getCloudinaryCredentials();
  if (!c) return null;
  cloudinary.config({
    cloud_name: c.cloudName,
    api_key: c.apiKey,
    api_secret: c.apiSecret,
  });
  return cloudinary.url(publicId, {
    resource_type: "raw",
    type: "upload",
    secure: true,
    sign_url: true,
  });
}

function isCloudinaryHost(url: string): boolean {
  try {
    return new URL(url).hostname.includes("res.cloudinary.com");
  } catch {
    return false;
  }
}

/** Cloudinary secure URL — 서버 전용 fetch (고객 UI에 URL 미노출) */
export async function fetchUploadedContractPdfBuffer(
  uploadedPdfUrl: string,
): Promise<Buffer> {
  const trimmed = uploadedPdfUrl.trim();
  if (!trimmed.startsWith("https://")) {
    throw new Error("invalid_upload_url");
  }

  const bunnyPath = bunnyPathFromPublicUrl(trimmed);
  if (bunnyPath && isBunnyStorageConfigured()) {
    try {
      const buf = await fetchFromBunnyStorage(bunnyPath);
      assertUploadPdfBuffer(buf);
      return buf;
    } catch (e) {
      if (e instanceof Error && e.message.startsWith("BUNNY_FETCH_FAILED")) {
        throw new Error("upload_fetch_failed");
      }
      throw e;
    }
  }

  const candidates = [trimmed];
  if (isCloudinaryHost(trimmed)) {
    const signed = cloudinarySignedRawDeliveryUrl(trimmed);
    if (signed && signed !== trimmed) {
      candidates.push(signed);
    }
  }

  let lastCode = "upload_fetch_failed";
  for (const url of candidates) {
    try {
      const res = await fetch(url, { cache: "no-store" });
      if (!res.ok) {
        lastCode = "upload_fetch_failed";
        continue;
      }
      const buf = Buffer.from(await res.arrayBuffer());
      assertUploadPdfBuffer(buf);
      return buf;
    } catch (e) {
      if (e instanceof Error && e.message) {
        lastCode = e.message;
      }
    }
  }

  throw new Error(lastCode);
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
