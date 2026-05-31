import type { PrismaClient } from "@prisma/client";
import { attachCoverageDistrictCodesById } from "@/lib/read-media-coverage-district-codes";
import { attachInstallLocationsById } from "@/lib/read-media-install-locations";

type DbClient = Pick<PrismaClient, "$queryRaw">;

/** 공개 카탈로그 Prisma row — 커버리지·복수 설치 지점 SQL 부착 */
export async function attachPublicMediaCatalogExtras<T extends { id: string }>(
  db: DbClient,
  rows: readonly T[],
): Promise<
  Array<
    T & {
      coverageDistrictCodes: string[];
      installLocations: import("@/lib/media-install-locations").MediaInstallLocation[];
    }
  >
> {
  const withCoverage = await attachCoverageDistrictCodesById(db, rows);
  return attachInstallLocationsById(db, withCoverage);
}
