import { NextRequest } from "next/server";
import { z } from "zod";
import { apiOk, apiError, readJson } from "@/lib/api-response";
import { getCurrentUser } from "@/lib/user-session";
import { getPrisma, isDatabaseConfigured } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return apiError("UNAUTHORIZED", 401);

  if (!isDatabaseConfigured()) return apiOk({ zones: [] });

  const db = getPrisma();
  const rows = await db.userRegionPriceAlert.findMany({
    where: { userId: user.id },
    select: { regionZone: true },
  });
  return apiOk({ zones: rows.map((r) => r.regionZone) });
}

const Body = z.object({
  regionZone: z.string().min(1).max(32),
  subscribe: z.boolean(),
});

export async function POST(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return apiError("UNAUTHORIZED", 401);

  const body = await readJson(request);
  const parsed = Body.safeParse(body);
  if (!parsed.success) return apiError("INVALID_INPUT", 400);

  if (!isDatabaseConfigured()) return apiOk({ ok: true });

  const db = getPrisma();
  const { regionZone, subscribe } = parsed.data;

  if (subscribe) {
    await db.userRegionPriceAlert.upsert({
      where: {
        userId_regionZone: { userId: user.id, regionZone },
      },
      create: { userId: user.id, regionZone },
      update: {},
    });
  } else {
    await db.userRegionPriceAlert.deleteMany({
      where: { userId: user.id, regionZone },
    });
  }

  return apiOk({ ok: true, regionZone, subscribe });
}
