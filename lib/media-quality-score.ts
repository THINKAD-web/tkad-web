import { suggestMediaTagsFromText } from "@/lib/media-tags";

export type MediaQualityInput = {
  image?: string | null;
  extractedImages?: string[];
  latitude?: number | null;
  longitude?: number | null;
  tags?: string[];
  impressions?: number | null;
  dailyFootfall?: number | null;
  description?: string | null;
  price?: number;
  name?: string;
  location?: string;
};

export type MediaQualityBreakdown = {
  images: number;
  coordinates: number;
  tags: number;
  impressions: number;
  description: number;
  price: number;
};

export type MediaQualityResult = {
  score: number;
  breakdown: MediaQualityBreakdown;
  missing: string[];
};

function imageCount(input: MediaQualityInput): number {
  const urls = new Set<string>();
  const primary = input.image?.trim();
  if (primary) urls.add(primary);
  for (const u of input.extractedImages ?? []) {
    const t = u?.trim();
    if (t) urls.add(t);
  }
  return urls.size;
}

/**
 * 매체 데이터 완성도 0–100.
 * 이미지 3+ (+20), 위경도 (+20), 태그 3+ (+15), 노출 (+20), 설명 100자+ (+15), 가격 (+10)
 */
export function scoreMediaQuality(input: MediaQualityInput): MediaQualityResult {
  const breakdown: MediaQualityBreakdown = {
    images: 0,
    coordinates: 0,
    tags: 0,
    impressions: 0,
    description: 0,
    price: 0,
  };
  const missing: string[] = [];

  if (imageCount(input) >= 3) {
    breakdown.images = 20;
  } else {
    missing.push("이미지 3장 이상");
  }

  const lat = input.latitude;
  const lng = input.longitude;
  if (
    lat != null &&
    lng != null &&
    Number.isFinite(lat) &&
    Number.isFinite(lng) &&
    !(lat === 0 && lng === 0)
  ) {
    breakdown.coordinates = 20;
  } else {
    missing.push("위·경도");
  }

  const tagCount = (input.tags ?? []).filter((t) => t.trim().length > 0).length;
  if (tagCount >= 3) {
    breakdown.tags = 15;
  } else {
    missing.push("태그 3개 이상");
  }

  const hasImpressions =
    (input.impressions != null && input.impressions > 0) ||
    (input.dailyFootfall != null && input.dailyFootfall > 0);
  if (hasImpressions) {
    breakdown.impressions = 20;
  } else {
    missing.push("노출·유동 데이터");
  }

  const descLen = (input.description ?? "").trim().length;
  if (descLen >= 100) {
    breakdown.description = 15;
  } else {
    missing.push("설명 100자 이상");
  }

  if ((input.price ?? 0) > 0) {
    breakdown.price = 10;
  } else {
    missing.push("가격 정보");
  }

  const score =
    breakdown.images +
    breakdown.coordinates +
    breakdown.tags +
    breakdown.impressions +
    breakdown.description +
    breakdown.price;

  return { score, breakdown, missing };
}

export function isLowQualityMedia(
  input: MediaQualityInput,
  threshold = 60,
): boolean {
  return scoreMediaQuality(input).score < threshold;
}

/** 태그·설명 보강 제안 */
export function suggestQualityImprovements(input: MediaQualityInput): {
  suggestedTags: string[];
  hints: string[];
} {
  const hints: string[] = [];
  const result = scoreMediaQuality(input);
  for (const m of result.missing) {
    hints.push(m);
  }
  const suggestedTags = suggestMediaTagsFromText(
    `${input.name ?? ""} ${input.location ?? ""} ${input.description ?? ""}`,
  );
  return { suggestedTags, hints };
}
