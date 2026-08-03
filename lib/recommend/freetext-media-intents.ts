/** 자연어에서 추출한 매체 유형 의도 — scoreCategory 가점·감점 */
export type FreetextMediaIntent = "subway" | "bus_wrap" | "billboard";

export function parseFreetextMediaIntents(text: string): FreetextMediaIntent[] {
  const t = text.trim();
  if (!t) return [];

  const intents = new Set<FreetextMediaIntent>();

  if (/지하철|subway/i.test(t)) {
    intents.add("subway");
  }

  if (
    /(?:\d+\s*호선|신분당\s*선|경의[\s·]?중앙\s*선|공항\s*철도|\barex\b|분당\s*선|인천\s*[12]\s*호선)/i.test(
      t,
    )
  ) {
    intents.add("subway");
  }

  if (
    /버스\s*(?:래핑|랩핑|wrap)|(?:래핑|랩핑|wrap)\s*버스|bus\s*wrap/i.test(t)
  ) {
    intents.add("bus_wrap");
  }

  /* 전광판·빌보드·LED 파사드 — digital 전체(역사 아트래핑 등)와 구분 */
  if (
    /전광판|빌보드|billboard|미디어\s*(?:월|타워|파사드)|미디어월|미디어타워|led\s*(?:전광|보드|스크린)?/i.test(
      t,
    )
  ) {
    intents.add("billboard");
  }

  return [...intents];
}

/** 지역 스코어·하드필터 보조 — 파싱 원문 키워드 */
export function extractFreetextLocationKeywords(text: string): string[] {
  const t = text.trim();
  if (!t) return [];

  const kws: string[] = [];
  const rules: { kw: string; re: RegExp }[] = [
    { kw: "명동", re: /명동/i },
    { kw: "을지로", re: /을지로/i },
    { kw: "광화문", re: /광화문/i },
    { kw: "종로", re: /종로/i },
    { kw: "강남", re: /강남/i },
    { kw: "성수", re: /성수/i },
    { kw: "홍대", re: /홍대/i },
    { kw: "신촌", re: /신촌/i },
    { kw: "합정", re: /합정/i },
    { kw: "해운대", re: /해운대/i },
  ];

  for (const { kw, re } of rules) {
    if (re.test(t) && !kws.includes(kw)) kws.push(kw);
  }

  return kws;
}
