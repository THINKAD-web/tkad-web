import { Prisma } from "@prisma/client";
import type { PrismaClient } from "@prisma/client";

type QueryRawClient = Pick<PrismaClient, "$queryRaw">;

type CoverageRow = {
  id: string;
  coverage_district_codes: string[] | null;
};

export async function readMediaCoverageDistrictCodesByIds(
  client: QueryRawClient,
  ids: readonly string[],
): Promise<Map<string, string[]>> {
  const uniqIds = [...new Set(ids.map((id) => id.trim()).filter(Boolean))];
  if (uniqIds.length === 0) return new Map();

  const rows = await client.$queryRaw<CoverageRow[]>(Prisma.sql`
    SELECT "id", "coverage_district_codes"
    FROM "media"
    WHERE "id" IN (${Prisma.join(uniqIds)})
  `);

  return new Map(
    rows.map((row) => [
      row.id,
      Array.isArray(row.coverage_district_codes)
        ? [...row.coverage_district_codes]
        : [],
    ]),
  );
}

export async function attachCoverageDistrictCodesById<T extends { id: string }>(
  client: QueryRawClient,
  rows: readonly T[],
): Promise<Array<T & { coverageDistrictCodes: string[] }>> {
  const byId = await readMediaCoverageDistrictCodesByIds(
    client,
    rows.map((row) => row.id),
  );

  return rows.map((row) => ({
    ...row,
    coverageDistrictCodes: byId.get(row.id) ?? [],
  }));
}
