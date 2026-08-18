/**
 * 매체 지표 감사 규칙 (R-01 ~ R-09) — **순수 함수**.
 *
 * DB 접근은 `scripts/audit-media-metrics.ts` 가 담당하고, 판정 로직은
 * 전부 여기 있다. 규칙이 DB 없이 테스트 가능해야 프로덕션에 붙이기 전에
 * 오탐·미탐을 잡을 수 있다.
 */
import { resolveDisplayCpmWon } from "@/lib/media-metrics";
import { classifyMedia, defaultSellingUnit, isStaticMedia } from "./classify";
import {
  CPM_BOUNDS,
  DAYS_PER_MONTH,
  MAX_DAILY_FREQ,
  PLAUSIBLE_DAILY_TRAFFIC_PER_UNIT,
} from "./constants";
import { linearMonthlyDeviation, periodToDays } from "./price";
import type { MediaMetricClass, PriceOption } from "./types";

export type Severity = "P0" | "P1" | "P2";

export type RuleId =
  | "R-01"
  | "R-02"
  | "R-03"
  | "R-04"
  | "R-05"
  | "R-06"
  | "R-07"
  | "R-08"
  | "R-09"
  | "R-10";

export const RULES: Record<RuleId, { severity: Severity; label: string }> = {
  "R-01": { severity: "P0", label: "인구 상한 초과" },
  "R-02": { severity: "P0", label: "CPM 범위 이탈" },
  "R-03": { severity: "P0", label: "기간 환산 불일치" },
  "R-04": { severity: "P0", label: "DOOH SOV 필드 없음" },
  "R-05": { severity: "P0", label: "단위 불일치" },
  "R-06": { severity: "P1", label: "본문·계산 유동인구 괴리" },
  "R-07": { severity: "P1", label: "필수 필드 결손" },
  "R-08": { severity: "P2", label: "slug/cuid 중복 URL" },
  "R-09": { severity: "P2", label: "meta-keywords 타매체 혼입" },
  "R-10": { severity: "P1", label: "country 이상 (U-series)" },
};

/** 감사 대상 매체 — DB `Media` 에서 읽는 필드만 */
export type AuditMediaRow = {
  id: string;
  slug: string | null;
  name: string;
  type: string;
  region: string;
  regionMain: string | null;
  location: string;
  description: string | null;
  price: number;
  pricePeriod: string;
  priceOptions: unknown;
  priceNote: string | null;
  widthM: number | null;
  heightM: number | null;
  resolution: string | null;
  targetAge: string | null;
  dailyFootfall: number | null;
  impressions: number | null;
  cpm: number | null;
  mediaMainCategory: string | null;
  mediaSubCategory: string | null;
  latitude: number | null;
  tags: string[];
  nearbyStations: string | null;
  nearbyLandmarks: string | null;
  /** U-series — ISO 3166-1 alpha-2 (migration 전에는 undefined) */
  country?: string | null;
};

export type Violation = {
  rule: RuleId;
  severity: Severity;
  mediaId: string;
  slug: string | null;
  name: string;
  mediaClass: MediaMetricClass;
  message: string;
  detail?: Record<string, unknown>;
};

export type CpmSample = {
  mediaId: string;
  slug: string | null;
  name: string;
  mediaClass: MediaMetricClass;
  currentCpm: number | null;
  bounds: readonly [number, number];
  monthlyImpressions: number;
  price: number;
};

/**
 * PR-3 에서 추가될 필드 — 지금은 스키마에 컬럼 자체가 없다.
 * "값이 비었다"가 아니라 "컬럼이 없다"이므로 결손율은 항상 100% 다.
 */
export const SCHEMA_MISSING_FIELDS = [
  "sellingUnit",
  "contactRate",
  "spotDuration",
  "loopDuration",
  "playsPerHour",
  "coverageDongs",
  "coveragePopulation",
  "resolutionW",
  "resolutionH",
  "aspectRatio",
  "fileFormats",
  "submissionDeadline",
  "regionCode",
] as const;

