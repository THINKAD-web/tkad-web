/** 기존 enum/slug — 변경 없음 */
export type ExistingTargetSegment =
  | "genz"
  | "millennial"
  | "family"
  | "biz"
  | "mass"
  | "mz"
  | "worker"
  | "tourist";

export type TargetNationality = "domestic" | "foreign" | "mixed";
export type TargetResidency = "resident" | "tourist" | "mixed";

export type TargetProfile = {
  /** 기존 세그먼트. 미파싱 시 null → 엔진 기존 fallback */
  segment: ExistingTargetSegment | null;
  nationality?: TargetNationality;
  /** nationality === "mixed" 일 때만 유효. 합 100 */
  nationalityRatio?: { domestic: number; foreign: number };
  residency?: TargetResidency;
};

/** 파서 출력 — confidence 포함 */
export type ParsedTargetProfile = {
  value: TargetProfile | null;
  confidence: "high" | "low";
  source: string | null;
};
