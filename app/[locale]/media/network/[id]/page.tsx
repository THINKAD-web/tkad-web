import { notFound } from "next/navigation";
import { setRequestLocale } from "next-intl/server";
import MediaNetworkDetailClient from "@/components/media-network-detail-client";
import {
  networkCatalogId,
  parsePackageOptions,
  resolveNetworkMediaDetail,
} from "@/lib/media-network-public";
import { resolveLocaleParam } from "@/lib/resolve-locale";

type Props = { params: Promise<{ locale: string; id: string }> };

export const revalidate = 120;

export default async function MediaNetworkDetailPage({ params }: Props) {
  const { locale, id } = await params;
  const resolved = await resolveLocaleParam(Promise.resolve({ locale }));
  setRequestLocale(resolved);

  const row = await resolveNetworkMediaDetail(id);
  if (!row) notFound();

  const tiers = parsePackageOptions(row.packageOptions);

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

  return <MediaNetworkDetailClient locale={resolved} data={payload} />;
}
