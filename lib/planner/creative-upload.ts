"use client";

/**
 * 플래너 로고/소재 업로드 클라이언트 헬퍼.
 * Bunny Storage 업로드 프록시:
 * 1) `/api/planner/creative/upload` 로 multipart POST
 * 2) `{ secureUrl }` 반환
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

export async function uploadPlannerCreative(
  file: File,
  opts: { onProgress?: (pct: number) => void } = {},
): Promise<CreativeUploadResult> {
  const validation = validateCreativeFile(file);
  if (validation) {
    throw new Error(`INVALID_${validation.toUpperCase()}`);
  }

  const form = new FormData();
  form.append("file", file);

  // XHR 사용 — fetch 는 업로드 진행률을 지원하지 않음
  return new Promise<CreativeUploadResult>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("POST", "/api/planner/creative/upload");
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
          secureUrl: body.secureUrl,
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
