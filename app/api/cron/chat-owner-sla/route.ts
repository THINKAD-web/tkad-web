import { NextRequest } from "next/server";
import { json } from "@/lib/admin-guard";
import { OWNER_SLA_HOURS } from "@/lib/chat-constants";
import { createNotification } from "@/lib/notifications";
import { getPrisma, isDatabaseConfigured } from "@/lib/prisma";
import { notifyMediaOwnerNewInquiry } from "@/lib/media-owner-notify";

/** Hobby: vercel.json schedule must run ≤1×/day (currently 03:30 UTC daily). */
export const dynamic = "force-dynamic";

function authOk(request: NextRequest): boolean {
  const secret = process.env.CRON_SECRET?.trim();
  if (!secret) return false;
  return request.headers.get("authorization") === `Bearer ${secret}`;
}

export async function GET(request: NextRequest) {
  if (!authOk(request)) return json({ error: "Unauthorized" }, 401);
  if (!isDatabaseConfigured()) return json({ ok: false, reason: "no_db" });

  const db = getPrisma();
  const cutoff = new Date();
  cutoff.setHours(cutoff.getHours() - OWNER_SLA_HOURS);

  const overdue = await db.chatRoom.findMany({
    where: {
      status: "OPEN",
      ownerFirstReplyAt: null,
      createdAt: { lte: cutoff },
      slaReminderAt: null,
    },
    include: { media: { select: { name: true } } },
    take: 50,
  });

  let reminded = 0;
  for (const room of overdue) {
    const locale = room.locale === "en" ? "en" : "ko";
    const link = `/${locale}/chat/${room.id}`;

    void createNotification({
      userId: room.ownerUserId,
      type: "CHAT_MESSAGE",
      title: "채팅 응답 지연",
      body: `${room.media.name} — 24시간 내 미응답. 광고주가 기다리고 있습니다.`,
      link,
      dedupeKey: `chat_sla:${room.id}`,
    }).catch(() => {});

    void notifyMediaOwnerNewInquiry({
      ownerUserId: room.ownerUserId,
      mediaName: room.media.name,
    }).catch(() => {});

    await db.chatRoom.update({
      where: { id: room.id },
      data: { slaReminderAt: new Date() },
    });
    reminded++;
  }

  return json({ ok: true, reminded, scanned: overdue.length });
}
