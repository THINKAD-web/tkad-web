import type { PrismaClient } from "@prisma/client";
import type { MediaInstallLocation } from "@/lib/media-install-locations";
import { attachCoverageDistrictCodesById } from "@/lib/read-media-coverage-district-codes";
import { attachInstallLocationsById } from "@/lib/read-media-install-locations";

type DbClient = Pick<PrismaClient, "$queryRaw">;

export type AttachPublicMediaCatalogExtrasOptions = {
  /** false면 installLocations SQL 생략 (browse·홈 목록). 상세·지도는 true 유지. */
  includeInstallLocations?: boolean;
};

/** browse·홈 목록용 — coverage만 부착, installLocations는 빈 배열 */
export const PUBLIC_BROWSE_CATALOG_EXTRAS: AttachPublicMediaCatalogExtrasOptions =
  {
    includeInstallLocations: false,
  };

/** 공개 카탈로그 Prisma row — 커버리지·복수 설치 지점 SQL 부착 */
export async function attachPublicMediaCatalogExtras<T extends { id: string }>(
  db: DbClient,
  rows: readonly T[],
  options: AttachPublicMediaCatalogExtrasOptions = {},
): Promise<
  Array<
    T & {
      coverageDistrictCodes: string[];
      installLocations: MediaInstallLocation[];
    }
  >
> {
  const withCoverage = await attachCoverageDistrictCodesById(db, rows);
  if (options.includeInstallLocations === false) {
    return withCoverage.map((row) => ({
      ...row,
      installLocations: [] as MediaInstallLocation[],
    }));
  }
  return attachInstallLocationsById(db, withCoverage);
}
