/**
 * Bunny Storage 업로드 object path 가드.
 * 한글 NFD 파일명이 스토리지 키로 들어가지 않도록 UUID + ASCII ext만 허용.
 */

const ASCII_PATH_RE = /^[A-Za-z0-9._/-]+$/;
const SAFE_EXT_RE = /^[a-z0-9]{1,8}$/;

/** content-type → ASCII 확장자 (원본 파일명 무시) */
export function bunnyUploadExtFromContentType(contentType: string): string {
  const type = (contentType || "").toLowerCase();
  if (type.includes("png")) return "png";
  if (type.includes("webp")) return "webp";
  if (type.includes("avif")) return "avif";
  if (type.includes("jpeg") || type.includes("jpg")) return "jpg";
  if (type.includes("svg")) return "svg";
  if (type.includes("pdf")) return "pdf";
  return "bin";
}

/**
 * 원본 파일명에서 확장자만 뽑되, 비ASCII·위험 문자는 버리고 content-type으로 폴백.
 * 경로 세그먼트로 파일명 본문을 쓰지 않는다.
 */
export function bunnyUploadExtFromFileName(
  originalFileName: string | null | undefined,
  contentType: string,
): string {
  const name = (originalFileName ?? "").trim();
  const dot = name.lastIndexOf(".");
  if (dot >= 0 && dot < name.length - 1) {
    const ext = name
      .slice(dot + 1)
      .toLowerCase()
      .replace(/[^a-z0-9]/g, "");
    if (SAFE_EXT_RE.test(ext)) return ext;
  }
  return bunnyUploadExtFromContentType(contentType);
}

/** 스토리지 키가 ASCII만 포함하는지 검증 (업로드 직전 강제) */
export function assertAsciiBunnyObjectPath(path: string): string {
  const normalized = path.replace(/^\/+/, "").replace(/\/+$/g, "");
  if (!normalized) {
    throw new Error("BUNNY_PATH_EMPTY");
  }
  if (normalized.includes("..")) {
    throw new Error("BUNNY_PATH_TRAVERSAL");
  }
  if (!ASCII_PATH_RE.test(normalized) || /[^\x00-\x7F]/.test(normalized)) {
    throw new Error("BUNNY_PATH_NOT_ASCII");
  }
  return normalized;
}

/**
 * `prefix/uuid.ext` 형태 ASCII 업로드 키.
 * @param prefix 예: `tkad/admin/2026/07` — ASCII만 허용
 */
export function buildBunnyUuidUploadPath(
  prefix: string,
  ext: string,
  id: string = crypto.randomUUID(),
): string {
  const safePrefix = assertAsciiBunnyObjectPath(prefix.replace(/\/+$/, ""));
  const safeExt = SAFE_EXT_RE.test(ext)
    ? ext
    : bunnyUploadExtFromContentType("");
  const safeId = id.replace(/[^a-fA-F0-9-]/g, "");
  if (!safeId) {
    throw new Error("BUNNY_PATH_BAD_UUID");
  }
  return assertAsciiBunnyObjectPath(`${safePrefix}/${safeId}.${safeExt}`);
}

/** admin 미디어 이미지: `tkad/admin/yyyy/mm/{uuid}.ext` */
export function buildAdminBunnyImageUploadPath(
  contentType: string,
  originalFileName?: string | null,
  now: Date = new Date(),
): string {
  const yyyy = String(now.getUTCFullYear());
  const mm = String(now.getUTCMonth() + 1).padStart(2, "0");
  const ext = bunnyUploadExtFromFileName(originalFileName, contentType);
  return buildBunnyUuidUploadPath(`tkad/admin/${yyyy}/${mm}`, ext);
}
