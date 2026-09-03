import type {
  DigitalChannel,
  DigitalChannelId,
} from "@/lib/planner/digital-channels";

/** Client-safe bridge metadata — no server catalog fetch imports. */
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
