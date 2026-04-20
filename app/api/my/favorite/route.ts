import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/user-session";

export const runtime = "nodejs";

const Body = z.object({
  mediaId: z.string().min(1).max(64),
  action: z.enum(["add", "remove", "toggle"]).default("toggle"),
});

export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json(
      { ok: false, error: { code: "UNAUTHORIZED" } },
      { status: 401 },
    );
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { ok: false, error: { code: "INVALID_JSON" } },
      { status: 400 },
    );
  }

  const parsed = Body.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, error: { code: "INVALID_INPUT" } },
      { status: 400 },
    );
  }

  const { mediaId, action } = parsed.data;
  const existing = await prisma.userFavoriteMedia.findUnique({
    where: { userId_mediaId: { userId: user.id, mediaId } },
  });

  let favorited: boolean;
  if (action === "add" || (action === "toggle" && !existing)) {
    if (!existing) {
      await prisma.userFavoriteMedia.create({
        data: { userId: user.id, mediaId },
      });
    }
    favorited = true;
  } else {
    if (existing) {
      await prisma.userFavoriteMedia.delete({
        where: { userId_mediaId: { userId: user.id, mediaId } },
      });
    }
    favorited = false;
  }

  return NextResponse.json({ ok: true, data: { mediaId, favorited } });
}
