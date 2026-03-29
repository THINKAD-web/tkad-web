import { setRequestLocale } from "next-intl/server";
import { resolveLocaleParam } from "@/lib/resolve-locale";
import { getPrisma, isDatabaseConfigured } from "@/lib/prisma";
import AdminNetworksListClient, {
  type AdminNetworkListRow,
} from "./admin-networks-list-client";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ locale: string }> };

export default async function AdminNetworksPage({ params }: Props) {
  const { locale } = await params;
  const resolved = await resolveLocaleParam(Promise.resolve({ locale }));
  setRequestLocale(resolved);

  let initialRows: AdminNetworkListRow[] = [];
  let initialError: "db" | "load" | null = null;

  if (!isDatabaseConfigured()) {
    initialError = "db";
  } else {
    try {
      const db = getPrisma();
      initialRows = await db.mediaNetwork.findMany({
        orderBy: { updatedAt: "desc" },
        select: {
          id: true,
          name: true,
          type: true,
          totalLocations: true,
          regions: true,
          pricePackage: true,
          isActive: true,
          _count: { select: { locations: true } },
        },
      });
    } catch {
      initialError = "load";
    }
  }

  return (
    <AdminNetworksListClient
      initialRows={initialRows}
      initialError={initialError}
    />
  );
}
