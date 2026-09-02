import { Prisma } from "@prisma/client";
import { revalidatePath } from "next/cache";
import type { NextRequest } from "next/server";
import { assertAdminDb, json } from "@/lib/admin-guard";
import { prismaMediaToAdminDto } from "@/lib/admin-media-dto";
import { assignUniqueMediaSlug } from "@/lib/assign-media-slug";
import { getPrisma } from "@/lib/prisma";
import {
  attachCoverageDistrictCodesById,
  readMediaCoverageDistrictCodesByIds,
} from "@/lib/read-media-coverage-district-codes";
import { persistMediaCoverageDistrictCodes } from "@/lib/persist-media-coverage-district-codes";
import { persistMediaInstallLocations } from "@/lib/persist-media-install-locations";
import {
  attachInstallLocationsById,
  readMediaInstallLocationsByIds,
} from "@/lib/read-media-install-locations";
import { resolveCatalogChannelForMediaWrite } from "@/lib/catalog-channel";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string }> };

/** `OOH (복제)`, `OOH (복제 2)` 접미사 제거 후 기본명 */
function stripDuplicateNameSuffix(name: string): string {
  return name.replace(/\s*\(복제(?:\s+\d+)?\)\s*$/u, "").trim();
}

async function resolveDuplicateMediaName(
  db: ReturnType<typeof getPrisma>,
  sourceName: string,
): Promise<string> {
  const root = stripDuplicateNameSuffix(sourceName) || sourceName.trim() || "매체";
  const rows = await db.media.findMany({
    where: { name: { startsWith: root } },
    select: { name: true },
  });
  const used = new Set(rows.map((r) => r.name));

  const first = `${root} (복제)`;
  if (!used.has(first)) return first;

  for (let i = 2; i < 500; i++) {
    const candidate = `${root} (복제 ${i})`;
    if (!used.has(candidate)) return candidate;
  }
  return `${root} (복제 ${Date.now()})`;
}

export async function POST(request: NextRequest, { params }: Params) {
  const deny = assertAdminDb(request);
  if (deny) return deny;

  const { id } = await params;
  const db = getPrisma();
  const source = await db.media.findUnique({ where: { id } });
  if (!source) {
    return json({ error: "Not found" }, 404);
  }

  const covMap = await readMediaCoverageDistrictCodesByIds(db, [id]);
  const coverageCodes = covMap.get(id) ?? [];
  const installMap = await readMediaInstallLocationsByIds(db, [id]);
  const installLocations = installMap.get(id) ?? [];

  const copyName = await resolveDuplicateMediaName(db, source.name);
  const copySlug = await assignUniqueMediaSlug(db, copyName, source.nameEn);

  const {
    id: _id,
    slug: _slug,
    createdAt: _c,
    updatedAt: _u,
    installLocations: _installLocations,
    ...rest
  } = source;

  try {
    const created = await db.media.create({
      data: {
        ...rest,
        name: copyName,
        slug: copySlug,
        isActive: false,
        isFeatured: false,
        featuredOrder: null,
        isPopular: false,
        popularOrder: null,
        priceOptions:
          source.priceOptions === null
            ? Prisma.JsonNull
            : (source.priceOptions as Prisma.InputJsonValue),
        trafficPattern:
          source.trafficPattern === null
            ? Prisma.JsonNull
            : (source.trafficPattern as Prisma.InputJsonValue),
        catalogChannel: resolveCatalogChannelForMediaWrite({
          catalogChannel: source.catalogChannel,
          mediaMainCategory: source.mediaMainCategory,
          type: source.type,
        }),
      },
    });

    if (coverageCodes.length > 0) {
      await persistMediaCoverageDistrictCodes(db, created.id, coverageCodes);
    }
    if (installLocations.length > 0) {
      await persistMediaInstallLocations(db, created.id, installLocations);
    }

    const withCov = (
      await attachCoverageDistrictCodesById(db, [created])
    )[0];
    const withExtras = (
      await attachInstallLocationsById(db, [withCov ?? created])
    )[0];

    revalidatePath("/ko/media");
    revalidatePath("/en/media");

    return json(
      { media: prismaMediaToAdminDto(withExtras ?? created), sourceId: id },
      201,
    );
  } catch (e) {
    if (
      e instanceof Prisma.PrismaClientKnownRequestError &&
      e.code === "P2002"
    ) {
      return json(
        { error: "복제본을 저장할 수 없습니다. 잠시 후 다시 시도해 주세요." },
        409,
      );
    }
    const msg = e instanceof Error ? e.message : String(e);
    return json({ error: msg }, 500);
  }
}
