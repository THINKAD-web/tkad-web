import type { PrismaClient } from "@prisma/client";
import { calcNetFromGross } from "@/lib/media-owner-guard";
import { sendEmail, isEmailConfigured } from "@/lib/email/client";
import { notifyMediaOwnerSettlementCompleted } from "@/lib/media-owner-notify";
import { siteUrl } from "@/lib/seo";

function prevMonthKey(d = new Date()): string {
  const p = new Date(d.getFullYear(), d.getMonth() - 1, 1);
  const m = String(p.getMonth() + 1).padStart(2, "0");
  return `${p.getFullYear()}-${m}`;
}

export async function runMonthlyOwnerSettlements(
  db: PrismaClient,
  opts?: { periodMonth?: string; force?: boolean },
): Promise<{
  owners: number;
  statementsSent: number;
  taxInvoiceRequested: number;
}> {
  const periodMonth = opts?.periodMonth ?? prevMonthKey();
  const owners = await db.user.findMany({
    where: {
      role: "owner",
      ownedMedia: { some: {} },
    },
    select: {
      id: true,
      email: true,
      name: true,
      phone: true,
      ownedMedia: { select: { id: true } },
    },
  });

  let statementsSent = 0;
  let taxInvoiceRequested = 0;

  for (const owner of owners) {
    const mediaIds = owner.ownedMedia.map((m) => m.id);
    if (mediaIds.length === 0) continue;

    const confirmed = await db.mediaBooking.findMany({
      where: {
        mediaId: { in: mediaIds },
        status: "confirmed",
        budgetWon: { not: null },
        startsAt: {
          gte: new Date(`${periodMonth}-01T00:00:00+09:00`),
          lt: new Date(
            new Date(`${periodMonth}-01T00:00:00+09:00`).getTime() +
              32 * 86_400_000,
          ),
        },
      },
      select: { budgetWon: true },
    });

    const grossWon = confirmed.reduce((s, b) => s + (b.budgetWon ?? 0), 0);
    if (grossWon <= 0 && !opts?.force) continue;

    const { feeWon, netWon } = calcNetFromGross(grossWon);

    const settlement = await db.mediaOwnerSettlement.upsert({
      where: {
        ownerUserId_periodMonth: {
          ownerUserId: owner.id,
          periodMonth,
        },
      },
      create: {
        ownerUserId: owner.id,
        periodMonth,
        grossWon,
        feeWon,
        netWon,
        status: "SCHEDULED",
      },
      update: {
        grossWon,
        feeWon,
        netWon,
      },
    });

    if (!settlement.statementSentAt || opts?.force) {
      const base = siteUrl.replace(/\/$/, "");
      const amountLabel = netWon.toLocaleString("ko-KR");

      if (isEmailConfigured() && owner.email) {
        void sendEmail({
          to: owner.email,
          subject: `[THINKAD] ${periodMonth} 정산서`,
          html: [
            `<p>${owner.name ?? "매체사"}님,</p>`,
            `<p><strong>${periodMonth}</strong> 집행 정산 내역입니다.</p>`,
            `<ul>`,
            `<li>총 집행액: ₩${grossWon.toLocaleString("ko-KR")}</li>`,
            `<li>수수료: ₩${feeWon.toLocaleString("ko-KR")}</li>`,
            `<li><strong>정산 예정액: ₩${amountLabel}</strong></li>`,
            `</ul>`,
            `<p><a href="${base}/ko/media-owner/settlements">정산 포털에서 확인</a></p>`,
            `<p>세금계산서 발행 요청은 포털에서 진행해 주세요.</p>`,
          ].join(""),
          text: `${periodMonth} 정산 — 순정산 ₩${amountLabel}`,
        }).catch(() => {});
      }

      await db.mediaOwnerSettlement.update({
        where: { id: settlement.id },
        data: {
          statementSentAt: new Date(),
          taxInvoiceRequestedAt: settlement.taxInvoiceRequestedAt ?? new Date(),
          notes:
            settlement.notes ??
            `${periodMonth} 월간 자동 정산 (${confirmed.length}건)`,
        },
      });
      statementsSent += 1;
      taxInvoiceRequested += 1;
    }
  }

  return {
    owners: owners.length,
    statementsSent,
    taxInvoiceRequested,
  };
}

export async function completeScheduledSettlements(
  db: PrismaClient,
): Promise<number> {
  const rows = await db.mediaOwnerSettlement.findMany({
    where: {
      status: "SCHEDULED",
      statementSentAt: { not: null },
      taxInvoiceRequestedAt: { not: null },
      completedAt: null,
    },
    take: 100,
    include: {
      ownerUser: { select: { id: true, phone: true } },
    },
  });

  let done = 0;
  for (const row of rows) {
    await db.mediaOwnerSettlement.update({
      where: { id: row.id },
      data: {
        status: "COMPLETED",
        completedAt: new Date(),
      },
    });
    void notifyMediaOwnerSettlementCompleted({
      ownerUserId: row.ownerUserId,
      periodMonth: row.periodMonth,
      netWon: row.netWon,
    }).catch(() => {});
    done += 1;
  }
  return done;
}