/** 현행 스키마에 존재하지만 비어 있을 수 있는 필드 */
export const NULLABLE_FIELDS = [
  "dailyFootfall",
  "impressions",
  "resolution",
  "targetAge",
  "widthM",
  "heightM",
  "priceOptions",
  "mediaMainCategory",
  "mediaSubCategory",
  "regionMain",
  "latitude",
] as const;

// ─────────────────────────────────────────────────────────────────
// 파서
// ─────────────────────────────────────────────────────────────────

function num(v: unknown): number | null {
  if (typeof v !== "number" || !Number.isFinite(v)) return null;
  return v;
}

/** DB priceOptions(JSON) + price/pricePeriod → 엔진 PriceOption[] */
export function readPriceOptions(row: AuditMediaRow): PriceOption[] {
  const out: PriceOption[] = [];

  const baseDays = periodToDays(row.pricePeriod);
  if (baseDays != null && row.price > 0) {
    out.push({ days: baseDays, price: row.price, id: "base", label: "기본가" });
  }

  if (Array.isArray(row.priceOptions)) {
    row.priceOptions.forEach((raw, idx) => {
      if (!raw || typeof raw !== "object") return;
      const o = raw as Record<string, unknown>;
      const price = num(o.price);
      if (price == null || price <= 0) return;
      const days = periodToDays(
        typeof o.period === "string" ? o.period : row.pricePeriod,
      );
      if (days == null) return;
      out.push({
        days,
        price,
        id: `po-${idx}`,
        label: typeof o.label === "string" ? o.label : undefined,
      });
    });
  }

  return out;
}

/** 현행 프로덕션이 카드·목록에 보여주는 월 노출 (lib/media-metrics 와 동일 규칙) */
export function currentMonthlyImpressions(row: AuditMediaRow): number {
  const imp = row.impressions;
  if (typeof imp === "number" && Number.isFinite(imp) && imp > 0) {
    return Math.round(imp);
  }
  return Math.round(Math.max(0, row.dailyFootfall ?? 0) * DAYS_PER_MONTH);
}

/** 본문에서 "하루 평균 16만 명" / "일 평균 120,000명" 추출 */
export function parseStatedDailyTraffic(text: string | null): number | null {
  if (!text) return null;
  const patterns = [
    /(?:하루|일)\s*(?:평균|기준)?\s*(?:유동\s*인구\s*)?([\d,.]+)\s*(만|천)?\s*명/,
    /(?:일일|1일)\s*([\d,.]+)\s*(만|천)?\s*명/,
  ];
  for (const re of patterns) {
    const m = text.match(re);
    if (!m) continue;
    const base = Number.parseFloat(m[1].replace(/,/g, ""));
    if (!Number.isFinite(base)) continue;
    const unit = m[2];
    const mult = unit === "만" ? 10_000 : unit === "천" ? 1_000 : 1;
    const value = base * mult;
    if (value > 0) return Math.round(value);
  }
  return null;
}

const SELLING_UNIT_PATTERNS: Array<[RegExp, string]> = [
  [/노선\s*(당|전체|기준)/, "route"],
  [/(\d+\s*)?개?\s*역\s*(당|기준)|1\s*개역|역당/, "station"],
  [/(\d+\s*)?대\s*(당|기준)|1\s*대|대당/, "vehicle"],
  [/(\d+\s*)?면\s*(당|기준)|1\s*면|면당/, "panel"],
  [/지점\s*(당|기준)|1\s*개\s*지점/, "site"],
];

/**
 * priceOption 라벨에 명시된 일수 (예: "7일", "1개월", "2주" → 각각 7, 30, 14).
 * 없으면 null.
 */
