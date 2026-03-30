/**
 * RFC 5987 `filename*` + ASCII `filename` fallback for downloads (Korean 등).
 */
export function attachmentContentDisposition(displayName: string): string {
  const trimmed = displayName.trim() || "document.pdf";
  const asciiSafe = trimmed
    .replace(/["\\]/g, "_")
    .replace(/[^\x20-\x7E]/g, "_")
    .slice(0, 180);
  const fallback = asciiSafe.length > 0 ? asciiSafe : "document.pdf";
  const encoded = encodeURIComponent(trimmed);
  return `attachment; filename="${fallback}"; filename*=UTF-8''${encoded}`;
}
