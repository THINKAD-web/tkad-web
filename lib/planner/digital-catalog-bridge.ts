import {
  DIGITAL_CHANNELS,
  type DigitalChannel,
  type DigitalChannelId,
} from "@/lib/planner/digital-channels";
import { notifyDigitalBucketGap } from "@/lib/planner/digital-catalog-alerts";
import { fetchDigitalCatalogInternal } from "@/lib/planner/digital-catalog-fetch";
import type { DigitalCatalogItem } from "@/lib/planner/digital-catalog-types";
import {
  DIGITAL_PLATFORM_IDS,
  matchCatalogItemToPlatformId,
} from "@/lib/planner/digital-platform-map";

export type DigitalCatalogBridgeMeta = {
  source: "live" | "static";
  catalogCount: number | null;
  fetchedAt: string | null;
  fallbackBucketIds: DigitalChannelId[];
  unmappedProductCount: number;
  upstreamError?: string;
};

export type DigitalCatalogBridgeResult = {
  channels: DigitalChannel[];
  meta: DigitalCatalogBridgeMeta;
};

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

/** SSR entry — fetch Digital internal catalog or fall back to static channels. */
export async function loadDigitalChannelsForIntegratedPlanner(): Promise<DigitalCatalogBridgeResult> {
  const fetched = await fetchDigitalCatalogInternal();
  if (!fetched.ok) {
    console.error("[digital-catalog-bridge] using static channels", {
      error: fetched.error,
      status: fetched.status,
    });
    return {
      channels: DIGITAL_CHANNELS,
      meta: {
        source: "static",
        catalogCount: null,
        fetchedAt: null,
        fallbackBucketIds: DIGITAL_PLATFORM_IDS,
        unmappedProductCount: 0,
        upstreamError: fetched.error,
      },
    };
  }

  return buildDigitalChannelsFromCatalogItems(fetched.data.items, {
    catalogCount: fetched.data.count,
    fetchedAt: fetched.data.fetchedAt,
  });
}

export function resolveDigitalChannels(
  liveChannels?: DigitalChannel[] | null,
): DigitalChannel[] {
  if (liveChannels?.length) return liveChannels;
  return DIGITAL_CHANNELS;
}

export function getDigitalChannelFromList(
  id: DigitalChannelId,
  channels: DigitalChannel[],
): DigitalChannel | undefined {
  return channels.find((c) => c.id === id);
}