export function parseLabelDays(label: string | null | undefined): number | null {
  if (!label) return null;
  const t = label.trim();
  const day = t.match(/(\d+)\s*일/);
  if (day) return Math.max(1, Number.parseInt(day[1]!, 10));
  const week = t.match(/(\d+)\s*주/);
  if (week) return Math.max(1, Number.parseInt(week[1]!, 10)) * 7;
  const month = t.match(/(\d+)\s*개월/);
  if (month) return Math.max(1, Number.parseInt(month[1]!, 10)) * 30;
  if (/\b1\s*week\b/i.test(t)) return 7;
  return null;
}

/** 가격 표기·비고·본문에서 선언된 판매 단위를 읽는다 */
export function parseDeclaredSellingUnit(row: AuditMediaRow): string | null {
  const haystack = [
    row.priceNote,
    row.description?.slice(0, 400),
    ...(Array.isArray(row.priceOptions)
      ? row.priceOptions.map((o) =>
          o && typeof o === "object"
            ? String((o as Record<string, unknown>).label ?? "")
            : "",
        )
      : []),
  ]
    .filter(Boolean)
    .join(" ");
  if (!haystack) return null;
  for (const [re, unit] of SELLING_UNIT_PATTERNS) {
    if (re.test(haystack)) return unit;
  }
  return null;
}

/** SOV 근거(초·loop·재생횟수)가 텍스트 어딘가에라도 있는지 */
export function hasAnySovHint(row: AuditMediaRow): boolean {
  const haystack = [
    row.priceNote,
    row.description,
    ...(Array.isArray(row.priceOptions)
      ? row.priceOptions.map((o) => {
          if (!o || typeof o !== "object") return "";
          const r = o as Record<string, unknown>;
          return `${r.label ?? ""} ${r.description ?? ""}`;
        })
      : []),
  ]
    .filter(Boolean)
    .join(" ");
  if (!haystack) return false;
  return /\d+\s*초|loop|루프|회전|시간당\s*\d+\s*회|\d+\s*회\s*\/\s*시/i.test(
    haystack,
  );
}

/** 매체명에서 고유명사 후보 토큰 추출 (R-09 교차 대조용) */
export function distinctiveTokens(name: string): string[] {
  return name
    .split(/[\s·,()[\]/|-]+/)
    .map((t) => t.trim())
    .filter(
      (t) =>
        t.length >= 3 &&
        !/^(광고|전광판|스크린|사이니지|빌보드|외벽|버스|지하철|엘리베이터|디지털|미디어|타워|스퀘어|매체|옥외|led|dooh|ooh)$/i.test(
          t,
        ),
    );
}

// ─────────────────────────────────────────────────────────────────
// 규칙 실행
// ─────────────────────────────────────────────────────────────────

export type AuditAccumulator = {
  violations: Violation[];
  cpmSamples: CpmSample[];
  fieldGaps: Record<string, number>;
};

export function createAccumulator(): AuditAccumulator {
  return { violations: [], cpmSamples: [], fieldGaps: {} };
}

export function classifyRow(row: AuditMediaRow): MediaMetricClass {
  return classifyMedia({
    mainCategory: row.mediaMainCategory,
    subCategory: row.mediaSubCategory,
    type: row.type,
    name: row.name,
    widthM: row.widthM,
    heightM: row.heightM,
  });
}

