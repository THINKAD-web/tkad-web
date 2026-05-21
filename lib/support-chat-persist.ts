import { getPrisma, isDatabaseConfigured } from "@/lib/prisma";

export async function persistSupportChatTurn(opts: {
  sessionId: string;
  userId?: string | null;
  locale: string;
  userContent: string;
  assistantContent: string;
}): Promise<void> {
  if (!isDatabaseConfigured()) return;
  const db = getPrisma();
  await db.$transaction([
    db.supportChatLog.create({
      data: {
        sessionId: opts.sessionId.slice(0, 64),
        userId: opts.userId ?? null,
        locale: opts.locale.slice(0, 8),
        role: "user",
        content: opts.userContent.slice(0, 8000),
      },
    }),
    db.supportChatLog.create({
      data: {
        sessionId: opts.sessionId.slice(0, 64),
        userId: opts.userId ?? null,
        locale: opts.locale.slice(0, 8),
        role: "assistant",
        content: opts.assistantContent.slice(0, 8000),
      },
    }),
  ]);
}
