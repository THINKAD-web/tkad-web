import { Prisma } from "@prisma/client";
import type { PrismaClient } from "@prisma/client";
import type { MediaInstallLocation } from "@/lib/media-install-locations";

type ExecuteRawClient = Pick<PrismaClient, "$executeRaw">;

/**
 * `install_locations`만 원시 SQL로 갱신합니다.
 * Prisma Client 번들이 스키마보다 옛날일 때 `media.update`의 Unknown argument를 피합니다.
 */
export async function persistMediaInstallLocations(
  client: ExecuteRawClient,
  id: string,
  locations: readonly MediaInstallLocation[] | null,
): Promise<void> {
  if (locations == null || locations.length === 0) {
    await client.$executeRaw`
      UPDATE "media"
      SET "install_locations" = NULL
      WHERE "id" = ${id}
    `;
    return;
  }
  const json = JSON.stringify(locations);
  await client.$executeRaw`
    UPDATE "media"
    SET "install_locations" = ${json}::jsonb
    WHERE "id" = ${id}
  `;
}
