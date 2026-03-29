import { getTranslations, setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";
import { resolveLocaleParam } from "@/lib/resolve-locale";
import { getPrisma, isDatabaseConfigured } from "@/lib/prisma";
import AdminNetworkEditor, {
  type SerializedNetwork,
} from "../admin-network-editor";
import { Card, CardContent } from "@/components/ui/card";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ locale: string; id: string }> };

export default async function AdminNetworkEditPage({ params }: Props) {
  const { locale, id } = await params;
  const resolved = await resolveLocaleParam(Promise.resolve({ locale }));
  setRequestLocale(resolved);

  if (!isDatabaseConfigured()) {
    const t = await getTranslations("adminNetworks");
    return (
      <div className="p-8">
        <Card>
          <CardContent className="py-12 text-center text-slate-600">
            {t("dbError")}
          </CardContent>
        </Card>
      </div>
    );
  }

  const db = getPrisma();
  const row = await db.mediaNetwork.findUnique({
    where: { id },
    include: { locations: { orderBy: { createdAt: "asc" } } },
  });

  if (!row) notFound();

  const initial: SerializedNetwork = {
    id: row.id,
    name: row.name,
    nameEn: row.nameEn,
    description: row.description,
    type: row.type,
    pricePerUnit: row.pricePerUnit,
    pricePackage: row.pricePackage,
    minUnits: row.minUnits,
    totalLocations: row.totalLocations,
    regions: row.regions,
    image: row.image,
    galleryImages: row.galleryImages,
    features: row.features,
    packageOptions: row.packageOptions,
    isActive: row.isActive,
    locations: row.locations.map((l) => ({
      name: l.name,
      address: l.address,
      latitude: l.latitude,
      longitude: l.longitude,
    })),
  };

  return <AdminNetworkEditor mode="edit" initial={initial} />;
}
