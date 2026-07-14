/**
 * 카드·OG 등 plain-text 표시용 — 마크다운 기호 제거.
 * (본문 렌더는 InsightMarkdownBody 사용)
 */
export function stripMarkdown(text: string): string {
  return text
    .replace(/\*\*([^*]+)\*\*/g, "$1")
    .replace(/\*([^*]+)\*/g, "$1")
    .replace(/\*+/g, "")
    .replace(/\|/g, " ")
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    .replace(/\[|\]/g, "")
    .replace(/#{1,6}\s/g, "")
    .replace(/`/g, "")
    .replace(/^[-*•]\s+/gm, "")
    .replace(/^>\s?/gm, "")
    .replace(/\s{2,}/g, " ")
    .trim();
}
