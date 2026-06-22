import { setRequestLocale } from "next-intl/server";
import { resolveLocaleParam } from "@/lib/resolve-locale";
import { getPrisma, isDatabaseConfigured } from "@/lib/prisma";
import {
  toAdminNetworkListRow,
  type AdminNetworkListRow,
} from "@/lib/admin-network-list";
import AdminNetworksListClient from "./admin-networks-list-client";

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
      const rows = await db.mediaNetwork.findMany({
        orderBy: { updatedAt: "desc" },
        select: {
          id: true,
          name: true,
          nameEn: true,
          type: true,
          tags: true,
          totalLocations: true,
          regions: true,
          pricePackage: true,
          isActive: true,
          updatedAt: true,
          _count: { select: { locations: true } },
          locations: { select: { name: true } },
        },
      });
      initialRows = rows.map(toAdminNetworkListRow);
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
