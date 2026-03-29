import { v2 as cloudinary } from "cloudinary";
import {
  getCloudinaryCredentials,
  isCloudinaryConfigured,
} from "@/lib/cloudinary-env";

export { isCloudinaryConfigured };

function ensureConfig() {
  const c = getCloudinaryCredentials();
  if (!c) return;
  cloudinary.config({
    cloud_name: c.cloudName,
    api_key: c.apiKey,
    api_secret: c.apiSecret,
  });
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
  const c = getCloudinaryCredentials()!;
  const signature = cloudinary.utils.api_sign_request(
    { timestamp, folder },
    c.apiSecret,
  );
  return {
    timestamp,
    signature,
    folder,
    cloudName: c.cloudName,
    apiKey: c.apiKey,
  };
}
