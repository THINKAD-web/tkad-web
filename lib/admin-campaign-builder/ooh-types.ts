import type { MediaCatalogListItem } from "@/lib/media-catalog-list-dto";
import type { OohCampaignLine } from "@/lib/admin-campaign-builder/schemas";

export function oohLineFromCatalogItem(
  item: MediaCatalogListItem,
  priceOverrideWon?: number,
): OohCampaignLine {
  return {
    mediaId: item.id,
    slug: item.slug,
    name: item.name,
    location: item.location,
    region: item.region,
    type: item.type,
    priceWon: priceOverrideWon ?? item.price,
  };
}
