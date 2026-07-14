import { stripMarkdown } from "@/lib/strip-markdown";

/** 카드용 summaryKo — 테이블 헤더·섹션 제목·불완전 bold 등 */
export function isUnusableSummaryLine(line: string): boolean {
  const t = line.trim();
  if (!t) return true;
  if (t.length < 12) return true;
  if (/^\|(\s*[^|]+\s*\|)+\s*$/.test(t)) return true;
  if (/^\|/.test(t) && t.includes("|")) return true;
  if (/^#{1,6}\s/.test(t)) return true;
  if (/^\*\[[^\]]+\]\*\*?$/.test(t)) return true;
  if (/^\*{1,2}[^*\n]{0,40}\*{0,2}$/.test(t) && !/[.!?。]/.test(t)) return true;
  if (/^\*\*[^*]+\*\*$/.test(t) && t.length < 48) return true;
  if (/^[-*•]\s*$/.test(t)) return true;
  return false;
}

export function normalizeSummaryKo(
  candidates: string[],
  fallback: string,
): string {
  for (const raw of candidates) {
    const plain = stripMarkdown(raw.trim());
    if (plain.length >= 12 && !isUnusableSummaryLine(plain)) {
      return plain.length > 280 ? `${plain.slice(0, 277)}…` : plain;
    }
  }
  const fb = stripMarkdown(fallback.trim());
  return fb.length > 0 ? fb : fallback.trim();
}
