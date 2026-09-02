/**
 * Catalog channel ↔ type/price invariants (PR1b-2).
 *
 * DB CHECK constraints mirror these rules; app layer validates before write.
 */

import {
  CATALOG_CHANNEL_OFFLINE,
  CATALOG_CHANNEL_ONLINE,
  type CatalogChannel,
} from "@/lib/catalog-channel";
import { normalizeCatalogMediaType } from "@/lib/catalog-media-type";

export const MEDIA_CATALOG_INVARIANT_VIOLATION =
  "MEDIA_CATALOG_INVARIANT_VIOLATION";

export type MediaCatalogWriteShape = {
  catalogChannel: CatalogChannel;
  type: string | null;
  price: number | null;
};

function invariantError(detail: string): { ok: false; error: string } {
  return {
    ok: false,
    error: `${MEDIA_CATALOG_INVARIANT_VIOLATION}: ${detail}`,
  };
}

/** Apply channel rules to normalized create/update fields. */
export function applyCatalogChannelInvariants(
  channel: CatalogChannel,
  input: { type: string | null; price: number | null },
):
  | { ok: true; data: Pick<MediaCatalogWriteShape, "type" | "price"> }
  | { ok: false; error: string } {
  if (channel === CATALOG_CHANNEL_ONLINE) {
    if (input.type?.trim()) {
      return invariantError(
        "online media must have type=NULL (display mode is offline-only)",
      );
    }
    if (input.price != null) {
      return invariantError("online media must have price=NULL");
    }
    return { ok: true, data: { type: null, price: null } };
  }

  const type = input.type?.trim() ?? "";
  if (!type || !normalizeCatalogMediaType(type)) {
    return invariantError(
      "offline media requires display type (dooh | static | mobile)",
    );
  }
  if (input.price == null || !Number.isFinite(input.price)) {
    return invariantError("offline media requires numeric price (0 allowed)");
  }
  return {
    ok: true,
    data: {
      type: normalizeCatalogMediaType(type)!,
      price: Math.round(input.price),
    },
  };
}

/** Admin/API create — resolve type + price after channel is known. */
export function resolveMediaCatalogWriteShape(input: {
  catalogChannel: CatalogChannel;
  typeRaw: string;
  priceRaw: unknown;
}):
  | { ok: true; data: MediaCatalogWriteShape }
  | { ok: false; error: string } {
  const typeRaw = input.typeRaw.trim();
  const normalizedType = typeRaw
    ? normalizeCatalogMediaType(typeRaw)
    : null;
  const priceNum =
    input.priceRaw === null || input.priceRaw === undefined || input.priceRaw === ""
      ? null
      : Number(input.priceRaw);

  const applied = applyCatalogChannelInvariants(input.catalogChannel, {
    type: normalizedType,
    price: Number.isFinite(priceNum) ? priceNum : null,
  });
  if (!applied.ok) return applied;

  return {
    ok: true,
    data: {
      catalogChannel: input.catalogChannel,
      type: applied.data.type,
      price: applied.data.price,
    },
  };
}
