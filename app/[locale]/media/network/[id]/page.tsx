import { notFound } from "next/navigation";
import { setRequestLocale } from "next-intl/server";
import MediaNetworkDetailClient from "@/components/media-network-detail-client";
import {
  networkCatalogId,
  parsePackageOptions,
  resolveNetworkMediaDetail,
} from "@/lib/media-network-public";
import { resolveLocaleParam } from "@/lib/resolve-locale";
import { fetchPublicMediaCatalog } from "@/lib/public-media-catalog";
import { getSimilarMediaFromCatalog } from "@/lib/media-data";

type Props = { params: Promise<{ locale: string; id: string }> };

export const revalidate = 3600;

export default async function MediaNetworkDetailPage({ params }: Props) {
  const { locale, id } = await params;
  const resolved = await resolveLocaleParam(Promise.resolve({ locale }));
  setRequestLocale(resolved);

  const [row, catalog] = await Promise.all([
    resolveNetworkMediaDetail(id),
    fetchPublicMediaCatalog(),
  ]);
  if (!row) notFound();

  const tiers = parsePackageOptions(row.packageOptions);

  // 유사 매체: 같은 type/region 기준
  const networkAsMediaLike = {
    id: networkCatalogId(row.id),
    name: row.name,
    nameEn: row.nameEn ?? row.name,
    type: row.type,
    region: row.regions?.[0] ?? "seoul",
    tags: row.tags ?? [],
  } as Parameters<typeof getSimilarMediaFromCatalog>[1];
  const similar = getSimilarMediaFromCatalog(catalog, networkAsMediaLike, 6);

  const payload = {
    catalogId: networkCatalogId(row.id),
    name: row.name,
    nameEn: row.nameEn,
    description: row.description,
    type: row.type,
    totalLocations: row.totalLocations,
    regions: row.regions ?? [],
    city: row.city,
    district: row.district,
    minUnits: row.minUnits,
    pricePerUnit: row.pricePerUnit,
    pricePackage: row.pricePackage,
    priceNote: row.priceNote,
    tiers: tiers.map((t) => ({ units: t.units, price: t.price })),
    image: row.image,
    galleryImages: row.galleryImages ?? [],
    features: row.features,
    visibilityScore: row.visibilityScore,
    dailyFootfall: row.dailyFootfall,
    targetAge: row.targetAge,
    effectMemo: row.effectMemo,
    operatingHours: row.operatingHours,
    tags: row.tags,
    locations: row.locations.map((l) => ({
      id: l.id,
      name: l.name,
      address: l.address,
      fullAddress: l.fullAddress,
      priceNote: l.priceNote,
      dailyFootfall: l.dailyFootfall,
      note: l.note,
      lat: l.latitude,
      lng: l.longitude,
      mediaId: l.mediaId,
    })),
  };

  return <MediaNetworkDetailClient locale={resolved} data={payload} similar={similar} />;
}
