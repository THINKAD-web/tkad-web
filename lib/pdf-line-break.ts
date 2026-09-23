/** PDF/이메일용 — DB·env에 들어온 literal `\\n` 과 실제 줄바꿈을 모두 분리 */
export function splitPdfLogicalLines(text: string): string[] {
  const normalized = text
    .replace(/\\r\\n/g, "\n")
    .replace(/\\n/g, "\n")
    .replace(/\\r/g, "\n");
  return normalized.split(/\r?\n/);
}
