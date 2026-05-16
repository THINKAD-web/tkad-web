export type PhotoSlot = "front" | "side" | "night";

export type CloudinarySignResponse = {
  timestamp: number;
  signature: string;
  folder: string;
  cloudName: string;
  apiKey: string;
};

export async function fetchMediaApplicationUploadSign(): Promise<CloudinarySignResponse> {
  const res = await fetch("/api/media-applications/upload-sign", {
    method: "POST",
  });
  const data = (await res.json()) as CloudinarySignResponse & {
    error?: string;
  };
  if (!res.ok) {
    throw new Error(data.error ?? "Upload sign failed");
  }
  return data;
}

export function uploadToCloudinary(
  file: File,
  sign: CloudinarySignResponse,
): Promise<string> {
  return new Promise((resolve, reject) => {
    const fd = new FormData();
    fd.append("file", file);
    fd.append("api_key", sign.apiKey);
    fd.append("timestamp", String(sign.timestamp));
    fd.append("signature", sign.signature);
    fd.append("folder", sign.folder);

    const xhr = new XMLHttpRequest();
    xhr.open(
      "POST",
      `https://api.cloudinary.com/v1_1/${sign.cloudName}/image/upload`,
    );
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          const parsed = JSON.parse(xhr.responseText) as { secure_url?: string };
          if (parsed.secure_url) {
            resolve(parsed.secure_url);
            return;
          }
        } catch {
          /* fall through */
        }
      }
      reject(new Error("Cloudinary upload failed"));
    };
    xhr.onerror = () => reject(new Error("Network error"));
    xhr.send(fd);
  });
}
