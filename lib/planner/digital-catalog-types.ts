/** Minimal Digital catalog row — mirrors dmpilot PublicMediaView (no cross-repo import). */
export type DigitalCatalogItem = {
  slug: string;
  nameKo: string;
  channel: string;
  platform: string | null;
  mediaType: string | null;
  cpcMin: number | null;
  cpcMax: number | null;
  cpmMin: number | null;
  cpmMax: number | null;
};

export type DigitalCatalogResponse = {
  items: DigitalCatalogItem[];
  count: number;
  fetchedAt: string;
};
