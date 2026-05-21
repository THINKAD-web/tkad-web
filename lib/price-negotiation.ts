import { getPrisma, isDatabaseConfigured } from "@/lib/prisma";
import { sendEmail, isEmailConfigured } from "@/lib/email/client";
import { notifyMediaOwnerNewInquiry } from "@/lib/media-owner-notify";
import { postInternalAlert } from "@/lib/internal-webhook";
import { siteUrl } from "@/lib/seo";
import { finalizeAcceptedNegotiation } from "@/lib/negotiation-quote-flow";

const HOURS_24 = 24 * 60 * 60 * 1000;

export async function createPriceNegotiation(input: {
  mediaId: string;
  userId?: string | null;
  contactEmail: string;
  contactPhone: string;
  companyName?: string;
  proposedPriceWon: number;
  message?: string;
}): Promise<{ id: string } | null> {
  if (!isDatabaseConfigured()) return null;
  const db = getPrisma();

  const media = await db.media.findUnique({
    where: { id: input.mediaId },
    select: {
      id: true,
      name: true,
      price: true,
      ownerUserId: true,
    },
  });
  if (!media) return null;

  const row = await db.priceNegotiationRequest.create({
    data: {
      mediaId: input.mediaId,
      userId: input.userId ?? null,
      contactEmail: input.contactEmail,
      contactPhone: input.contactPhone,
      companyName: input.companyName ?? null,
      proposedPriceWon: input.proposedPriceWon,
      message: input.message ?? null,
      expiresAt: new Date(Date.now() + HOURS_24),
    },
  });

  if (media.ownerUserId) {
    void notifyMediaOwnerNewInquiry({
      ownerUserId: media.ownerUserId,
      mediaName: media.name,
      contactPhone: input.contactPhone,
    }).catch(() => {});
  }

  void postInternalAlert({
    type: "contact_inquiry",
    title: "가격 제안 (익명)",
    body: `${media.name} · 제안 ${input.proposedPriceWon.toLocaleString("ko-KR")}원 · ${input.contactEmail}`,
    meta: { negotiationId: row.id, mediaId: media.id },
  }).catch(() => {});

  if (isEmailConfigured() && media.ownerUserId) {
    const owner = await db.user.findUnique({
      where: { id: media.ownerUserId },
      select: { email: true },
    });
    if (owner?.email) {
      const base = siteUrl.replace(/\/$/, "");
      void sendEmail({
        to: owner.email,
        subject: `[THINKAD] ${media.name} 가격 제안`,
        text: [
          `매체: ${media.name}`,
          `현재 단가: ${media.price.toLocaleString("ko-KR")}원`,
          `제안 단가: ${input.proposedPriceWon.toLocaleString("ko-KR")}원`,
          `24시간 내 포털에서 회신해 주세요.`,
          `${base}/ko/media-owner/media`,
        ].join("\n"),
        html: `<p>가격 제안이 접수되었습니다.</p><p><a href="${base}/ko/media-owner/media">매체사 포털</a></p>`,
      }).catch(() => {});
    }
  }

  return { id: row.id };
}

export type RespondPriceNegotiationResult = {
  ok: boolean;
  quoteId?: string;
  contractUrl?: string;
  previewUrl?: string;
};

export async function respondPriceNegotiation(opts: {
  id: string;
  ownerUserId: string;
  accept: boolean;
  ownerNote?: string;
}): Promise<RespondPriceNegotiationResult> {
  if (!isDatabaseConfigured()) return { ok: false };
  const db = getPrisma();
  const row = await db.priceNegotiationRequest.findUnique({
    where: { id: opts.id },
    include: {
      media: { select: { ownerUserId: true, name: true } },
      oohQuote: { select: { id: true } },
    },
  });
  if (!row || row.media.ownerUserId !== opts.ownerUserId) return { ok: false };
  if (row.status !== "PENDING" && row.status !== "ACCEPTED") {
    return { ok: false };
  }

  if (row.status === "PENDING") {
    await db.priceNegotiationRequest.update({
      where: { id: opts.id },
      data: {
        status: opts.accept ? "ACCEPTED" : "REJECTED",
        ownerNote: opts.ownerNote ?? null,
        respondedAt: new Date(),
      },
    });
  }

  let quoteId: string | undefined = row.oohQuote?.id;
  let contractUrl: string | undefined;
  let previewUrl: string | undefined;

  if (opts.accept) {
    const finalized = await finalizeAcceptedNegotiation(db, opts.id);
    if (finalized) {
      quoteId = finalized.quoteId;
      contractUrl = finalized.contractUrl;
      previewUrl = finalized.previewUrl;
    }
  } else if (row.status === "PENDING" && isEmailConfigured()) {
    void sendEmail({
      to: row.contactEmail,
      subject: `[THINKAD] 가격 제안 검토 결과 — ${row.media.name}`,
      text: `제안하신 단가는 이번에는 어렵습니다. ${opts.ownerNote ?? ""}`,
      html: `<p>검토 완료</p><p>${opts.ownerNote ?? ""}</p>`,
    }).catch(() => {});
  }

  return { ok: true, quoteId, contractUrl, previewUrl };
}

export async function expireStaleNegotiations(): Promise<number> {
  if (!isDatabaseConfigured()) return 0;
  const db = getPrisma();
  const r = await db.priceNegotiationRequest.updateMany({
    where: {
      status: "PENDING",
      expiresAt: { lt: new Date() },
    },
    data: { status: "EXPIRED" },
  });
  return r.count;
}
