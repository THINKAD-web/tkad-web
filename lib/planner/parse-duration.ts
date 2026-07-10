import type { ParsedField } from "@/lib/planner/parse-freetext-brief";

export type DurationFields = {
  durationDays: ParsedField<number>;
  months: ParsedField<number>;
};

type Field<T> = ParsedField<T>;

function field<T>(
  value: T,
  confidence: "high" | "low",
  source: string,
): Field<T> {
  return { value, confidence, source };
}

function emptyField<T>(): Field<T> {
  return { value: null, confidence: "low", source: null };
}

/** 2주 미만은 months=1 유지, durationDays는 별도 보존 */
export function monthsFromDurationDays(
  days: number,
  explicitMonths: number | null,
): number {
  if (explicitMonths != null) return explicitMonths;
  if (days < 14) return 1;
  return Math.min(36, Math.max(1, Math.ceil(days / 30)));
}

function daysInclusive(start: Date, end: Date): number {
  const ms = end.getTime() - start.getTime();
  if (ms < 0) return 0;
  return Math.floor(ms / 86_400_000) + 1;
}

function buildDate(year: number, month: number, day: number): Date | null {
  if (month < 1 || month > 12 || day < 1 || day > 31) return null;
  const d = new Date(year, month - 1, day);
  if (
    d.getFullYear() !== year ||
    d.getMonth() !== month - 1 ||
    d.getDate() !== day
  ) {
    return null;
  }
  return d;
}

function inferYear(text: string): number {
  const y = text.match(/(20\d{2})\s*년/);
  if (y?.[1]) return Number(y[1]);
  return new Date().getFullYear();
}

function parseDateRangeDays(
  text: string,
): { days: number; source: string } | null {
  const year = inferYear(text);

  const fullKo = text.match(
    /(20\d{2})\s*년\s*(\d{1,2})\s*월\s*(\d{1,2})\s*일?\s*(?:부터\s*)?[~\-–]\s*(\d{1,2})\s*월\s*(\d{1,2})\s*일?/i,
  );
  if (fullKo) {
    const y = Number(fullKo[1]);
    const start = buildDate(y, Number(fullKo[2]), Number(fullKo[3]));
    const end = buildDate(y, Number(fullKo[4]), Number(fullKo[5]));
    if (start && end) {
      const days = daysInclusive(start, end);
      if (days > 0 && days <= 366) {
        return { days, source: fullKo[0].trim() };
      }
    }
  }

  const sameYearKo = text.match(
    /(\d{1,2})\s*월\s*(\d{1,2})\s*일?\s*(?:부터\s*)?[~\-–]\s*(\d{1,2})\s*월\s*(\d{1,2})\s*일?/i,
  );
  if (sameYearKo) {
    const start = buildDate(
      year,
      Number(sameYearKo[1]),
      Number(sameYearKo[2]),
    );
    const end = buildDate(year, Number(sameYearKo[3]), Number(sameYearKo[4]));
    if (start && end) {
      const days = daysInclusive(start, end);
      if (days > 0 && days <= 366) {
        return { days, source: sameYearKo[0].trim() };
      }
    }
  }

  const compactKo = text.match(
    /(20\d{2})\s*년\s*(\d{1,2})\s*월\s*(\d{1,2})\s*일?\s*[~\-–]\s*(\d{1,2})\s*일?/i,
  );
  if (compactKo) {
    const y = Number(compactKo[1]);
    const m = Number(compactKo[2]);
    const start = buildDate(y, m, Number(compactKo[3]));
    const end = buildDate(y, m, Number(compactKo[4]));
    if (start && end) {
      const days = daysInclusive(start, end);
      if (days > 0 && days <= 366) {
        return { days, source: compactKo[0].trim() };
      }
    }
  }

  const slashEndDay = text.match(
    /(?:(20\d{2})\s*[년/.-]\s*)?(\d{1,2})\s*[/.]\s*(\d{1,2})\s*[~\-–]\s*(\d{1,2})(?!\s*[/.])/i,
  );
  if (slashEndDay) {
    const y = slashEndDay[1] ? Number(slashEndDay[1]) : year;
    const m = Number(slashEndDay[2]);
    const start = buildDate(y, m, Number(slashEndDay[3]));
    const end = buildDate(y, m, Number(slashEndDay[4]));
    if (start && end) {
      const days = daysInclusive(start, end);
      if (days > 0 && days <= 366) {
        return { days, source: slashEndDay[0].trim() };
      }
    }
  }

  const slashFull = text.match(
    /(?:(20\d{2})\s*[년/.-]\s*)?(\d{1,2})\s*[/.]\s*(\d{1,2})\s*[~\-–]\s*(\d{1,2})\s*[/.]\s*(\d{1,2})/i,
  );
  if (slashFull) {
    const y = slashFull[1] ? Number(slashFull[1]) : year;
    const start = buildDate(y, Number(slashFull[2]), Number(slashFull[3]));
    const end = buildDate(y, Number(slashFull[4]), Number(slashFull[5]));
    if (start && end) {
      const days = daysInclusive(start, end);
      if (days > 0 && days <= 366) {
        return { days, source: slashFull[0].trim() };
      }
    }
  }

  return null;
}

