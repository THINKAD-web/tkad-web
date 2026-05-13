import { Prisma } from "@prisma/client";
import type { PrismaClient } from "@prisma/client";

type ExecuteRawClient = Pick<PrismaClient, "$executeRaw">;

/**
 * `coverage_district_codes`만 원시 SQL로 갱신합니다.
 * 배포 번들에 Prisma Client 가 스키마보다 옛날일 때도 `media.update` 가 실패하지 않도록
 * 컬럼 쓰기를 ORM 경로에서 분리합니다.
 */
export async function persistMediaCoverageDistrictCodes(
  client: ExecuteRawClient,
  id: string,
  codes: readonly string[],
): Promise<void> {
  if (codes.length === 0) {
    await client.$executeRaw`
      UPDATE "media"
      SET "coverage_district_codes" = ARRAY[]::text[]
      WHERE "id" = ${id}
    `;
    return;
  }
  const elems = codes.map((c) => Prisma.sql`${c}`);
  await client.$executeRaw`
    UPDATE "media"
    SET "coverage_district_codes" = ARRAY[${Prisma.join(elems)}]::text[]
    WHERE "id" = ${id}
  `;
}