/** 매체 1건에 대해 R-01 ~ R-07 을 실행한다 (읽기만 한다) */
export function auditRow(row: AuditMediaRow, acc: AuditAccumulator): void {
  const mediaClass = classifyRow(row);

  const push = (
    rule: RuleId,
    message: string,
    detail?: Record<string, unknown>,
  ) => {
    acc.violations.push({
      rule,
      severity: RULES[rule].severity,
      mediaId: row.id,
      slug: row.slug,
      name: row.name,
      mediaClass,
      message,
      detail,
    });
  };

  const monthly = currentMonthlyImpressions(row);
  const daily = row.dailyFootfall ?? 0;

  // ── R-01 인구 상한 ────────────────────────────────────────────
  // PR-3 의 coveragePopulation 이 아직 없으므로 두 대리 지표를 쓴다.
  //   (a) 판매 단위 1개의 현실적 일 OTS 상한
  //   (b) 저장된 월 노출 vs 일 유동인구의 내부 정합
  const trafficCeiling = PLAUSIBLE_DAILY_TRAFFIC_PER_UNIT[mediaClass];
  if (daily > trafficCeiling) {
    push(
      "R-01",
      `판매 단위 1개 기준 일 유동인구 ${daily.toLocaleString()}명 — ${mediaClass} 상한 ${trafficCeiling.toLocaleString()}명 초과 (분모가 노선·지역 전체일 가능성)`,
      { dailyFootfall: daily, ceiling: trafficCeiling, proxy: "per_unit_traffic" },
    );
  } else if (daily > 0 && monthly > daily * DAYS_PER_MONTH * MAX_DAILY_FREQ) {
    push(
      "R-01",
      `월 노출 ${monthly.toLocaleString()}회가 일 유동인구 ${daily.toLocaleString()}명 × ${DAYS_PER_MONTH}일 × ${MAX_DAILY_FREQ}회 상한을 초과`,
      {
        monthlyImpressions: monthly,
        dailyFootfall: daily,
        proxy: "internal_consistency",
      },
    );
  }

  // ── R-02 CPM 정상 범위 ───────────────────────────────────────
  // 현재 프로덕션이 화면에 보여주는 CPM 을 그대로 검사한다.
  // MediaItem 계열은 결측을 undefined 로 표현한다 (DB 의 null 과 다름)
  const currentCpm = resolveDisplayCpmWon({
    cpm: row.cpm ?? undefined,
    price: row.price,
    impressions: row.impressions ?? undefined,
    monthlyFootTraffic: undefined,
    dailyFootTraffic: row.dailyFootfall ?? 0,
  });

  const bounds = CPM_BOUNDS[mediaClass];
  acc.cpmSamples.push({
    mediaId: row.id,
    slug: row.slug,
    name: row.name,
    mediaClass,
    currentCpm,
    bounds,
    monthlyImpressions: monthly,
    price: row.price,
  });

  if (currentCpm != null) {
    if (currentCpm < 1_000) {
      push(
        "R-02",
        `CPM ₩${Math.round(currentCpm).toLocaleString()} — 1,000원 미만은 단위 오류로 간주 (정상 ₩${bounds[0].toLocaleString()}~₩${bounds[1].toLocaleString()})`,
        { cpm: currentCpm, bounds, unitError: true },
      );
    } else if (currentCpm < bounds[0] || currentCpm > bounds[1]) {
      push(
        "R-02",
        `CPM ₩${Math.round(currentCpm).toLocaleString()} — ${mediaClass} 정상 범위 ₩${bounds[0].toLocaleString()}~₩${bounds[1].toLocaleString()} 이탈`,
        { cpm: currentCpm, bounds },
      );
    }
  }

  // ── R-03 기간 정규화 일관성 ──────────────────────────────────
  const deviation = linearMonthlyDeviation(readPriceOptions(row));
  if (deviation != null && Math.abs(deviation) > 0.1) {
    push(
      "R-03",
      `일/주 단가 선형 환산이 실제 월 상품가와 ${(deviation * 100).toFixed(0)}% 괴리 — 선형 환산 금지`,
      { deviation },
    );
  }

  // ── R-04 loop 매체 SOV 근거 ──────────────────────────────────
  const isLoopMedia = !isStaticMedia({
    subCategory: row.mediaSubCategory,
    type: row.type,
  });
  if (isLoopMedia && !hasAnySovHint(row)) {
    push(
      "R-04",
      "loop 매체인데 소재 길이·loop 길이·시간당 재생 횟수 근거가 없음 — SOV 미적용 시 노출 과다",
      { type: row.type, subCategory: row.mediaSubCategory },
    );
  }

  // ── R-05 판매 단위 vs 노출 단위 ──────────────────────────────
  const declaredUnit = parseDeclaredSellingUnit(row);
  const expectedUnit = defaultSellingUnit(mediaClass);
  if (declaredUnit && declaredUnit !== expectedUnit) {
    push(
      "R-05",
      `가격 표기 판매 단위(${declaredUnit})와 ${mediaClass} 기본 단위(${expectedUnit}) 불일치`,
      { declaredUnit, expectedUnit },
    );
  } else if (
    declaredUnit === "vehicle" &&
    daily > PLAUSIBLE_DAILY_TRAFFIC_PER_UNIT.bus_exterior
  ) {
    push(
      "R-05",
      `가격은 1대 기준인데 유동인구 ${daily.toLocaleString()}명은 노선 전체 규모 — 분자·분모 단위 불일치`,
      { declaredUnit, dailyFootfall: daily },
    );
  }

  // R-05b — priceOption 라벨 일수 vs period 키가 어긋난 레코드.
  // ₩954,545 의 근본 원인이 코드가 아니라 데이터일 가능성이 높다:
  // "1개월" 라벨에 period="day" 가 붙어 있으면 어느 계산기든 30배 틀린다.
  // PR-5a 는 우선 상품가를 신뢰하도록 우회했지만, unit 을 읽는 legacy
  // 코드는 여전히 틀리므로 감사가 잡아준다.
  if (Array.isArray(row.priceOptions)) {
    row.priceOptions.forEach((raw, idx) => {
      if (!raw || typeof raw !== "object") return;
      const opt = raw as Record<string, unknown>;
      const label = typeof opt.label === "string" ? opt.label : "";
      const labelDays = parseLabelDays(label);
      const periodStr =
        typeof opt.period === "string" ? opt.period : row.pricePeriod;
      const periodDays = periodToDays(periodStr);
      if (labelDays == null || periodDays == null) return;
      if (labelDays !== periodDays) {
        push(
          "R-05",
          `priceOptions[${idx}] 라벨 "${label}"(${labelDays}일)과 period="${periodStr}"(${periodDays}일) 불일치 — 견적·CPM 계산기가 다른 값을 낸다`,
          { optionIdx: idx, label, labelDays, period: periodStr, periodDays },
        );
      }
    });
  }

  // R-05c — 매체 이름·설명에 "1개월"이 있는데 pricePeriod 가 "day"/"week"
  // 인 경우. M-CITY 케이스가 여기 해당한다 (홈 카드 ₩954,545 의 진짜 뿌리).
  const nameDays = parseLabelDays(row.name);
  const baseDays = periodToDays(row.pricePeriod);
  if (nameDays != null && baseDays != null && nameDays !== baseDays) {
    push(
      "R-05",
      `매체명에 "${nameDays}일" 표현이 있으나 pricePeriod="${row.pricePeriod}"(${baseDays}일) — 이름이 상품가 기간을 오라벨링했을 가능성`,
      { nameDays, pricePeriod: row.pricePeriod, baseDays },
    );
  }

  // R-05d — priceOptions 가 비어 있고 base row 만 있는 매체 (R-7).
  //   `mediaPriceOptions` 의 "자기모순 base 폐기" 는 명시 옵션이 있을 때만
  //   동작한다. base 만 있는 매체는 폐기할 대상이 없어 pricePeriod 오라벨
  //   문제(day 로 잘못 기재된 M-CITY 계열)에 노출된 채 남는다.
  //   여기서는 이런 매체를 별도 목록으로 잡아 PR-4 데이터 정정 큐에 담는다.
  const hasExplicitOptions =
    Array.isArray(row.priceOptions) &&
    row.priceOptions.some((o) => {
      if (!o || typeof o !== "object") return false;
      const opt = o as Record<string, unknown>;
      const price = opt.price;
      return typeof price === "number" && price > 0;
    });
  if (!hasExplicitOptions && row.price > 0 && baseDays != null) {
    const riskyPeriod = baseDays < 7; // day / week 이하 → 30배·4배 부풀림 위험
    push(
      "R-05",
      `priceOptions 비어 있고 base row 만 있음 (price=₩${row.price.toLocaleString()}, pricePeriod="${row.pricePeriod}") — base 폐기 안전망이 없어 pricePeriod 오라벨 시 견적이 그대로 부풀어 오른다${riskyPeriod ? " ⚠ 특히 위험" : ""}`,
      {
        baseOnly: true,
        price: row.price,
        pricePeriod: row.pricePeriod,
        baseDays,
        riskyPeriod,
      },
    );
  }

  // ── R-06 본문 서술 vs 데이터 유동인구 ────────────────────────
  const stated = parseStatedDailyTraffic(row.description);
  if (stated != null && daily > 0) {
    const gap = Math.abs(stated - daily) / stated;
    if (gap > 0.3) {
      push(
        "R-06",
        `본문 "하루 ${stated.toLocaleString()}명" vs 데이터 ${daily.toLocaleString()}명 — ${(gap * 100).toFixed(0)}% 괴리`,
        { stated, dailyFootfall: daily, gap },
      );
    }
  } else if (stated != null && daily === 0) {
    push(
      "R-06",
      `본문에 "하루 ${stated.toLocaleString()}명" 서술이 있으나 dailyFootfall 미입력`,
      { stated },
    );
  }

  // ── R-10 country (U-series) ───────────────────────────────────
  if (Object.prototype.hasOwnProperty.call(row, "country")) {
    const raw = row.country;
    const code =
      typeof raw === "string" && raw.trim() ? raw.trim().toUpperCase() : null;
    if (!code) {
      acc.fieldGaps.country = (acc.fieldGaps.country ?? 0) + 1;
      push("R-10", "country 컬럼 null/empty — planner KR 필터에서 제외될 수 있음", {
        country: raw,
      });
    } else {
      const valid = ["KR", "JP", "US", "CN", "SG", "OTHER"].includes(code);
      if (!valid) {
        push("R-10", `country="${code}" — 허용 코드(KR/JP/US/CN/SG/OTHER) 밖`, {
          country: code,
        });
      }
      if (code !== "KR") {
        const lat = row.latitude;
        const lng = row.longitude;
        const hasCoords =
          lat != null &&
          lng != null &&
          Number.isFinite(lat) &&
          Number.isFinite(lng) &&
          !(lat === 0 && lng === 0);
        if (!hasCoords) {
          push(
            "R-10",
            `해외(country=${code}) 매체인데 latitude/longitude 없음 — admin 수동 좌표 필요`,
            { country: code },
          );
        }
        const rm = row.regionMain?.trim().toLowerCase();
        const koreanSido = [
          "seoul",
          "busan",
          "incheon",
          "daegu",
          "gwangju",
          "daejeon",
          "ulsan",
          "sejong",
          "gyeonggi",
          "gangwon",
          "chungbuk",
          "chungnam",
          "jeonbuk",
          "jeonnam",
          "gyeongbuk",
          "gyeongnam",
          "jeju",
          "national",
        ];
        if (rm && koreanSido.includes(rm)) {
          push(
            "R-10",
            `해외(country=${code})인데 regionMain="${row.regionMain}" — 17시도 taxonomy 오염`,
            { country: code, regionMain: row.regionMain },
          );
        }
      }
    }
  }

  // ── R-07 필수 필드 결손 ──────────────────────────────────────
  const missing: string[] = [];
  const rowRecord = row as unknown as Record<string, unknown>;
  for (const field of NULLABLE_FIELDS) {
    const v = rowRecord[field];
    const empty =
      v == null ||
      v === "" ||
      (Array.isArray(v) && v.length === 0) ||
      (field === "resolution" && typeof v === "string" && /문의/.test(v));
    if (empty) {
      missing.push(field);
      acc.fieldGaps[field] = (acc.fieldGaps[field] ?? 0) + 1;
    }
  }
  for (const field of SCHEMA_MISSING_FIELDS) {
    acc.fieldGaps[field] = (acc.fieldGaps[field] ?? 0) + 1;
  }
  if (missing.length > 0) {
    push("R-07", `필수 필드 ${missing.length}개 결손: ${missing.join(", ")}`, {
      missing,
    });
  }
}

