/** Slug for TrendReport / EducationArticle (unique, URL-safe). */
export function slugFromSeedTitle(title: string, prefix: string): string {
  const base = title
    .trim()
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9가-힣]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 72);
  return `${prefix}-${base || "item"}`.slice(0, 96);
}

export function extractSummaryLines(content: string, count = 3): string[] {
  const lines = content.split("\n").map((l) => l.trim());

  const summaryIdx = lines.findIndex((l) =>
    /핵심\s*요약|executive\s*summary/i.test(l),
  );
  const start = summaryIdx >= 0 ? summaryIdx + 1 : 0;
  const picked: string[] = [];

  for (let i = start; i < lines.length && picked.length < count; i++) {
    const line = lines[i];
    if (!line) continue;
    if (/^#{1,3}\s/.test(line)) break;
    const cleaned = line.replace(/^[-*•]\s*/, "").trim();
    if (cleaned.length > 8) picked.push(cleaned);
  }

  if (picked.length >= count) return picked.slice(0, count);

  for (const line of lines) {
    if (!line || /^#{1,3}\s/.test(line)) continue;
    const cleaned = line.replace(/^[-*•]\s*/, "").trim();
    if (cleaned.length > 12 && !picked.includes(cleaned)) {
      picked.push(cleaned);
    }
    if (picked.length >= count) break;
  }

  while (picked.length < count) {
    picked.push("THINKAD 싱커드 리포트 요약");
  }
  return picked.slice(0, count);
}

export function extractBulletLines(content: string, max = 5): string[] {
  const bullets: string[] = [];
  for (const line of content.split("\n")) {
    const t = line.trim();
    if (/^[-*•]\s+/.test(t) || /^\d+\.\s+/.test(t)) {
      const cleaned = t.replace(/^[-*•\d.]+\s*/, "").trim();
      if (cleaned.length > 4) bullets.push(cleaned);
    }
    if (bullets.length >= max) break;
  }
  return bullets;
}

export function splitMarkdownSections(
  content: string,
): { title: string; content: string }[] {
  const sections: { title: string; content: string }[] = [];
  let currentTitle = "본문";
  let buffer: string[] = [];

  const flush = () => {
    const body = buffer.join("\n").trim();
    if (body) sections.push({ title: currentTitle, content: body });
    buffer = [];
  };

  for (const line of content.split("\n")) {
    const h2 = line.match(/^##\s+(.+)$/);
    if (h2) {
      flush();
      currentTitle = h2[1].trim();
      continue;
    }
    buffer.push(line);
  }
  flush();

  if (sections.length === 0) {
    return [{ title: "본문", content: content.trim() }];
  }
  return sections;
}

export function sectionByKeyword(
  sections: { title: string; content: string }[],
  pattern: RegExp,
): string {
  const hit = sections.find((s) => pattern.test(s.title));
  return hit?.content.trim() ?? "";
}

export function firstParagraph(text: string, maxLen = 280): string {
  const para = text
    .split(/\n\n+/)
    .map((p) => p.replace(/^#+\s+/gm, "").trim())
    .find((p) => p.length > 20);
  if (!para) return text.slice(0, maxLen).trim();
  return para.length > maxLen ? `${para.slice(0, maxLen)}…` : para;
}
