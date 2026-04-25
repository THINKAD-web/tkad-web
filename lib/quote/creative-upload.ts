"use client";

/**
 * 견적 마법사 3단계 — 광고 소재 업로드 클라이언트 헬퍼.
 *
 * Planner 의 `lib/planner/creative-upload.ts` 와 거의 동일하나 sign 엔드포인트가 다르고
 * 비디오(MP4) 도 허용한다(디지털 사이니지용). 후속 PR 에서 두 헬퍼를 공통 모듈로
 * 통합 가능 — 현재는 격리 유지.
 */

export const QUOTE_CREATIVE_MAX_BYTES = 30 * 1024 * 1024; // 30 MB (영상 포함)
export const QUOTE_CREATIVE_ACCEPTED_TYPES = [
  "image/png",
  "image/jpeg",
  "image/jpg",
  "image/svg+xml",
  "video/mp4",
] as const;

export type QuoteCreativeUploadResult = {
  secureUrl: string;
  width?: number;
  height?: number;
  format?: string;
  bytes?: number;
  resourceType?: "image" | "video";
};

export type QuoteCreativeValidationError = "type" | "size" | "empty";

export function validateQuoteCreativeFile(
  file: File,
): QuoteCreativeValidationError | null {
  if (file.size === 0) return "empty";
  if (file.size > QUOTE_CREATIVE_MAX_BYTES) return "size";
  if (
    !(QUOTE_CREATIVE_ACCEPTED_TYPES as readonly string[]).includes(file.type)
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
  const res = await fetch("/api/quote/creative/sign", { method: "POST" });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`Signing failed: ${res.status} ${body}`);
  }
  return res.json();
}

export async function uploadQuoteCreative(
  file: File,
  opts: { onProgress?: (pct: number) => void } = {},
): Promise<QuoteCreativeUploadResult> {
  const validation = validateQuoteCreativeFile(file);
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

  const isVideo = file.type.startsWith("video/");
  const endpoint = isVideo
    ? `https://api.cloudinary.com/v1_1/${sig.cloudName}/video/upload`
    : `https://api.cloudinary.com/v1_1/${sig.cloudName}/image/upload`;

  return new Promise<QuoteCreativeUploadResult>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("POST", endpoint);
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
          resourceType: isVideo ? "video" : "image",
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
