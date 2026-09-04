import type { DigitalCatalogItem } from "@/lib/planner/digital-catalog-types";

const COMPARE_FIELDS = [
  "slug",
  "nameKo",
  "channel",
  "platform",
  "mediaType",
  "cpcMin",
  "cpcMax",
  "cpmMin",
  "cpmMax",
] as const satisfies readonly (keyof DigitalCatalogItem)[];

export type DigitalCatalogCompareResult = {
  localCount: number;
  remoteCount: number;
  onlyLocalSlugs: string[];
  onlyRemoteSlugs: string[];
  fieldMismatches: Array<{
    slug: string;
    field: (typeof COMPARE_FIELDS)[number];
    local: string | number | null;
    remote: string | number | null;
  }>;
  matchedSlugs: number;
};

function itemField(
  item: DigitalCatalogItem,
  field: (typeof COMPARE_FIELDS)[number],
): string | number | null {
  const v = item[field];
  if (v === undefined) return null;
  return v;
}

/** Side-by-side slug/field diff for commit 1 shape verification. */
export function compareDigitalCatalogItems(
  local: readonly DigitalCatalogItem[],
  remote: readonly DigitalCatalogItem[],
): DigitalCatalogCompareResult {
  const localBySlug = new Map(local.map((i) => [i.slug, i]));
  const remoteBySlug = new Map(remote.map((i) => [i.slug, i]));
  const localSlugs = new Set(localBySlug.keys());
  const remoteSlugs = new Set(remoteBySlug.keys());

  const onlyLocalSlugs = [...localSlugs].filter((s) => !remoteSlugs.has(s)).sort();
  const onlyRemoteSlugs = [...remoteSlugs].filter((s) => !localSlugs.has(s)).sort();
  const fieldMismatches: DigitalCatalogCompareResult["fieldMismatches"] = [];

  for (const slug of [...localSlugs].filter((s) => remoteSlugs.has(s)).sort()) {
    const l = localBySlug.get(slug)!;
    const r = remoteBySlug.get(slug)!;
    for (const field of COMPARE_FIELDS) {
      const lv = itemField(l, field);
      const rv = itemField(r, field);
      if (lv !== rv) {
        fieldMismatches.push({ slug, field, local: lv, remote: rv });
      }
    }
  }

  return {
    localCount: local.length,
    remoteCount: remote.length,
    onlyLocalSlugs,
    onlyRemoteSlugs,
    fieldMismatches,
    matchedSlugs: local.length - onlyLocalSlugs.length,
  };
}

export function logDigitalCatalogCompare(
  result: DigitalCatalogCompareResult,
  context: string,
): void {
  const mismatchSample = result.fieldMismatches.slice(0, 8);
  const level =
    result.onlyLocalSlugs.length > 0 ||
    result.onlyRemoteSlugs.length > 0 ||
    result.fieldMismatches.length > 0
      ? "warn"
      : "info";

  const payload = {
    context,
    localCount: result.localCount,
    remoteCount: result.remoteCount,
    matchedSlugs: result.matchedSlugs,
    onlyLocal: result.onlyLocalSlugs,
    onlyRemote: result.onlyRemoteSlugs,
    fieldMismatchCount: result.fieldMismatches.length,
    fieldMismatchSample: mismatchSample,
  };

  if (level === "warn") {
    console.warn("[digital-catalog-compare]", payload);
  } else {
    console.info("[digital-catalog-compare]", payload);
  }
}
