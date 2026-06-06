import { NextRequest } from "next/server";
import { assertAdminDb, json } from "@/lib/admin-guard";
import { getPrisma, isDatabaseConfigured } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET(
  request: NextRequest,
  ctx: { params: Promise<{ id: string }> },
) {
  const denied = assertAdminDb(request);
  if (denied) return denied;
  if (!isDatabaseConfigured()) {
    return json({ configured: false, messages: [] });
  }

  const { id } = await ctx.params;
  const sessionId = id?.trim();
  if (!sessionId) return json({ error: "Bad request" }, 400);

  const db = getPrisma();
  const rows = await db.chatbotLog.findMany({
    where: { sessionId },
    orderBy: { createdAt: "asc" },
    select: {
      id: true,
      role: true,
      message: true,
      tokensUsed: true,
      model: true,
      createdAt: true,
    },
  });

  if (rows.length === 0) return json({ error: "Not found" }, 404);

  const first = await db.chatbotLog.findFirst({
    where: { sessionId },
    orderBy: { createdAt: "asc" },
    select: {
      userName: true,
      userEmail: true,
      userId: true,
      ip: true,
      userAgent: true,
      pageUrl: true,
      locale: true,
      model: true,
    },
  });

  return json({
    configured: true,
    sessionId,
    meta: first,
    messages: rows,
    totalTokens: rows.reduce((s, r) => s + (r.tokensUsed ?? 0), 0),
  });
}
