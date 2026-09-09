/**
 * Count PDF pages from raw bytes without external libraries.
 * Matches jsPDF output: `/Type /Page` objects (excludes catalog `/Type /Pages`).
 */
export function countPdfPagesFromBytes(buf: Uint8Array): number {
  const text = Buffer.from(buf).toString("latin1");
  const matches = text.match(/\/Type\s*\/Page(?!\s*s)/g);
  return matches?.length ?? 0;
}
