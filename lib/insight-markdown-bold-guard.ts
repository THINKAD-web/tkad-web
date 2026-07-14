/**
 * CommonMark bold 는 닫는 ** 직후 조사(은/는/…)가 붙고, bold 내부에
 * `"`, `'`, `(` 가 있으면 파싱이 깨져 raw ** 가 노출된다.
 * 렌더 직전 최소 수정: 해당 경우에만 닫는 ** 뒤 공백 1칸 삽입.
 */
const GUARD_PATTERNS: RegExp[] = [
  /\*\*"([^"]+)"\*\*([가-힣])/g,
  /\*\*'([^']+)'\*\*([가-힣])/g,
  /\*\*([^*\n]*\([^*\n]*\))\*\*([가-힣])/g,
];

export function guardInsightMarkdownBoldParticles(markdown: string): string {
  if (!markdown.includes("**")) return markdown;
  let next = markdown;
  for (const pattern of GUARD_PATTERNS) {
    next = next.replace(pattern, (match, inner, particle) => {
      const open = match.startsWith('**"')
        ? `**"${inner}"`
        : match.startsWith("**'")
          ? `**'${inner}'`
          : `**${inner}`;
      return `${open}** ${particle}`;
    });
  }
  return next;
}
