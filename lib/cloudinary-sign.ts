import { v2 as cloudinary } from "cloudinary";

function ensureConfig() {
  if (!isCloudinaryConfigured()) return;
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME!.trim(),
    api_key: process.env.CLOUDINARY_API_KEY!.trim(),
    api_secret: process.env.CLOUDINARY_API_SECRET!.trim(),
  });
}

export function isCloudinaryConfigured(): boolean {
  return !!(
    process.env.CLOUDINARY_CLOUD_NAME?.trim() &&
    process.env.CLOUDINARY_API_KEY?.trim() &&
    process.env.CLOUDINARY_API_SECRET?.trim()
  );
}

export function signUploadParams(): {
  timestamp: number;
  signature: string;
  folder: string;
  cloudName: string;
  apiKey: string;
} | null {
  if (!isCloudinaryConfigured()) return null;
  ensureConfig();
  const folder =
    process.env.CLOUDINARY_UPLOAD_FOLDER?.trim() || "tkad/media";
  const timestamp = Math.round(Date.now() / 1000);
  const secret = process.env.CLOUDINARY_API_SECRET!.trim();
  const signature = cloudinary.utils.api_sign_request(
    { timestamp, folder },
    secret,
  );
  return {
    timestamp,
    signature,
    folder,
    cloudName: process.env.CLOUDINARY_CLOUD_NAME!.trim(),
    apiKey: process.env.CLOUDINARY_API_KEY!.trim(),
  };
}
