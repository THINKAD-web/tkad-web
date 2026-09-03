import "@/lib/digital/server-only";
import { unstable_cache } from "next/cache";
import {
  DIGITAL_CHANNELS,
  type DigitalChannel,
  type DigitalChannelId,
} from "@/lib/planner/digital-channels";
import { notifyDigitalBucketGap } from "@/lib/planner/digital-catalog-alerts";
import { resolveDigitalCatalogItems } from "@/lib/digital/resolve-digital-catalog";
import type { DigitalCatalogItem } from "@/lib/planner/digital-catalog-types";
import {
  DIGITAL_PLATFORM_IDS,
  matchCatalogItemToPlatformId,
} from "@/lib/planner/digital-platform-map";
import type { DigitalCatalogBridgeResult } from "@/lib/planner/digital-catalog-bridge-types";

export type {
  DigitalCatalogBridgeMeta,
  DigitalCatalogBridgeResult,
} from "@/lib/planner/digital-catalog-bridge-types";

export const DIGITAL_CATALOG_BRIDGE_CACHE_TAG = "digital-catalog-bridge";

function median(values: number[]): number | null {
  if (values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  if (sorted.length % 2 === 0) {
    return Math.round((sorted[mid - 1]! + sorted[mid]!) / 2);
  }
  return sorted[mid]!;
}

function rateMid(min: number | null, max: number | null): number | null {
  if (min != null && max != null) return Math.round((min + max) / 2);
  if (min != null) return min;
  if (max != null) return max;
  return null;
}

function bucketProducts(
  items: DigitalCatalogItem[],
): Map<DigitalChannelId, DigitalCatalogItem[]> {
  const buckets = new Map<DigitalChannelId, DigitalCatalogItem[]>();
  for (const id of DIGITAL_PLATFORM_IDS) {
    buckets.set(id, []);
  }

  for (const item of items) {
    const bucketId = matchCatalogItemToPlatformId(item);
    if (!bucketId) continue;
    buckets.get(bucketId)?.push(item);
  }

  return buckets;
}

function aggregateBucketPricing(
  bucketId: DigitalChannelId,
  products: DigitalCatalogItem[],
  staticChannel: DigitalChannel,
): { channel: DigitalChannel; usedFallback: boolean } {
  if (products.length === 0) {
    return { channel: staticChannel, usedFallback: true };
  }

  const cpcValues = products
    .map((p) => rateMid(p.cpcMin, p.cpcMax))
    .filter((v): v is number => v != null && v > 0);
  const cpmValues = products
    .map((p) => rateMid(p.cpmMin, p.cpmMax))
    .filter((v): v is number => v != null && v > 0);

  const avgCpcWon = median(cpcValues) ?? staticChannel.avgCpcWon;
  const avgCpmWon = median(cpmValues) ?? staticChannel.avgCpmWon;

  return {
    channel: {
      ...staticChannel,
      avgCpcWon,
      avgCpmWon,
    },
    usedFallback: cpcValues.length === 0 && cpmValues.length === 0,
  };
}

/** Apply live catalog pricing to static platform channel metadata (6a scope). */
export function buildDigitalChannelsFromCatalogItems(
  items: DigitalCatalogItem[],
  opts?: { catalogCount?: number; fetchedAt?: string | null },
): DigitalCatalogBridgeResult {
  const staticById = new Map(DIGITAL_CHANNELS.map((c) => [c.id, c]));
  const buckets = bucketProducts(items);
  const fallbackBucketIds: DigitalChannelId[] = [];
  const channels: DigitalChannel[] = [];

  let unmappedProductCount = 0;
  for (const item of items) {
    if (!matchCatalogItemToPlatformId(item)) unmappedProductCount += 1;
  }

  for (const bucketId of DIGITAL_PLATFORM_IDS) {
    const staticChannel = staticById.get(bucketId)!;
    const products = buckets.get(bucketId) ?? [];
    const { channel, usedFallback } = aggregateBucketPricing(
      bucketId,
      products,
      staticChannel,
    );
    channels.push(channel);

    if (products.length === 0) {
      fallbackBucketIds.push(bucketId);
      void notifyDigitalBucketGap({
        bucketId,
        catalogCount: items.length,
        mappedProductCount: 0,
        source: "integrated-planner-bridge",
      });
    } else if (usedFallback) {
      console.warn("[digital-catalog-bridge] bucket missing rate fields", {
        bucketId,
        productCount: products.length,
        slugs: products.map((p) => p.slug),
      });
    }
  }

  return {
    channels,
    meta: {
      source: "live",
      catalogCount: opts?.catalogCount ?? items.length,
      fetchedAt: opts?.fetchedAt ?? null,
      fallbackBucketIds,
      unmappedProductCount,
    },
  };
}

async function loadDigitalChannelsForIntegratedPlannerUncached(): Promise<DigitalCatalogBridgeResult> {
  const resolved = await resolveDigitalCatalogItems();
  if (resolved.items.length === 0) {
    console.error("[digital-catalog-bridge] local catalog unavailable", {
      source: resolved.source,
      localOk: resolved.localOk,
    });
    return {
      channels: [],
      meta: {
        source: "unavailable",
        catalogCount: null,
        fetchedAt: null,
        fallbackBucketIds: [],
        unmappedProductCount: 0,
        upstreamError: "local online catalog unavailable",
      },
    };
  }

  if (resolved.source === "local") {
    console.info("[digital-catalog-bridge] local catalog", {
      count: resolved.count,
    });
  }

  return buildDigitalChannelsFromCatalogItems(resolved.items, {
    catalogCount: resolved.count,
    fetchedAt: resolved.fetchedAt,
  });
}

/**
 * SSR entry — build platform channels from local online catalog.
 * Cached 1h to match integrated planner page ISR (B1a).
 */
export const loadDigitalChannelsForIntegratedPlanner = unstable_cache(
  loadDigitalChannelsForIntegratedPlannerUncached,
  ["digital-catalog-bridge-integrated-v2"],
  { revalidate: 3600, tags: [DIGITAL_CATALOG_BRIDGE_CACHE_TAG] },
);

export {
  getDigitalChannelFromList,
  resolveDigitalChannels,
} from "@/lib/planner/digital-channel-pool";
