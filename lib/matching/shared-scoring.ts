import type { MediaItem } from "@/lib/media-data";
import { classifyMedia } from "@/lib/metrics/classify";
import type { RegionHotspot } from "@/lib/matching/region-hotspot";
import type { TargetProfile } from "@/lib/matching/target-profile";

export type SharedScoringContext = {
  engine: "catalog" | "brief";
  locale?: "ko" | "en";
};

export type SharedScoringInput = {
  targetProfile?: TargetProfile | null;
  /** 3c에서 사용 — 3b에서는 항상 무시 */
  requestedHotspots?: RegionHotspot[];
};

export type TargetProfileBonus = {
  /** catalog 엔진: 0~15 (기존 target 축 max와 동일 스케일) */
  catalogPoints: number;
  /** brief 엔진: 0~100 */
  briefAxisScore: number;
  rationaleKo: string;
  rationaleEn: string;
};

export type SharedScoringResult = {
  targetProfile: TargetProfileBonus | null;
  /** 3c에서 채움 — 이번엔 항상 null */
  hotspot: null;
  labels: { ko: string[]; en: string[] };
};

const TAG_SIGNAL_RE = {
  local: /로컬|도민|local|resident/i,
  tourist: /관광|tourist|여행/i,
  airport: /공항|airport/i,
  foreign: /외국인|foreign/i,
} as const;

type MediaTargetSignals = {
  local: boolean;
  tourist: boolean;
  airport: boolean;
  foreign: boolean;
};

/**
 * 매체 타깃 신호 — tags[] + classifyMedia airport class.
 * hotspot 데이터(3c) 대신 태그·airport class로 임시 근사 (3c에서 hotspot으로 대체 예정).
 */
export function extractMediaTargetSignals(media: MediaItem): MediaTargetSignals {
  const haystack = [...(media.tags ?? []), media.name, media.subCategory ?? ""]
    .filter(Boolean)
    .join(" ");
  const airportClass = classifyMedia(media) === "airport";

  return {
    local: TAG_SIGNAL_RE.local.test(haystack),
    tourist: TAG_SIGNAL_RE.tourist.test(haystack),
    airport: airportClass || TAG_SIGNAL_RE.airport.test(haystack),
    foreign:
      TAG_SIGNAL_RE.foreign.test(haystack) || TAG_SIGNAL_RE.tourist.test(haystack),
  };
}

function residencyPoints(
  residency: TargetProfile["residency"],
  signals: MediaTargetSignals,
): { points: number; ko: string[]; en: string[] } {
  if (!residency) return { points: 0, ko: [], en: [] };

  const applyResident = () => {
    let points = 0;
    const ko: string[] = [];
    const en: string[] = [];
    if (signals.local) {
      points += 8;
      ko.push("생활권·로컬 태그 +8");
      en.push("local/resident tag +8");
    }
    if (signals.airport || signals.tourist) {
      points -= 6;
      ko.push("공항·관광 태그 −6");
      en.push("airport/tourist tag −6");
    }
    return { points, ko, en };
  };

  const applyTourist = () => {
    let points = 0;
    const ko: string[] = [];
    const en: string[] = [];
    if (signals.airport || signals.tourist) {
      points += 8;
      ko.push("관광·공항 태그 +8");
      en.push("tourist/airport tag +8");
    } else if (signals.local) {
      points += 2;
      ko.push("로컬 태그 +2");
      en.push("local tag +2");
    }
    return { points, ko, en };
  };

  if (residency === "resident") return applyResident();
  if (residency === "tourist") return applyTourist();
  if (residency === "mixed") {
    const r = applyResident();
    const t = applyTourist();
    return {
      points: (r.points + t.points) / 2,
      ko: [...r.ko, ...t.ko],
      en: [...r.en, ...t.en],
    };
  }
  return { points: 0, ko: [], en: [] };
}

function nationalityPoints(
  profile: TargetProfile,
  signals: MediaTargetSignals,
): { points: number; ko: string[]; en: string[] } {
  const { nationality, nationalityRatio } = profile;
  if (!nationality) return { points: 0, ko: [], en: [] };

  if (nationality === "domestic") {
    return {
      points: 3,
      ko: ["내국인 타깃 +3"],
      en: ["domestic target +3"],
    };
  }

  if (nationality === "foreign") {
    if (signals.foreign || signals.tourist) {
      return {
        points: 6,
        ko: ["외국인·관광 태그 +6"],
        en: ["foreign/tourist tag +6"],
      };
    }
    return { points: 0, ko: [], en: [] };
  }

  if (nationality === "mixed") {
    const domW = (nationalityRatio?.domestic ?? 50) / 100;
    const forW = (nationalityRatio?.foreign ?? 50) / 100;
    const domPts = 3 * domW;
    const forPts =
      signals.foreign || signals.tourist ? 6 * forW : 0;
    return {
      points: domPts + forPts,
      ko: [`내외국인 혼합 (${Math.round(domW * 100)}/${Math.round(forW * 100)})`],
      en: [`mixed nationality (${Math.round(domW * 100)}/${Math.round(forW * 100)})`],
    };
  }

  return { points: 0, ko: [], en: [] };
}

function computeTargetProfileBonus(
  profile: TargetProfile,
  media: MediaItem,
): TargetProfileBonus {
  const signals = extractMediaTargetSignals(media);
  const res = residencyPoints(profile.residency, signals);
  const nat = nationalityPoints(profile, signals);
  const raw = res.points + nat.points;
  /** 감점(−6 등) 포함 — total 합산용. 상한 +15, 하한 −15 */
  const catalogPoints = Math.max(-15, Math.min(15, Math.round(raw)));
  const briefAxisScore = Math.max(
    0,
    Math.min(100, Math.round((Math.max(0, catalogPoints) / 15) * 100)),
  );

  const rationaleKo = [...res.ko, ...nat.ko].join(" · ") || "타깃 프로필 가중";
  const rationaleEn = [...res.en, ...nat.en].join(" · ") || "Target profile weight";

  return { catalogPoints, briefAxisScore, rationaleKo, rationaleEn };
}

export function computeSharedMatchBonuses(
  media: MediaItem,
  input: SharedScoringInput,
  _ctx: SharedScoringContext,
): SharedScoringResult {
  void input.requestedHotspots;

  if (!input.targetProfile) {
    return { targetProfile: null, hotspot: null, labels: { ko: [], en: [] } };
  }

  const bonus = computeTargetProfileBonus(input.targetProfile, media);
  const labels =
    bonus.catalogPoints > 0
      ? { ko: [bonus.rationaleKo], en: [bonus.rationaleEn] }
      : { ko: [], en: [] };

  return { targetProfile: bonus, hotspot: null, labels };
}
