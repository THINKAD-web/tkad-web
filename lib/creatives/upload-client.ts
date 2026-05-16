/**
 * 광고주 라이브러리 소재(`Creative`) Cloudinary 업로드 클라이언트.
 *
 * 흐름:
 *   1) POST /api/my/creatives/upload-sign (인증 필요) → 서명된 파라미터
 *   2) Cloudinary {image|video}/upload 로 직접 multipart POST
 *   3) 결과 { secure_url, public_id, width, height, bytes, duration } 등을
 *      POST /api/my/creatives 로 보내 DB row 생성
 */

import { classifyMime } from "@/lib/creatives/spec-guide";

export type CreativeCloudinaryResult = {
  secureUrl: string;
  publicId: string;
  width: number | null;
  height: number | null;
  bytes: number | null;
  duration: number | null;
  resourceType: "image" | "video";
  format: string | null;
};

export type SignedUploadParams = {
  cloudName: string;
  apiKey: string;
  timestamp: number;
  signature: string;
  folder: string;
};

export async function getCreativeUploadSignature(): Promise<SignedUploadParams> {
  const res = await fetch("/api/my/creatives/upload-sign", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: "{}",
  });
  if (!res.ok) {
    const err = await safeJson(res);
    throw new Error(err?.error?.message ?? "업로드 서명을 받지 못했습니다.");
  }
  const json = await res.json();
  if (!json?.ok || !json.data) {
    throw new Error("업로드 서명 응답이 비어 있습니다.");
  }
  return json.data as SignedUploadParams;
}

export async function uploadCreativeToCloudinary(
  file: File,
  onProgress?: (pct: number) => void,
): Promise<CreativeCloudinaryResult> {
  const kind = classifyMime(file.type);
  if (!kind) {
    throw new Error("지원하지 않는 파일 형식입니다.");
  }
  const sign = await getCreativeUploadSignature();

  const form = new FormData();
  form.append("file", file);
  form.append("api_key", sign.apiKey);
  form.append("timestamp", String(sign.timestamp));
  form.append("signature", sign.signature);
  form.append("folder", sign.folder);

  const url = `https://api.cloudinary.com/v1_1/${sign.cloudName}/${kind}/upload`;

  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("POST", url, true);
    xhr.upload.onprogress = (e) => {
      if (!onProgress || !e.lengthComputable) return;
      onProgress(Math.round((e.loaded / e.total) * 100));
    };
    xhr.onload = () => {
      try {
        const data = JSON.parse(xhr.responseText) as {
          secure_url?: string;
          public_id?: string;
          width?: number;
          height?: number;
          bytes?: number;
          duration?: number;
          resource_type?: "image" | "video";
          format?: string;
          error?: { message?: string };
        };
        if (xhr.status >= 200 && xhr.status < 300 && data.secure_url) {
          resolve({
            secureUrl: data.secure_url,
            publicId: data.public_id ?? "",
            width: typeof data.width === "number" ? data.width : null,
            height: typeof data.height === "number" ? data.height : null,
            bytes: typeof data.bytes === "number" ? data.bytes : null,
            duration:
              typeof data.duration === "number"
                ? Math.round(data.duration)
                : null,
            resourceType: data.resource_type ?? (kind as "image" | "video"),
            format: data.format ?? null,
          });
        } else {
          reject(new Error(data.error?.message ?? `업로드 실패 (HTTP ${xhr.status})`));
        }
      } catch {
        reject(new Error("업로드 응답 파싱 실패"));
      }
    };
    xhr.onerror = () => reject(new Error("네트워크 오류로 업로드 실패"));
    xhr.send(form);
  });
}

async function safeJson(res: Response): Promise<{ error?: { message?: string } } | null> {
  try {
    return (await res.json()) as { error?: { message?: string } };
  } catch {
    return null;
  }
}

/**
 * Cloudinary public_id 에서 영상 첫 프레임 썸네일 URL 을 만든다.
 * 비디오만 호출하세요.
 */
export function deriveVideoThumbnail(args: {
  cloudName: string;
  publicId: string;
}): string {
  // Cloudinary 표준 비디오 썸네일 URL — 매체 미리보기용 .jpg
  return `https://res.cloudinary.com/${args.cloudName}/video/upload/so_0/${args.publicId}.jpg`;
}

/** 이미지 파일 로컬 dimensions 추출 */
export function readImageDimensions(
  file: File,
): Promise<{ width: number; height: number } | null> {
  return new Promise((resolve) => {
    if (typeof window === "undefined" || typeof Image === "undefined") {
      resolve(null);
      return;
    }
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      const out = { width: img.naturalWidth, height: img.naturalHeight };
      URL.revokeObjectURL(url);
      resolve(out);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      resolve(null);
    };
    img.src = url;
  });
}

/** 영상 파일 로컬 duration/dimensions 추출 */
export function readVideoMeta(
  file: File,
): Promise<{ width: number; height: number; duration: number } | null> {
  return new Promise((resolve) => {
    if (typeof window === "undefined") {
      resolve(null);
      return;
    }
    const url = URL.createObjectURL(file);
    const v = document.createElement("video");
    v.preload = "metadata";
    v.muted = true;
    v.onloadedmetadata = () => {
      const out = {
        width: v.videoWidth || 0,
        height: v.videoHeight || 0,
        duration: Math.round(v.duration || 0),
      };
      URL.revokeObjectURL(url);
      resolve(out);
    };
    v.onerror = () => {
      URL.revokeObjectURL(url);
      resolve(null);
    };
    v.src = url;
  });
}
