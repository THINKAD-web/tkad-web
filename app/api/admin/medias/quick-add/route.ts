import { NextRequest } from "next/server";
import { assertAdminDb, json } from "@/lib/admin-guard";
import { getPrisma } from "@/lib/prisma";
import {
  mapQuickAddToDb,
  validateQuickAddItems,
} from "@/lib/media-quick-add";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  const deny = assertAdminDb(request);
  if (deny) return deny;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return json({ error: "Invalid JSON" }, 400);
  }

  if (body === null || typeof body !== "object" || Array.isArray(body)) {
    return json({ error: "요청 본문은 객체여야 합니다." }, 400);
  }

  const itemsRaw = (body as { items?: unknown }).items;
  if (!Array.isArray(itemsRaw)) {
    return json({ error: "items 배열이 필요합니다." }, 400);
  }

  const validated = validateQuickAddItems(itemsRaw);
  if (!validated.ok) {
    return json({ error: validated.error }, 400);
  }

  const db = getPrisma();
  const created: { id: string; name: string }[] = [];

  await db.$transaction(async (tx) => {
    for (const row of validated.items) {
      const data = mapQuickAddToDb(row);
      const media = await tx.media.create({ data });
      await tx.mediaPriceSnapshot.create({
        data: {
          mediaId: media.id,
          price: media.price,
          note: data.priceNote?.slice(0, 200) || "quick-add",
        },
      });
      created.push({ id: media.id, name: media.name });
    }
  });

  return json({ ok: true, count: created.length, created }, 201);
}
