export type CustomLineDraft = {
  mediaName?: string;
  targeting?: string;
  startDate?: string;
  endDate?: string;
  budgetWon?: number;
  actualReach?: number;
  actualClicks?: number;
  notes?: string;
};

function padDate(y: string, m: string, d: string): string {
  return `${y}-${m.padStart(2, "0")}-${d.padStart(2, "0")}`;
}

function inferYear(month: number, refYear = new Date().getFullYear()): number {
  const now = new Date();
  if (now.getFullYear() === refYear && month > now.getMonth() + 1) {
    return refYear - 1;
  }
  return refYear;
}

function koreanMonthDayRange(
  text: string,
  re: RegExp,
): {
  startDate?: string;
  endDate?: string;
  remaining: string;
} {
  const m = text.match(re);
  if (!m || m.index === undefined) return { remaining: text };

  const startMonth = Number(m[1]);
  const year = inferYear(startMonth);
  const remaining = `${text.slice(0, m.index)} ${text.slice(m.index + m[0].length)}`
    .replace(/\s+/g, " ")
    .trim();

  return {
    startDate: padDate(String(year), m[1]!, m[2]!),
    endDate: padDate(String(year), m[3]!, m[4]!),
    remaining,
  };
}

function extractBudget(text: string): { budgetWon?: number; remaining: string } {
  let remaining = text;

  const patterns: Array<{ re: RegExp; parse: (m: RegExpMatchArray) => number }> =
    [
      {
        re: /₩\s*([0-9,]+)/,
        parse: (m) => Number(m[1]!.replace(/,/g, "")),
      },
      {
        re: /(?:월\s*)?([0-9,]+)\s*만\s*원?/,
        parse: (m) => Number(m[1]!.replace(/,/g, "")) * 10_000,
      },
      {
        re: /([0-9]+(?:\.[0-9]+)?)\s*천\s*만\s*원?/,
        parse: (m) => Math.round(Number(m[1]) * 10_000_000),
      },
      {
        re: /([0-9]{1,3}(?:,[0-9]{3})+|\d{6,})\s*원/,
        parse: (m) => Number(m[1]!.replace(/,/g, "")),
      },
    ];

  for (const { re, parse } of patterns) {
    const hit = remaining.match(re);
    if (hit && hit.index !== undefined) {
      const budgetWon = parse(hit);
      if (budgetWon > 0) {
        remaining = `${remaining.slice(0, hit.index)} ${remaining.slice(hit.index + hit[0].length)}`
          .replace(/\s+/g, " ")
          .trim();
        return { budgetWon, remaining };
      }
    }
  }

  return { remaining };
}

function extractIsoDateRange(text: string): {
  startDate?: string;
  endDate?: string;
  remaining: string;
} {
  const re =
    /(20\d{2})[-./년\s]*(\d{1,2})[-./월\s]*(\d{1,2})일?\s*[~\-–]\s*(20\d{2})[-./년\s]*(\d{1,2})[-./월\s]*(\d{1,2})일?/;
  const m = text.match(re);
  if (!m || m.index === undefined) return { remaining: text };

  const remaining = `${text.slice(0, m.index)} ${text.slice(m.index + m[0].length)}`
    .replace(/\s+/g, " ")
    .trim();
  return {
    startDate: padDate(m[1]!, m[2]!, m[3]!),
    endDate: padDate(m[4]!, m[5]!, m[6]!),
    remaining,
  };
}

function extractKoreanDateRange(text: string): {
  startDate?: string;
  endDate?: string;
  remaining: string;
} {
  const rangePatterns = [
    /(\d{1,2})월\s*(\d{1,2})일?\s*(?:부터|에서)\s*(\d{1,2})월\s*(\d{1,2})일?\s*(?:까지)?/,
    /(\d{1,2})월\s*(\d{1,2})일?\s*[~\-–]\s*(\d{1,2})월\s*(\d{1,2})일?/,
  ];

  for (const re of rangePatterns) {
    const hit = koreanMonthDayRange(text, re);
    if (hit.startDate && hit.endDate) return hit;
  }

  const sameMonth = text.match(
    /(\d{1,2})월\s*(\d{1,2})일?\s*[~\-–]\s*(\d{1,2})일?(?!\s*월)/,
  );
  if (sameMonth && sameMonth.index !== undefined) {
    const month = sameMonth[1]!;
    const year = inferYear(Number(month));
    const remaining = `${text.slice(0, sameMonth.index)} ${text.slice(
      sameMonth.index + sameMonth[0].length,
    )}`
      .replace(/\s+/g, " ")
      .trim();
    return {
      startDate: padDate(String(year), month, sameMonth[2]!),
      endDate: padDate(String(year), month, sameMonth[3]!),
      remaining,
    };
  }

  return { remaining: text };
}

