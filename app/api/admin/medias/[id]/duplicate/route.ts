import { Prisma } from "@prisma/client";
import { revalidatePath } from "next/cache";
import type { NextRequest } from "next/server";
import { assertAdminDb, json } from "@/lib/admin-guard";
import { prismaMediaToAdminDto } from "@/lib/admin-media-dto";
import { getPrisma } from "@/lib/prisma";
import {
  attachCoverageDistrictCodesById,
  readMediaCoverageDistrictCodesByIds,
} from "@/lib/read-media-coverage-district-codes";
import { persistMediaCoverageDistrictCodes } from "@/lib/persist-media-coverage-district-codes";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string }> };

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

  const copyName = `${source.name.replace(/\s*\(복제\)\s*$/u, "")} (복제)`;

  const {
    id: _id,
    createdAt: _c,
    updatedAt: _u,
    ...rest
  } = source;

  try {
    const created = await db.media.create({
      data: {
        ...rest,
        name: copyName,
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
      },
    });

    if (coverageCodes.length > 0) {
      await persistMediaCoverageDistrictCodes(db, created.id, coverageCodes);
    }

    const withCov = (
      await attachCoverageDistrictCodesById(db, [created])
    )[0];

    revalidatePath("/ko/media");
    revalidatePath("/en/media");

    return json(
      { media: prismaMediaToAdminDto(withCov ?? created), sourceId: id },
      201,
    );
  } catch (e) {
    if (
      e instanceof Prisma.PrismaClientKnownRequestError &&
      e.code === "P2002"
    ) {
      return json(
        { error: "동일한 매체명이 이미 있습니다. 이름을 변경해 주세요." },
        409,
      );
    }
    const msg = e instanceof Error ? e.message : String(e);
    return json({ error: msg }, 500);
  }
}
