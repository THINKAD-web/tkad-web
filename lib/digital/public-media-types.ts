/** Mirrors dmpilot `PublicMediaView` — no cross-repo import (PR5-c mix-engine port). */

export type PublicMediaView = {
  slug: string;
  nameKo: string;
  nameEn: string;
  channel: string;
  objective: string;
  mediaType: string | null;
  platform: string | null;
  billingType: string[];
  cpcMin: number | null;
  cpcMax: number | null;
  cpmMin: number | null;
  cpmMax: number | null;
  minBudget: number | null;
  monthlyBudgetMin: number;
  monthlyBudgetMax: number;
  descriptionKo: string;
  descriptionEn: string;
  featuresKo: string[];
  kpiHintsKo: string[];
  fitIndustries: string[];
  fitGoals: string[];
  ageTargets: string[];
  genderTarget: string | null;
  interests: string[];
  geoTargeting: string[];
  audienceSize: number | null;
  strengths: string[];
  idealFor: string[];
  verified: boolean;
  isPromotion: boolean;
  mediaKitUrl: string | null;
  logoUrl: string | null;
  sourceNote: string | null;
  sortOrder: number;
};
