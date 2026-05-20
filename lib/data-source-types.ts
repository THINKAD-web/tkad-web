/** 데이터 신뢰도 등급 */
export type DataConfidenceLevel = "high" | "medium" | "low" | "estimated";

/** 통합 데이터 소스 ID */
export type DataSourceId =
  | "seoul_metro"
  | "seoul_bus"
  | "seoul_tourism"
  | "sgis"
  | "kt_bigdata"
  | "skt_bigdata"
  | "thinkad_internal"
  | "heuristic";

export type DataSourceAttribution = {
  sourceId: DataSourceId;
  labelKo: string;
  labelEn: string;
  level: DataConfidenceLevel;
  /** 0–100 */
  confidenceScore: number;
};

export const CONFIDENCE_EMOJI: Record<DataConfidenceLevel, string> = {
  high: "🟢",
  medium: "🟡",
  low: "🟠",
  estimated: "⚪",
};

export function confidenceLabel(
  attr: DataSourceAttribution,
  isKo: boolean,
): string {
  const emoji = CONFIDENCE_EMOJI[attr.level];
  return `${emoji} ${isKo ? attr.labelKo : attr.labelEn}`;
}

export type AgeGenderDistribution = {
  age20s: number;
  age30s: number;
  age40s: number;
  age50plus: number;
  male: number;
  female: number;
};

export type WeatherSensitivity = "low" | "medium" | "high";

export type EventSynergy = {
  labelKo: string;
  labelEn: string;
  boostPct: number;
};

export type CompetitorOohInsight = {
  industry: string;
  topMediaNames: string[];
  campaignCount: number;
  periodLabelKo: string;
};

export type FusedMediaData = {
  mediaId: string;
  dailyFootfall: number;
  trafficPattern: {
    hourly: number[];
    weekly: number[];
    monthly: number[];
    updatedAt: string;
    sources: DataSourceId[];
  };
  ageGender: AgeGenderDistribution;
  commerce: { cafe: number; office: number; shopping: number; residential: number };
  attributions: DataSourceAttribution[];
  overallConfidence: number;
  isEstimated: boolean;
  weatherSensitivity: WeatherSensitivity;
  weatherInsightKo: string;
  weatherInsightEn: string;
  eventSynergies: EventSynergy[];
  methodologyKo: string[];
  methodologyEn: string[];
  competitorOoh?: CompetitorOohInsight[];
};

export type PartialSourcePayload = {
  sourceId: DataSourceId;
  weight: number;
  confidence: number;
  dailyFootfall?: number;
  hourly?: number[];
  weekly?: number[];
  monthly?: number[];
  ageGender?: AgeGenderDistribution;
  commerce?: FusedMediaData["commerce"];
  labelKo: string;
  labelEn: string;
  level: DataConfidenceLevel;
};
