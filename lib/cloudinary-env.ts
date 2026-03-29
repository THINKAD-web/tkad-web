/**
 * Supports either discrete env vars or a single CLOUDINARY_URL.
 * URL format: cloudinary://API_KEY:API_SECRET@CLOUD_NAME
 */
export type CloudinaryCredentials = {
  cloudName: string;
  apiKey: string;
  apiSecret: string;
};

function parseCloudinaryUrl(raw: string): CloudinaryCredentials | null {
  const t = raw.trim();
  if (!t) return null;
  try {
    const u = new URL(t.replace(/^cloudinary:\/\//, "https://"));
    const cloudName = u.hostname;
    const apiKey = u.username;
    const apiSecret = u.password;
    if (!cloudName || !apiKey || !apiSecret) return null;
    return { cloudName, apiKey, apiSecret };
  } catch {
    return null;
  }
}

export function getCloudinaryCredentials(): CloudinaryCredentials | null {
  const fromUrl = process.env.CLOUDINARY_URL?.trim();
  if (fromUrl) {
    const parsed = parseCloudinaryUrl(fromUrl);
    if (parsed) return parsed;
  }
  const cloudName = process.env.CLOUDINARY_CLOUD_NAME?.trim();
  const apiKey = process.env.CLOUDINARY_API_KEY?.trim();
  const apiSecret = process.env.CLOUDINARY_API_SECRET?.trim();
  if (cloudName && apiKey && apiSecret) {
    return { cloudName, apiKey, apiSecret };
  }
  return null;
}

export function isCloudinaryConfigured(): boolean {
  return getCloudinaryCredentials() != null;
}
