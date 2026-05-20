import { getPrisma, isDatabaseConfigured } from "@/lib/prisma";
import { notifyMediaOwnerNewInquiry } from "@/lib/media-owner-notify";

/** 문의·견적에 포함된 매체 ID로 소유 매체사에 알림톡 발송 */
export async function notifyMediaOwnersForMediaIds(
  mediaIds: string[],
): Promise<void> {
  if (!isDatabaseConfigured() || mediaIds.length === 0) return;
  const db = getPrisma();
  const unique = [...new Set(mediaIds.filter(Boolean))].slice(0, 12);
  const media = await db.media.findMany({
    where: { id: { in: unique }, ownerUserId: { not: null } },
    select: { id: true, name: true, ownerUserId: true },
  });

  const byOwner = new Map<string, { mediaName: string }>();
  for (const m of media) {
    if (!m.ownerUserId) continue;
    const prev = byOwner.get(m.ownerUserId);
    if (!prev) {
      byOwner.set(m.ownerUserId, { mediaName: m.name });
    } else {
      byOwner.set(m.ownerUserId, {
        mediaName: `${prev.mediaName} 외`,
      });
    }
  }

  await Promise.allSettled(
    [...byOwner.entries()].map(([ownerUserId, { mediaName }]) =>
      notifyMediaOwnerNewInquiry({ ownerUserId, mediaName }),
    ),
  );
}