function parseDayWeekPatterns(
  text: string,
): { days: number; source: string } | null {
  const dayRange = text.match(/(\d{1,2})\s*[-~–]\s*(\d{1,2})\s*일(?:간)?/i);
  if (dayRange) {
    const a = Number(dayRange[1]);
    const b = Number(dayRange[2]);
    const days = Math.max(a, b);
    if (days >= 1 && days <= 366) {
      return { days, source: dayRange[0].trim() };
    }
  }

  const weeks = text.match(/(\d{1,2})\s*주(?:간)?/i);
  if (weeks?.[1]) {
    const n = Number(weeks[1]);
    if (n >= 1 && n <= 52) {
      return { days: n * 7, source: weeks[0].trim() };
    }
  }

  const daysOnly = text.match(/(\d{1,3})\s*일(?:간)?/i);
  if (daysOnly?.[1]) {
    const n = Number(daysOnly[1]);
    if (n >= 1 && n <= 366) {
      return { days: n, source: daysOnly[0].trim() };
    }
  }

  return null;
}

function parseExplicitMonths(text: string): Field<number> {
  const explicit = text.match(/(\d+)\s*(?:개월|달)(?:\s*간)?/i);
  if (explicit?.[1]) {
    const n = Number(explicit[1]);
    if (n >= 1 && n <= 36) {
      return field(n, "high", explicit[0]);
    }
  }
  if (/한\s*달|1\s*달/i.test(text)) {
    return field(1, "high", "한 달");
  }
  if (/석\s*달|세\s*달/i.test(text)) {
    return field(3, "high", "석달");
  }
  if (/분기/i.test(text)) {
    return field(3, "high", "분기");
  }
  if (/반년|반기/i.test(text)) {
    return field(6, "high", text.match(/반년|반기/)![0]!);
  }
  if (/(?:1|일)\s*년/i.test(text)) {
    return field(12, "high", "1년");
  }
  return emptyField();
}

/** 일·주·날짜범위 + 기존 월 단위 패턴 통합 */
export function parseDurationFields(text: string): DurationFields {
  const explicitMonths = parseExplicitMonths(text);

  const range = parseDateRangeDays(text);
  if (range) {
    const monthsVal = monthsFromDurationDays(
      range.days,
      explicitMonths.value,
    );
    return {
      durationDays: field(range.days, "high", range.source),
      months:
        explicitMonths.value != null
          ? explicitMonths
          : field(monthsVal, "high", range.source),
    };
  }

  const dayWeek = parseDayWeekPatterns(text);
  if (dayWeek) {
    const monthsVal = monthsFromDurationDays(
      dayWeek.days,
      explicitMonths.value,
    );
    return {
      durationDays: field(dayWeek.days, "high", dayWeek.source),
      months:
        explicitMonths.value != null
          ? explicitMonths
          : field(monthsVal, "high", dayWeek.source),
    };
  }

  if (explicitMonths.value != null) {
    return {
      durationDays: emptyField(),
      months: explicitMonths,
    };
  }

  return {
    durationDays: emptyField(),
    months: emptyField(),
  };
}
