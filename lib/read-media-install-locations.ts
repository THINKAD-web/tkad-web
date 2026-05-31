import { Prisma } from "@prisma/client";
import type { PrismaClient } from "@prisma/client";
import {
  parseMediaInstallLocations,
  type MediaInstallLocation,
} from "@/lib/media-install-locations";

type QueryRawClient = Pick<PrismaClient, "$queryRaw">;

type InstallLocationsRow = {
  id: string;
  install_locations: unknown;
};

export async function readMediaInstallLocationsByIds(
  client: QueryRawClient,
  ids: readonly string[],
): Promise<Map<string, MediaInstallLocation[]>> {
  const uniqIds = [...new Set(ids.map((id) => id.trim()).filter(Boolean))];
  if (uniqIds.length === 0) return new Map();

  const rows = await client.$queryRaw<InstallLocationsRow[]>(Prisma.sql`
    SELECT "id", "install_locations"
    FROM "media"
    WHERE "id" IN (${Prisma.join(uniqIds)})
  `);

  return new Map(
    rows.map((row) => [
      row.id,
      parseMediaInstallLocations(row.install_locations),
    ]),
  );
}

export async function attachInstallLocationsById<T extends { id: string }>(
  client: QueryRawClient,
  rows: readonly T[],
): Promise<Array<T & { installLocations: MediaInstallLocation[] }>> {
  const byId = await readMediaInstallLocationsByIds(
    client,
    rows.map((row) => row.id),
  );

  return rows.map((row) => ({
    ...row,
    installLocations: byId.get(row.id) ?? [],
  }));
}
