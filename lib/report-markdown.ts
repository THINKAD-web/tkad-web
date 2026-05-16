/** 마크다운 헤딩 → 앵커 id */
export function slugifyReportHeading(text: string): string {
  const base = text
    .trim()
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s-]/gu, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
  return base || "section";
}

export type ReportTocItem = {
  id: string;
  level: 2 | 3;
  text: string;
};

export function extractReportToc(markdown: string): ReportTocItem[] {
  const items: ReportTocItem[] = [];
  const used = new Set<string>();
  for (const line of markdown.split("\n")) {
    const m = /^(#{2,3})\s+(.+)$/.exec(line.trim());
    if (!m) continue;
    const level = m[1].length as 2 | 3;
    const text = m[2].replace(/\s+#+\s*$/, "").trim();
    let id = slugifyReportHeading(text);
    let n = 2;
    while (used.has(id)) {
      id = `${slugifyReportHeading(text)}-${n++}`;
    }
    used.add(id);
    items.push({ id, level, text });
  }
  return items;
}

/** 한글 본문 읽기 시간 — 분당 약 500자. */
export function estimateReportReadMinutes(markdown: string): number {
  const len = markdown.replace(/\s+/g, "").length;
  return Math.max(1, Math.round(len / 500));
}
