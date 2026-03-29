import { NextRequest } from "next/server";
import { assertAdminDb, json } from "@/lib/admin-guard";
import { isAdminAuthDebugEnabled } from "@/lib/admin-session";
import { enrichQuickAddRowForPersist } from "@/lib/media-quick-add-enrich-one";
import {
  mediaDbRowToQuickAddJson,
  mediaQuickAddCreateToPrismaUpdate,
  quickAddJsonWithAliasKeys,
  validateQuickAddItem,
} from "@/lib/media-quick-add";
import { getPrisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string }> };

export async function GET(request: NextRequest, { params }: Params) {
  const deny = assertAdminDb(request);
  if (deny) return deny;

  const { id } = await params;
  const db = getPrisma();
  const media = await db.media.findUnique({ where: { id } });
  if (!media) return json({ error: "Not found" }, 404);

  const quick = mediaDbRowToQuickAddJson(media);
  const payload = quickAddJsonWithAliasKeys(quick);

  return json({ id: media.id, json: payload });
}

export async function PUT(request: NextRequest, { params }: Params) {
  const deny = assertAdminDb(request);
  if (deny) return deny;

  const { id } = await params;
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return json({ error: "Invalid JSON" }, 400);
  }

  if (body === null || typeof body !== "object" || Array.isArray(body)) {
    return json({ error: "요청 본문은 객체여야 합니다." }, 400);
  }

  const validated = validateQuickAddItem(body, 0);
  if (!validated.ok) {
    return json({ error: validated.error }, 400);
  }

  const db = getPrisma();
  const before = await db.media.findUnique({ where: { id } });
  if (!before) return json({ error: "Not found" }, 404);

  const { createPayload, addressVerified, autoPopulatedAt } =
    await enrichQuickAddRowForPersist(validated.item);

  const data = mediaQuickAddCreateToPrismaUpdate(createPayload);
  data.addressVerified = addressVerified;
  if (autoPopulatedAt != null) {
    data.autoPopulatedAt = autoPopulatedAt;
  }

  const media = await db.media.update({
    where: { id },
    data,
  });

  if (media.price !== before.price) {
    await db.mediaPriceSnapshot.create({
      data: {
        mediaId: id,
        price: media.price,
        note: "json-edit",
      },
    });
  }

  if (isAdminAuthDebugEnabled()) {
    console.log("[admin-api] media JSON PUT", { id: media.id, name: media.name });
  }

  const quick = mediaDbRowToQuickAddJson(media);
  return json({
    ok: true,
    media,
    json: quickAddJsonWithAliasKeys(quick),
  });
}