/** R-08 / R-09 — 매체 간 교차 검사 */
export function auditCrossMedia(
  rows: readonly AuditMediaRow[],
  acc: AuditAccumulator,
): void {
  // R-08 — slug 와 cuid 두 URL 이 같은 매체를 가리킨다
  for (const row of rows) {
    if (!row.slug) continue;
    acc.violations.push({
      rule: "R-08",
      severity: RULES["R-08"].severity,
      mediaId: row.id,
      slug: row.slug,
      name: row.name,
      mediaClass: classifyRow(row),
      message: `slug(/media/${row.slug})와 cuid(/media/${row.id})가 동시에 유효 — canonical 분산`,
    });
  }

  // R-09 — 다른 매체의 고유명사가 키워드 소스 필드에 혼입
  const tokenOwner = new Map<string, string[]>();
  for (const row of rows) {
    for (const token of distinctiveTokens(row.name)) {
      const owners = tokenOwner.get(token) ?? [];
      owners.push(row.id);
      tokenOwner.set(token, owners);
    }
  }

  for (const row of rows) {
    const ownTokens = new Set(distinctiveTokens(row.name));
    const ownContext = [row.name, row.location, row.region, row.regionMain ?? ""].join(
      " ",
    );

    const keywordSources = [
      ...row.tags,
      ...(row.nearbyLandmarks?.split(",") ?? []),
      ...(row.nearbyStations?.split(",") ?? []),
    ]
      .map((s) => s.trim())
      .filter(Boolean);

    const foreign: string[] = [];
    for (const kw of keywordSources) {
      if (ownTokens.has(kw)) continue;
      if (ownContext.includes(kw)) continue;
      const owners = tokenOwner.get(kw);
      // 다른 매체의 이름 토큰이고, 그 매체가 소수(=고유명사)일 때만 혼입으로 본다
      if (owners && owners.length <= 3 && !owners.includes(row.id)) {
        foreign.push(kw);
      }
    }

    if (foreign.length > 0) {
      acc.violations.push({
        rule: "R-09",
        severity: RULES["R-09"].severity,
        mediaId: row.id,
        slug: row.slug,
        name: row.name,
        mediaClass: classifyRow(row),
        message: `타 매체 고유명사 ${foreign.length}개 혼입: ${foreign.slice(0, 8).join(", ")}`,
        detail: { foreign },
      });
    }
  }
}

/** 전체 감사 — 순수 함수. 같은 입력이면 항상 같은 리포트가 나온다. */
export function auditAll(rows: readonly AuditMediaRow[]): AuditAccumulator {
  const acc = createAccumulator();
  for (const row of rows) auditRow(row, acc);
  auditCrossMedia(rows, acc);
  return acc;
}

/** CPM 범위 이탈 배수 기준 상위 이상치 */
export function topCpmOutliers(
  samples: readonly CpmSample[],
  limit = 20,
): Array<CpmSample & { cpm: number; ratio: number }> {
  return samples
    .filter((s) => s.currentCpm != null)
    .map((s) => {
      const cpm = s.currentCpm as number;
      const [lo, hi] = s.bounds;
      // 위·아래 이탈을 같은 척도로 비교하기 위한 배수
      const ratio = cpm < lo ? lo / Math.max(cpm, 1e-6) : cpm > hi ? cpm / hi : 1;
      return { ...s, cpm, ratio };
    })
    .filter((s) => s.ratio > 1)
    .sort((a, b) => b.ratio - a.ratio)
    .slice(0, limit);
}
