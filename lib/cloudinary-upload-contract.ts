import { v2 as cloudinary } from "cloudinary";
import {
  getCloudinaryCredentials,
  isCloudinaryConfigured,
  type CloudinaryCredentials,
} from "@/lib/cloudinary-env";

export { isCloudinaryConfigured };

function configureCloudinaryFromEnv(): CloudinaryCredentials {
  const c = getCloudinaryCredentials();
  if (!c) {
    throw new Error("Cloudinary not configured");
  }
  cloudinary.config({
    cloud_name: c.cloudName,
    api_key: c.apiKey,
    api_secret: c.apiSecret,
  });
  return c;
}

/** Cloudinary SDK / HTTP error → 로그·API detail용 (secret 미포함) */
export function formatCloudinaryUploadError(err: unknown): string {
  if (err && typeof err === "object") {
    const o = err as { message?: unknown; http_code?: unknown; error?: unknown };
    const parts: string[] = [];
    if (typeof o.http_code === "number") parts.push(String(o.http_code));
    if (typeof o.message === "string" && o.message.trim()) {
      parts.push(o.message.trim());
    } else if (o.error && typeof o.error === "object") {
      const inner = o.error as { message?: unknown };
      if (typeof inner.message === "string" && inner.message.trim()) {
        parts.push(inner.message.trim());
      }
    }
    if (parts.length) return parts.join(": ").slice(0, 240);
  }
  if (err instanceof Error && err.message) {
    return err.message.slice(0, 240);
  }
  return "unknown";
}

type RawUploadParams = {
  folder: string;
  public_id: string;
};

/** raw PDF — `format` 없음 (signed contract 업로드와 동일). stream 실패 시 data URI fallback */
async function uploadRawPdfBuffer(
  pdfBuffer: Buffer,
  params: RawUploadParams,
): Promise<string> {
  configureCloudinaryFromEnv();
  const opts = {
    resource_type: "raw" as const,
    folder: params.folder,
    public_id: params.public_id,
    overwrite: true,
    use_filename: false,
  };

  const fromResult = (result: { secure_url?: string } | undefined): string => {
    const url = result?.secure_url;
    if (!url) throw new Error("Cloudinary upload returned no URL");
    return url;
  };

  try {
    const streamed = await new Promise<{ secure_url?: string }>(
      (resolve, reject) => {
        const stream = cloudinary.uploader.upload_stream(
          opts,
          (err, result) => {
            if (err) reject(err);
            else resolve(result ?? {});
          },
        );
        stream.end(pdfBuffer);
      },
    );
    return fromResult(streamed);
  } catch (streamErr) {
    try {
      const dataUri = `data:application/pdf;base64,${pdfBuffer.toString("base64")}`;
      const uploaded = await cloudinary.uploader.upload(dataUri, opts);
      return fromResult(uploaded);
    } catch {
      throw streamErr;
    }
  }
}

/**
 * 서명 완료 PDF를 Cloudinary `raw`로 업로드하고 `secure_url`을 반환합니다.
 * 폴더: `CLOUDINARY_CONTRACT_FOLDER` 또는 `tkad/contracts`
 */
/** 관리자 업로드 원본 계약 PDF — `source_*` public_id (서명 PDF와 분리) */
export async function uploadOohContractSourcePdf(
  pdfBuffer: Buffer,
  uploadToken: string,
): Promise<string> {
  const folder =
    process.env.CLOUDINARY_CONTRACT_FOLDER?.trim() || "tkad/contracts";
  const safeId = `source_${uploadToken.replace(/[^a-zA-Z0-9_-]/g, "_")}`.slice(
    0,
    120,
  );
  return uploadRawPdfBuffer(pdfBuffer, { folder, public_id: safeId });
}

export async function uploadOohContractPdf(
  pdfBuffer: Buffer,
  contractId: string,
): Promise<string> {
  const c = getCloudinaryCredentials();
  if (!c) {
    throw new Error("Cloudinary not configured");
  }
  cloudinary.config({
    cloud_name: c.cloudName,
    api_key: c.apiKey,
    api_secret: c.apiSecret,
  });

  const folder =
    process.env.CLOUDINARY_CONTRACT_FOLDER?.trim() || "tkad/contracts";
  const safeId = `signed_${contractId.replace(/[^a-zA-Z0-9_-]/g, "_")}`.slice(
    0,
    120,
  );

  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        resource_type: "raw",
        folder,
        public_id: safeId,
        overwrite: true,
        use_filename: false,
      },
      (err, result) => {
        if (err) {
          reject(err);
          return;
        }
        const url = result?.secure_url;
        if (!url) {
          reject(new Error("Cloudinary upload returned no URL"));
          return;
        }
        resolve(url);
      },
    );
    stream.end(pdfBuffer);
  });
}

/** 운영자 매뉴얼 PDF — `tkad/admin/manual` */
export async function uploadOperatorManualPdf(
  pdfBuffer: Buffer,
): Promise<{ url: string; publicId: string }> {
  const c = getCloudinaryCredentials();
  if (!c) {
    throw new Error("Cloudinary not configured");
  }
  cloudinary.config({
    cloud_name: c.cloudName,
    api_key: c.apiKey,
    api_secret: c.apiSecret,
  });

  const folder =
    process.env.CLOUDINARY_MANUAL_FOLDER?.trim() || "tkad/admin/manual";
  const stamp = new Date().toISOString().slice(0, 10).replace(/-/g, "");
  const safeId = `thinkad-operator-manual-${stamp}`;

  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        resource_type: "raw",
        folder,
        public_id: safeId,
        overwrite: true,
        format: "pdf",
      },
      (err, result) => {
        if (err) {
          reject(err);
          return;
        }
        const url = result?.secure_url;
        const publicId = result?.public_id;
        if (!url || !publicId) {
          reject(new Error("Cloudinary upload returned no URL"));
          return;
        }
        resolve({ url, publicId });
      },
    );
    stream.end(pdfBuffer);
  });
}

/** 아카데미 다운로드 PDF — `tkad/academy` */
export async function uploadAcademyPdf(
  pdfBuffer: Buffer,
  assetId: string,
): Promise<{ url: string; publicId: string }> {
  const c = getCloudinaryCredentials();
  if (!c) {
    throw new Error("Cloudinary not configured");
  }
  cloudinary.config({
    cloud_name: c.cloudName,
    api_key: c.apiKey,
    api_secret: c.apiSecret,
  });

  const folder =
    process.env.CLOUDINARY_ACADEMY_FOLDER?.trim() || "tkad/academy";
  const safeId = assetId.replace(/[^a-zA-Z0-9_-]/g, "_").slice(0, 80);

  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        resource_type: "raw",
        folder,
        public_id: safeId,
        overwrite: true,
        format: "pdf",
      },
      (err, result) => {
        if (err) {
          reject(err);
          return;
        }
        const url = result?.secure_url;
        const publicId = result?.public_id;
        if (!url || !publicId) {
          reject(new Error("Cloudinary upload returned no URL"));
          return;
        }
        resolve({ url, publicId });
      },
    );
    stream.end(pdfBuffer);
  });
}
