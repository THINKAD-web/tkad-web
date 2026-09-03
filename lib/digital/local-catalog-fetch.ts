import "@/lib/digital/server-only";
import { CATALOG_CHANNEL_ONLINE } from "@/lib/catalog-channel";
import { getPrisma, isDatabaseConfigured } from "@/lib/prisma";
import { publicActiveMediaWhere } from "@/lib/media-review-status";
import {
  localOnlineRowsToDigitalCatalogItems,
  localOnlineRowsToPublicMediaViews,
  type LocalOnlineMediaRow,
} from "@/lib/digital/public-media-adapter";
import type { PublicMediaView } from "@/lib/digital/public-media-types";
import type { DigitalCatalogItem } from "@/lib/planner/digital-catalog-types";

export const DIGITAL_ONLINE_SPEC_SELECT = {
  platform: true,
  minBudget: true,
  cpcMin: true,
  cpcMax: true,
  cpmMin: true,
  cpmMax: true,
  targetingOptions: true,
  strengths: true,
  kpiHints: true,
  bestFor: true,
} as const;

export type FetchLocalDigitalCatalogResult =
  | {
      ok: true;
      rows: LocalOnlineMediaRow[];
      items: DigitalCatalogItem[];
      views: PublicMediaView[];
      count: number;
      fetchedAt: string;
    }
  | { ok: false; error: string };

function mapDbRow(row: {
  slug: string;
  name: string;
  nameEn: string | null;
  description: string | null;
  descriptionEn: string | null;
  onlineSpec: {
    platform: string;
    minBudget: number;
    cpcMin: number | null;
    cpcMax: number | null;
    cpmMin: number | null;
    cpmMax: number | null;
    targetingOptions: string[];
    strengths: string[];
    kpiHints: string[];
    bestFor: string[];
  } | null;
}): LocalOnlineMediaRow | null {
  if (!row.onlineSpec) return null;
  return {
    slug: row.slug,
    name: row.name,
    nameEn: row.nameEn,
    description: row.description,
    descriptionEn: row.descriptionEn,
    onlineSpec: row.onlineSpec,
  };
}

/** Load active online catalog rows from tkad DB (PR5-c SSOT). */
export async function fetchLocalDigitalCatalog(): Promise<FetchLocalDigitalCatalogResult> {
  if (!isDatabaseConfigured()) {
    return { ok: false, error: "DATABASE_URL not configured" };
  }

  try {
    const db = getPrisma();
    const raw = await db.media.findMany({
      where: publicActiveMediaWhere({ catalogChannel: CATALOG_CHANNEL_ONLINE }),
      orderBy: [{ slug: "asc" }],
      select: {
        slug: true,
        name: true,
        nameEn: true,
        description: true,
        descriptionEn: true,
        onlineSpec: { select: DIGITAL_ONLINE_SPEC_SELECT },
      },
    });

    const rows = raw
      .map(mapDbRow)
      .filter((r): r is LocalOnlineMediaRow => r != null);
    const views = localOnlineRowsToPublicMediaViews(rows);
    const items = localOnlineRowsToDigitalCatalogItems(rows);
    const fetchedAt = new Date().toISOString();

    return {
      ok: true,
      rows,
      items,
      views,
      count: items.length,
      fetchedAt,
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[fetchLocalDigitalCatalog] failed", { message });
    return { ok: false, error: message };
  }
}
