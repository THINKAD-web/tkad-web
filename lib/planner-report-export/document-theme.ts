/**
 * 플래너 제안서(PDF·PPTX·미리보기) 문서 테마 SSOT.
 * 딥 틸 브랜드(#0D1B2E + #0D9488) 기준 — 3종 스타일 파라미터화.
 */

export type PlannerReportStyle = "minimal" | "brand" | "corporate";

export const DEFAULT_PLANNER_REPORT_STYLE: PlannerReportStyle = "brand";

export const PLANNER_REPORT_STYLES: readonly PlannerReportStyle[] = [
  "minimal",
  "brand",
  "corporate",
] as const;

/** 딥 틸 브랜드 팔레트 (export 전용 — 사이트 globals 와 독립) */
export const REPORT_BRAND = {
  teal: "#0D9488",
  tealSoft: "#CCFBF1",
  tealMuted: "#99F6E4",
  ink: "#0D1B2E",
  inkSoft: "#1E293B",
  slate: "#64748B",
  paper: "#FFFFFF",
  paperMuted: "#F8FAFC",
  gold: "#C8913C",
} as const;

export type ReportCoverMode = "filled" | "minimal" | "formal";

export type ReportDocumentTheme = {
  style: PlannerReportStyle;
  accent: string;
  accentSoft: string;
  ink: string;
  coverBg: string;
  coverText: string;
  coverMuted: string;
  coverMode: ReportCoverMode;
  topAccentBar: boolean;
  sectionAccentBar: boolean;
  heroRadius: string;
  pdf: {
    accentRgb: readonly [number, number, number];
    accentSoftRgb: readonly [number, number, number];
    onAccentMutedRgb: readonly [number, number, number];
    inkRgb: readonly [number, number, number];
    coverBgRgb: readonly [number, number, number];
    coverTextRgb: readonly [number, number, number];
    coverMutedRgb: readonly [number, number, number];
  };
  pptx: {
    accent: string;
    accentLight: string;
    ink: string;
    coverBg: string;
    coverText: string;
    coverMuted: string;
    paper: string;
    gray: string;
  };
};

function hexToRgb(hex: string): readonly [number, number, number] {
  const h = hex.replace("#", "");
  return [
    parseInt(h.slice(0, 2), 16),
    parseInt(h.slice(2, 4), 16),
    parseInt(h.slice(4, 6), 16),
  ] as const;
}

function hexToPptx(hex: string): string {
  return hex.replace("#", "").toUpperCase();
}

function buildTheme(
  style: PlannerReportStyle,
  opts: {
    accent: string;
    accentSoft: string;
    ink: string;
    coverBg: string;
    coverText: string;
    coverMuted: string;
    coverMode: ReportCoverMode;
    topAccentBar: boolean;
    sectionAccentBar: boolean;
    heroRadius: string;
    onAccentMuted: string;
  },
): ReportDocumentTheme {
  return {
    style,
    accent: opts.accent,
    accentSoft: opts.accentSoft,
    ink: opts.ink,
    coverBg: opts.coverBg,
    coverText: opts.coverText,
    coverMuted: opts.coverMuted,
    coverMode: opts.coverMode,
    topAccentBar: opts.topAccentBar,
    sectionAccentBar: opts.sectionAccentBar,
    heroRadius: opts.heroRadius,
    pdf: {
      accentRgb: hexToRgb(opts.accent),
      accentSoftRgb: hexToRgb(opts.accentSoft),
      onAccentMutedRgb: hexToRgb(opts.onAccentMuted),
      inkRgb: hexToRgb(opts.ink),
      coverBgRgb: hexToRgb(opts.coverBg),
      coverTextRgb: hexToRgb(opts.coverText),
      coverMutedRgb: hexToRgb(opts.coverMuted),
    },
    pptx: {
      accent: hexToPptx(opts.accent),
      accentLight: hexToPptx(opts.accentSoft),
      ink: hexToPptx(opts.ink),
      coverBg: hexToPptx(opts.coverBg),
      coverText: hexToPptx(opts.coverText),
      coverMuted: hexToPptx(opts.coverMuted),
      paper: "FFFFFF",
      gray: "64748B",
    },
  };
}

const THEMES: Record<PlannerReportStyle, ReportDocumentTheme> = {
  /** 미니멀 — 흰 표지, 얇은 틸 룰, 여백 중심 */
  minimal: buildTheme("minimal", {
    accent: REPORT_BRAND.teal,
    accentSoft: REPORT_BRAND.tealSoft,
    ink: REPORT_BRAND.ink,
    coverBg: REPORT_BRAND.paper,
    coverText: REPORT_BRAND.ink,
    coverMuted: REPORT_BRAND.slate,
    coverMode: "minimal",
    topAccentBar: true,
    sectionAccentBar: true,
    heroRadius: "1rem",
    onAccentMuted: REPORT_BRAND.slate,
  }),
  /** 브랜드 — 딥 잉크 표지 + 틸 액센트 (기본) */
  brand: buildTheme("brand", {
    accent: REPORT_BRAND.teal,
    accentSoft: REPORT_BRAND.tealSoft,
    ink: REPORT_BRAND.ink,
    coverBg: REPORT_BRAND.ink,
    coverText: REPORT_BRAND.paper,
    coverMuted: "#CBD5E1",
    coverMode: "filled",
    topAccentBar: true,
    sectionAccentBar: true,
    heroRadius: "0",
    onAccentMuted: "#CBD5E1",
  }),
  /** 격식 기업형 — 밝은 표지, 네이비 타이포, 골드·틸 라인 */
  corporate: buildTheme("corporate", {
    accent: REPORT_BRAND.teal,
    accentSoft: REPORT_BRAND.paperMuted,
    ink: REPORT_BRAND.ink,
    coverBg: REPORT_BRAND.paperMuted,
    coverText: REPORT_BRAND.ink,
    coverMuted: REPORT_BRAND.slate,
    coverMode: "formal",
    topAccentBar: false,
    sectionAccentBar: true,
    heroRadius: "0.5rem",
    onAccentMuted: REPORT_BRAND.slate,
  }),
};

export function parsePlannerReportStyle(raw: unknown): PlannerReportStyle {
  if (
    typeof raw === "string" &&
    (PLANNER_REPORT_STYLES as readonly string[]).includes(raw)
  ) {
    return raw as PlannerReportStyle;
  }
  return DEFAULT_PLANNER_REPORT_STYLE;
}

export function getReportDocumentTheme(
  style: PlannerReportStyle = DEFAULT_PLANNER_REPORT_STYLE,
): ReportDocumentTheme {
  return THEMES[style] ?? THEMES.brand;
}

export const REPORT_STYLE_LABELS: Record<
  PlannerReportStyle,
  { ko: string; en: string; descKo: string; descEn: string }
> = {
  minimal: {
    ko: "미니멀",
    en: "Minimal",
    descKo: "흰 배경·얇은 틸 라인·여백 중심",
    descEn: "White canvas, thin teal rules, generous spacing",
  },
  brand: {
    ko: "브랜드",
    en: "Brand",
    descKo: "딥 틸 표지·브랜드 컬러 강조",
    descEn: "Deep teal cover with brand accent",
  },
  corporate: {
    ko: "기업형",
    en: "Corporate",
    descKo: "격식 있는 표지·네이비 타이포·표 중심",
    descEn: "Formal cover, navy typography, table-forward",
  },
};
