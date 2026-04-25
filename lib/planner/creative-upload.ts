"use client";

/**
 * 플래너 로고/소재 업로드 클라이언트 헬퍼.
 * 1) `/api/planner/creative/sign` 에서 서명 수신
 * 2) Cloudinary `image/upload` 엔드포인트로 직접 multipart POST
 * 3) `secure_url` 반환
 */

export const PLANNER_CREATIVE_MAX_BYTES = 10 * 1024 * 1024; // 10 MB
export const PLANNER_CREATIVE_ACCEPTED_TYPES = [
  "image/png",
  "image/jpeg",
  "image/jpg",
  "image/svg+xml",
] as const;

export type CreativeUploadResult = {
  secureUrl: string;
  width?: number;
  height?: number;
  format?: string;
  bytes?: number;
};

export type CreativeValidationError =
  | "type"
  | "size"
  | "empty"
  | "tooSmall";

export function validateCreativeFile(
  file: File,
): CreativeValidationError | null {
  if (file.size === 0) return "empty";
  if (file.size > PLANNER_CREATIVE_MAX_BYTES) return "size";
  if (
    !(PLANNER_CREATIVE_ACCEPTED_TYPES as readonly string[]).includes(file.type)
  ) {
    return "type";
  }
  return null;
}

async function fetchSignature(): Promise<{
  timestamp: number;
  signature: string;
  folder: string;
  cloudName: string;
  apiKey: string;
}> {
  const res = await fetch("/api/planner/creative/sign", { method: "POST" });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`Signing failed: ${res.status} ${body}`);
  }
  return res.json();
}

export async function uploadPlannerCreative(
  file: File,
  opts: { onProgress?: (pct: number) => void } = {},
): Promise<CreativeUploadResult> {
  const validation = validateCreativeFile(file);
  if (validation) {
    throw new Error(`INVALID_${validation.toUpperCase()}`);
  }

  const sig = await fetchSignature();
  const form = new FormData();
  form.append("file", file);
  form.append("api_key", sig.apiKey);
  form.append("timestamp", String(sig.timestamp));
  form.append("signature", sig.signature);
  form.append("folder", sig.folder);

  // XHR 사용 — fetch 는 업로드 진행률을 지원하지 않음
  return new Promise<CreativeUploadResult>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open(
      "POST",
      `https://api.cloudinary.com/v1_1/${sig.cloudName}/image/upload`,
    );
    xhr.upload.addEventListener("progress", (evt) => {
      if (evt.lengthComputable && opts.onProgress) {
        opts.onProgress(Math.round((evt.loaded / evt.total) * 100));
      }
    });
    xhr.addEventListener("load", () => {
      if (xhr.status < 200 || xhr.status >= 300) {
        reject(new Error(`Upload failed: ${xhr.status} ${xhr.responseText}`));
        return;
      }
      try {
        const body = JSON.parse(xhr.responseText);
        resolve({
          secureUrl: body.secure_url,
          width: body.width,
          height: body.height,
          format: body.format,
          bytes: body.bytes,
        });
      } catch (err) {
        reject(err);
      }
    });
    xhr.addEventListener("error", () =>
      reject(new Error("Network error while uploading")),
    );
    xhr.send(form);
  });
}
