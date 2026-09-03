import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { localOnlineRowsToPublicMediaViews } from "@/lib/digital/public-media-adapter";
import type { PublicMediaView } from "@/lib/digital/public-media-types";
import type { LocalOnlineMediaRow } from "@/lib/digital/public-media-adapter";

type SeedFile = {
  rows: Array<{
    slug: string;
    name: string;
    nameEn?: string;
    description?: string;
    descriptionEn?: string;
    onlineSpec: LocalOnlineMediaRow["onlineSpec"];
  }>;
};

/** PR3 seed JSON → PublicMediaView catalog for mix golden tests (no DB). */
export function loadMixGoldenCatalogFromSeed(): PublicMediaView[] {
  const root = resolve(fileURLToPath(new URL(".", import.meta.url)), "../..");
  const seed = JSON.parse(
    readFileSync(resolve(root, "prisma/seed-data/online-media-2026-09.json"), "utf8"),
  ) as SeedFile;
  const rows: LocalOnlineMediaRow[] = seed.rows.map((row) => ({
    slug: row.slug,
    name: row.name,
    nameEn: row.nameEn ?? row.name,
    description: row.description ?? null,
    descriptionEn: row.descriptionEn ?? null,
    onlineSpec: row.onlineSpec,
  }));
  return localOnlineRowsToPublicMediaViews(rows);
}

export type MixGoldenBaselineScenario = {
  id: string;
  channelCount: number;
  slugs: string[];
  budgetTotal: number;
};

export function loadMixGoldenBaseline(): MixGoldenBaselineScenario[] {
  const root = resolve(fileURLToPath(new URL(".", import.meta.url)), "../..");
  return JSON.parse(
    readFileSync(resolve(root, "lib/digital/mix-golden-baseline.json"), "utf8"),
  ) as MixGoldenBaselineScenario[];
}

export const MIX_GOLDEN_SCENARIOS = [
  {
    id: "awareness-beauty-5m",
    input: {
      industry: "BEAUTY" as const,
      goal: "AWARENESS" as const,
      target: { age: "25-34", gender: "ALL", geo: "KR" },
      budgetMonthly: 5_000_000,
      periodWeeks: 4,
    },
  },
  {
    id: "traffic-ecommerce-3m",
    input: {
      industry: "ECOMMERCE" as const,
      goal: "TRAFFIC" as const,
      target: { age: "25-34", gender: "ALL", geo: "KR" },
      budgetMonthly: 3_000_000,
      periodWeeks: 4,
    },
  },
  {
    id: "conversion-retail-8m",
    input: {
      industry: "ECOMMERCE" as const,
      goal: "CONVERSION" as const,
      target: { age: "25-34", gender: "ALL", geo: "KR" },
      budgetMonthly: 8_000_000,
      periodWeeks: 4,
    },
  },
  {
    id: "lead-b2b-6m",
    input: {
      industry: "B2B" as const,
      goal: "LEAD" as const,
      target: { age: "35-44", gender: "ALL", geo: "KR" },
      budgetMonthly: 6_000_000,
      periodWeeks: 4,
    },
  },
  {
    id: "visit-local-4m",
    input: {
      industry: "LOCAL" as const,
      goal: "VISIT" as const,
      target: { age: "25-34", gender: "ALL", geo: "KR" },
      budgetMonthly: 4_000_000,
      periodWeeks: 4,
    },
  },
  {
    id: "app-install-8m",
    input: {
      industry: "APP" as const,
      goal: "APP_INSTALL" as const,
      target: { age: "18-24", gender: "ALL", geo: "KR" },
      budgetMonthly: 8_000_000,
      periodWeeks: 4,
    },
  },
];
