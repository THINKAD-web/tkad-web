const SLUG_MAP: Record<string, string> = {
  " ": "-",
  "？": "",
  "?": "",
  "!": "",
  ",": "",
  ".": "",
  "—": "-",
  "–": "-",
  "/": "-",
  "&": "and",
};

/** 한글 제목 → URL slug (로마자 근사 + 타임스탬프 suffix) */
export function slugFromTitle(title: string, prefix: string): string {
  const base = title
    .trim()
    .toLowerCase()
    .replace(/[？?!,.—–/&]/g, (c) => SLUG_MAP[c] ?? c)
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9가-힣-]/g, "")
    .slice(0, 48);

  const roman = base.replace(/[가-힣]+/g, "") || "article";
  const hash = Buffer.from(title).toString("base64url").slice(0, 6).toLowerCase();
  return `${prefix}-${roman}-${hash}`.replace(/--+/g, "-");
}

export function metaFromContent(content: string, maxLen = 160): string {
  const plain = content
    .replace(/^#+\s+/gm, "")
    .replace(/[*_[\]`]/g, "")
    .replace(/\n+/g, " ")
    .trim();
  const sentences = plain.match(/[^.!?]+[.!?]+/g) ?? [plain];
  const joined = sentences.slice(0, 2).join(" ").trim();
  if (joined.length <= maxLen) return joined;
  return `${joined.slice(0, maxLen - 1).trim()}…`;
}

const TAG_KEYWORDS: Record<string, string[]> = {
  OOH: ["OOH", "옥외", "옥외광고"],
  DOOH: ["DOOH", "디지털", "전광판"],
  subway: ["지하철", "스크린도어"],
  budget: ["예산", "200만", "비용", "CPM"],
  beauty: ["뷰티", "화장품"],
  brand: ["브랜드", "인지"],
  gangnam: ["강남"],
  hongdae: ["홍대"],
  seongsu: ["성수"],
};

export function extractTags(title: string, content: string): string[] {
  const text = `${title} ${content}`;
  const tags = new Set<string>();
  for (const [tag, keywords] of Object.entries(TAG_KEYWORDS)) {
    if (keywords.some((k) => text.includes(k))) tags.add(tag);
  }
  if (tags.size === 0) tags.add("OOH");
  return [...tags].slice(0, 8);
}

type InternalLink = { phrase: string; href: string };

const LINK_RULES: { pattern: RegExp; href: string }[] = [
  { pattern: /플래너|AI 플래너|캠페인 플래너/g, href: "/planner" },
  { pattern: /매체 탐색|매체 검색|매체 목록/g, href: "/media" },
  { pattern: /패키지|번들/g, href: "/packages" },
  { pattern: /견적|상담/g, href: "/contact" },
  { pattern: /가이드|초보/g, href: "/guides" },
];

export function injectInternalLinks(content: string): { content: string; links: InternalLink[] } {
  let out = content;
  const links: InternalLink[] = [];
  for (const rule of LINK_RULES) {
    if (rule.pattern.test(out) && !out.includes(`](${rule.href})`)) {
      const match = out.match(rule.pattern);
      if (match?.[0]) {
        links.push({ phrase: match[0], href: rule.href });
      }
    }
  }
  if (links.length === 0 && !out.includes("/planner")) {
    out += `\n\n---\n\n[THINKAD AI 플래너](/planner)로 예산에 맞는 매체를 추천받아 보세요.`;
    links.push({ phrase: "THINKAD AI 플래너", href: "/planner" });
  }
  return { content: out, links };
}

export function applySeoPackage(opts: {
  title: string;
  content: string;
  slugPrefix: string;
}) {
  const { content: linked, links } = injectInternalLinks(opts.content);
  return {
    slug: slugFromTitle(opts.title, opts.slugPrefix),
    metaDescription: metaFromContent(linked),
    tags: extractTags(opts.title, linked),
    contentKo: linked,
    internalLinks: links,
  };
}
