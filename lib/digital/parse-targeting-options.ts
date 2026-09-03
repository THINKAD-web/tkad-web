/** Parse `media_online_spec.targeting_options` seed tokens → mix-engine fields. */

export type ParsedTargetingOptions = {
  fitIndustries: string[];
  fitGoals: string[];
  ageTargets: string[];
  genderTarget: string | null;
  geoTargeting: string[];
  interests: string[];
};

export function parseTargetingOptions(
  options: readonly string[],
): ParsedTargetingOptions {
  const fitIndustries: string[] = [];
  const fitGoals: string[] = [];
  const ageTargets: string[] = [];
  const geoTargeting: string[] = [];
  const interests: string[] = [];
  let genderTarget: string | null = null;

  for (const raw of options) {
    const token = raw.trim();
    if (!token) continue;
    const idx = token.indexOf(":");
    if (idx <= 0) continue;
    const key = token.slice(0, idx).toLowerCase();
    const value = token.slice(idx + 1).trim();
    if (!value) continue;

    switch (key) {
      case "industry":
        if (!fitIndustries.includes(value)) fitIndustries.push(value);
        break;
      case "goal":
        if (!fitGoals.includes(value)) fitGoals.push(value);
        break;
      case "age":
        if (!ageTargets.includes(value)) ageTargets.push(value);
        break;
      case "gender":
        genderTarget = value;
        break;
      case "geo":
        if (!geoTargeting.includes(value)) geoTargeting.push(value);
        break;
      case "interest":
        if (!interests.includes(value)) interests.push(value);
        break;
      default:
        break;
    }
  }

  return {
    fitIndustries,
    fitGoals,
    ageTargets,
    genderTarget,
    geoTargeting,
    interests,
  };
}
