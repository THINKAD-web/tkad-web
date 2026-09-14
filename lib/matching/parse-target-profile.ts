import type {
  ExistingTargetSegment,
  ParsedTargetProfile,
  TargetNationality,
  TargetProfile,
  TargetResidency,
} from "@/lib/matching/target-profile";

const DOMESTIC_ONLY_RE = /내국인(?![^\n]{0,40}외국인)/i;
const FOREIGN_ONLY_RE = /외국인(?![^\n]{0,40}내국인)/i;
const MIXED_RATIO_RE =
  /내국인\s*(\d+)\s*%\s*(?:\+|과|와|\/|\s)*\s*외국인\s*(\d+)\s*%/i;
const MIXED_RATIO_REV_RE =
  /외국인\s*(\d+)\s*%\s*(?:\+|과|와|\/|\s)*\s*내국인\s*(\d+)\s*%/i;
const RESIDENT_RE = /제주\s*도민|도민|현지\s*주민|지역\s*주민|로컬\s*주민/i;
const TOURIST_RE = /관광객|여행객|방문객|관광\s*객/i;
const MIXED_RESIDENCY_RE =
  /(?:도민|주민|로컬)[^\n]{0,24}(?:관광|여행)|(?:관광|여행)[^\n]{0,24}(?:도민|주민)/i;

function applySegmentDefaults(profile: TargetProfile): TargetProfile {
  const segment = profile.segment;
  if (segment != null) return profile;

  if (profile.residency === "tourist") {
    return { ...profile, segment: "tourist" };
  }
  if (profile.residency === "resident") {
    return { ...profile, segment: "mass" };
  }
  return profile;
}

function parseNationality(text: string): {
  nationality?: TargetNationality;
  ratio?: { domestic: number; foreign: number };
  source?: string;
} {
  const mixed = text.match(MIXED_RATIO_RE) ?? text.match(MIXED_RATIO_REV_RE);
  if (mixed) {
    const a = Number(mixed[1]);
    const b = Number(mixed[2]);
    const isRev = MIXED_RATIO_REV_RE.test(mixed[0]);
    const domestic = isRev ? b : a;
    const foreign = isRev ? a : b;
    if (Number.isFinite(domestic) && Number.isFinite(foreign)) {
      return {
        nationality: "mixed",
        ratio: { domestic, foreign },
        source: mixed[0].trim(),
      };
    }
  }

  const hasDomestic = /내국인/i.test(text);
  const hasForeign = /외국인/i.test(text);
  if (hasDomestic && hasForeign) {
    return { nationality: "mixed", source: "내국인+외국인" };
  }
  if (DOMESTIC_ONLY_RE.test(text) || (hasDomestic && !hasForeign)) {
    const m = text.match(/내국인[^\n]{0,40}/i);
    return { nationality: "domestic", source: m?.[0]?.trim() ?? "내국인" };
  }
  if (FOREIGN_ONLY_RE.test(text) || (hasForeign && !hasDomestic)) {
    const m = text.match(/외국인[^\n]{0,40}/i);
    return { nationality: "foreign", source: m?.[0]?.trim() ?? "외국인" };
  }
  return {};
}

function parseResidency(text: string): {
  residency?: TargetResidency;
  source?: string;
} {
  if (MIXED_RESIDENCY_RE.test(text)) {
    const m = text.match(MIXED_RESIDENCY_RE);
    return { residency: "mixed", source: m?.[0]?.trim() };
  }
  if (RESIDENT_RE.test(text)) {
    const m = text.match(RESIDENT_RE);
    return { residency: "resident", source: m?.[0]?.trim() };
  }
  if (TOURIST_RE.test(text)) {
    const m = text.match(TOURIST_RE);
    return { residency: "tourist", source: m?.[0]?.trim() };
  }
  return {};
}

/** freetext·브리프 원문 → TargetProfile (nationality/residency) */
export function parseTargetProfile(text: string): ParsedTargetProfile {
  const trimmed = text.trim();
  if (!trimmed) {
    return { value: null, confidence: "low", source: null };
  }

  const nat = parseNationality(trimmed);
  const res = parseResidency(trimmed);

  if (!nat.nationality && !res.residency) {
    return { value: null, confidence: "low", source: null };
  }

  const profile: TargetProfile = {
    segment: null,
    ...(nat.nationality ? { nationality: nat.nationality } : {}),
    ...(nat.ratio ? { nationalityRatio: nat.ratio } : {}),
    ...(res.residency ? { residency: res.residency } : {}),
  };

  const value = applySegmentDefaults(profile);
  const source = [nat.source, res.source].filter(Boolean).join(" · ") || null;

  return {
    value,
    confidence: "high",
    source,
  };
}

/** segment slug가 이미 파싱된 경우 병합 (덮어쓰지 않음) */
export function mergeTargetProfileSegment(
  profile: TargetProfile | null | undefined,
  segment: ExistingTargetSegment | null | undefined,
): TargetProfile | null {
  if (!profile && !segment) return null;
  const base: TargetProfile = profile ?? { segment: null };
  if (segment != null) {
    return { ...base, segment };
  }
  return applySegmentDefaults(base);
}