function extractDateRange(text: string): {
  startDate?: string;
  endDate?: string;
  remaining: string;
} {
  const iso = extractIsoDateRange(text);
  if (iso.startDate && iso.endDate) return iso;
  return extractKoreanDateRange(text);
}

function extractParentheticalTargeting(text: string): {
  targeting?: string;
  remaining: string;
} {
  const m = text.match(/\(([^)]+)\)/);
  if (!m || m.index === undefined) return { remaining: text };
  const remaining = `${text.slice(0, m.index)} ${text.slice(m.index + m[0].length)}`
    .replace(/\s+/g, " ")
    .trim();
  return { targeting: m[1]!.trim(), remaining };
}

function extractRegionTargeting(text: string): {
  targeting?: string;
  remaining: string;
} {
  const endRegion = text.match(/([가-힣a-zA-Z0-9·]+)\s+지역\s*타겟\s*$/i);
  if (endRegion && endRegion.index !== undefined) {
    const region = endRegion[1]!.trim();
    const remaining = text.slice(0, endRegion.index).replace(/\s+/g, " ").trim();
    return { targeting: `지역: ${region}`, remaining };
  }

  const labeled = text.match(/타겟(?:팅)?\s*[:：]\s*([가-힣a-zA-Z0-9·,\s]+)$/i);
  if (labeled && labeled.index !== undefined) {
    const remaining = text.slice(0, labeled.index).replace(/\s+/g, " ").trim();
    return { targeting: labeled[1]!.trim(), remaining };
  }

  return { remaining: text };
}

function extractDashMediaHead(text: string): {
  mediaName?: string;
  remaining: string;
} {
  const dash = text.match(/^(.+?)\s*[—–]\s*(.+)$/);
  if (!dash) return { remaining: text };
  const head = dash[1]!.trim();
  const tail = dash[2]!.trim();
  const tailDate = extractDateRange(tail);
  if (tailDate.startDate) {
    return {
      mediaName: head,
      remaining: tailDate.remaining,
    };
  }
  return { remaining: text };
}

function cleanMediaName(raw: string): string {
  return raw
    .replace(/^[—–\-]\s*/, "")
    .replace(/\s*[—–]\s*.*$/, "")
    .replace(/,\s*,/g, ",")
    .replace(/^,+|,+$/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 200);
}

function isLikelyRawInput(mediaName: string, rawText: string): boolean {
  const a = mediaName.trim();
  const b = rawText.trim();
  if (!a) return true;
  if (a === b) return true;
  if (a.length > 80 && b.length > 60 && a.length / b.length > 0.85) return true;
  return false;
}

/** Heuristic parser for free-text briefs (regex/keyword only). */
export function parseCustomLineFromText(text: string): CustomLineDraft {
  const trimmed = text.trim();
  if (!trimmed) return {};

  let work = trimmed;
  const result: CustomLineDraft = {};

  const budgetHit = extractBudget(work);
  if (budgetHit.budgetWon) {
    result.budgetWon = budgetHit.budgetWon;
    work = budgetHit.remaining;
  }

  const dateHit = extractDateRange(work);
  if (dateHit.startDate && dateHit.endDate) {
    result.startDate = dateHit.startDate;
    result.endDate = dateHit.endDate;
    work = dateHit.remaining;
  }

  const parenHit = extractParentheticalTargeting(work);
  if (parenHit.targeting) {
    result.targeting = parenHit.targeting;
    work = parenHit.remaining;
  }

  const regionHit = extractRegionTargeting(work);
  if (regionHit.targeting) {
    result.targeting = result.targeting
      ? `${result.targeting} · ${regionHit.targeting}`
      : regionHit.targeting;
    work = regionHit.remaining;
  }

  const dashHit = extractDashMediaHead(work);
  if (dashHit.mediaName) {
    result.mediaName = cleanMediaName(dashHit.mediaName);
    work = dashHit.remaining;
  } else {
    const mediaName = cleanMediaName(work);
    if (mediaName && !isLikelyRawInput(mediaName, trimmed)) {
      result.mediaName = mediaName;
    }
  }

  if (result.mediaName && isLikelyRawInput(result.mediaName, trimmed)) {
    delete result.mediaName;
  }

  return result;
}

export function validateCustomLineDraft(draft: CustomLineDraft): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];
  if (!draft.mediaName?.trim()) {
    errors.push("매체명을 입력하세요.");
  }
  if (!draft.budgetWon || draft.budgetWon <= 0) {
    errors.push("집행 예산을 입력하세요.");
  }
  if (!draft.startDate?.trim()) {
    errors.push("시작일을 입력하세요.");
  }
  if (!draft.endDate?.trim()) {
    errors.push("종료일을 입력하세요.");
  }
  return { valid: errors.length === 0, errors };
}
