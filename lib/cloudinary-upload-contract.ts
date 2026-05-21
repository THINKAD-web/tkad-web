import { v2 as cloudinary } from "cloudinary";
import {
  getCloudinaryCredentials,
  isCloudinaryConfigured,
} from "@/lib/cloudinary-env";

export { isCloudinaryConfigured };

/**
 * 서명 완료 PDF를 Cloudinary `raw`로 업로드하고 `secure_url`을 반환합니다.
 * 폴더: `CLOUDINARY_CONTRACT_FOLDER` 또는 `tkad/contracts`
 */
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
