import type { MediaOwnerTier, OpenBidMode, PrismaClient } from "@prisma/client";
import {
  buildParsedInquiryQuoteIntent,
  regionWhereClause,
} from "@/lib/inquiry-quote-parse";
import type {
  ContactBudgetV2,
  ContactIndustry,
  ContactRegion,
} from "@/lib/contact-lead-schema";
import {
  anonymizeIndustryFromCode,
  budgetRangeFromCode,
  buildMatchSummaryKo,
  parseMediaTypesFromText,
  regionSummaryKo,
} from "@/lib/open-bid-labels";
import { createNotification } from "@/lib/notifications";
import { notifyMediaOwnerMatchInquiry } from "@/lib/media-owner-notify";
import { ensureMediaOwnerStats, TIER_RANK } from "@/lib/media-owner-tier";
import { getPrisma, isDatabaseConfigured } from "@/lib/prisma";
import { isMissingContentTableError } from "@/lib/prisma-content-guards";
import { siteUrl } from "@/lib/seo";

const DEFAULT_DEADLINE_DAYS = 3;
const MAX_MATCH_MEDIA = 24;

export type CreateMatchFromInquiryInput = {
  contactInquiryId: string;
  message: string;
  budgetLabel?: string;
  budgetCode?: ContactBudgetV2;
  regions?: ContactRegion[];
  industryCode?: ContactIndustry;
  periodLabel?: string;
  explicitMediaIds?: string[];
  mode?: OpenBidMode;
};

type MatchCandidate = {
  mediaId: string;
  ownerUserId: string;
  mediaName: string;
  tier: MediaOwnerTier;
  avgRating: number | null;
};

async function findMatchingMedia(
  db: PrismaClient,
  opts: {
    regions: ContactRegion[];
    mediaTypes: string[];
    explicitMediaIds?: string[];
  },
): Promise<MatchCandidate[]> {
  const explicit = opts.explicitMediaIds?.filter(Boolean) ?? [];
  let rows: Array<{
    id: string;
    name: string;
    type: string;
    ownerUserId: string | null;
  }> = [];

  if (explicit.length > 0) {
    rows = await db.media.findMany({
      where: {
        id: { in: explicit.slice(0, MAX_MATCH_MEDIA) },
        isActive: true,
        ownerUserId: { not: null },
      },
      select: { id: true, name: true, type: true, ownerUserId: true },
    });
  } else {
    const regionFilter = regionWhereClause(opts.regions);
    const typeFilter =
      opts.mediaTypes.length > 0
        ? { type: { in: opts.mediaTypes } }
        : undefined;
    rows = await db.media.findMany({
      where: {
        isActive: true,
        availability: "available",
        ownerUserId: { not: null },
        ...(regionFilter ?? {}),
        ...(typeFilter ?? {}),
      },
      select: { id: true, name: true, type: true, ownerUserId: true },
      take: MAX_MATCH_MEDIA * 2,
    });
  }

  const ownerIds = [
    ...new Set(rows.map((r) => r.ownerUserId).filter(Boolean)),
  ] as string[];

  const statsMap = new Map<string, { tier: MediaOwnerTier; avgRating: number | null }>();
  if (ownerIds.length) {
    const stats = await db.mediaOwnerStats.findMany({
      where: { ownerUserId: { in: ownerIds } },
    });
    for (const s of stats) {
      statsMap.set(s.ownerUserId, {
        tier: s.tier,
        avgRating: s.avgRating,
      });
    }
  }

  const candidates: MatchCandidate[] = [];
  for (const r of rows) {
    if (!r.ownerUserId) continue;
    const st = statsMap.get(r.ownerUserId);
    candidates.push({
      mediaId: r.id,
      ownerUserId: r.ownerUserId,
      mediaName: r.name,
      tier: st?.tier ?? "BRONZE",
      avgRating: st?.avgRating ?? null,
    });
  }

  candidates.sort((a, b) => {
    const tr = TIER_RANK[b.tier] - TIER_RANK[a.tier];
    if (tr !== 0) return tr;
    return (b.avgRating ?? 0) - (a.avgRating ?? 0);
  });

  return candidates.slice(0, MAX_MATCH_MEDIA);
}

export async function createMatchFromContactInquiry(
  input: CreateMatchFromInquiryInput,
): Promise<{ openBidId: string; notified: number } | null> {
  if (!isDatabaseConfigured()) return null;
  const db = getPrisma();

  try {
    const existing = await db.openBidRequest.findUnique({
      where: { contactInquiryId: input.contactInquiryId },
      select: { id: true },
    });
    if (existing) return { openBidId: existing.id, notified: 0 };

    const intent = buildParsedInquiryQuoteIntent({
      message: input.message,
      budgetLabel: input.budgetLabel,
      explicitMediaIds: input.explicitMediaIds,
      regions: input.regions,
      budgetCode: input.budgetCode,
    });

    const mediaTypes = parseMediaTypesFromText(input.message);
    const regions = input.regions?.length ? input.regions : intent.regions;
    const budget = budgetRangeFromCode(input.budgetCode, input.budgetLabel);
    const industryAnonymized = anonymizeIndustryFromCode(input.industryCode);
    const regionLabel = regionSummaryKo(regions);
    const mode =
      input.mode ??
      (input.explicitMediaIds?.length ? "STANDARD" : "OPEN_BID");

    const periodLabel =
      input.periodLabel ??
      (intent.durationDays ? `${intent.durationDays}일` : undefined);

    const summaryKo = buildMatchSummaryKo({
      regionLabel,
      mediaTypes,
      budgetLabel: budget.label,
      periodLabel,
      industryAnonymized,
    });

    const deadlineAt = new Date();
    deadlineAt.setDate(deadlineAt.getDate() + DEFAULT_DEADLINE_DAYS);

    const candidates = await findMatchingMedia(db, {
      regions,
      mediaTypes,
      explicitMediaIds: input.explicitMediaIds,
    });

    if (candidates.length === 0) return null;

    const openBid = await db.openBidRequest.create({
      data: {
        mode,
        contactInquiryId: input.contactInquiryId,
        regionLabel,
        mediaTypes,
        budgetMin: budget.min,
        budgetMax: budget.max,
        periodLabel: periodLabel ?? null,
        industryAnonymized,
        summaryKo,
        summaryEn: summaryKo,
        deadlineAt,
      },
    });

    let notified = 0;
    const ownerNotified = new Set<string>();

    for (const c of candidates) {
      await ensureMediaOwnerStats(c.ownerUserId);
      const bid = await db.mediaOwnerBid.create({
        data: {
          openBidRequestId: openBid.id,
          ownerUserId: c.ownerUserId,
          mediaId: c.mediaId,
          tierAtNotify: c.tier,
          notifiedAt: new Date(),
        },
      });

      if (!ownerNotified.has(c.ownerUserId)) {
        ownerNotified.add(c.ownerUserId);
        notified++;

        const link = `${siteUrl}/ko/media-owner/matches/${bid.id}`;
        const titleKo = `${regionLabel} 문의가 들어왔어요!`;
        const bodyKo = `${summaryKo}\n매칭 응답하기 →`;

        await createNotification({
          userId: c.ownerUserId,
          type: mode === "OPEN_BID" ? "OPEN_BID" : "MATCH_INQUIRY",
          title: titleKo,
          body: bodyKo,
          link,
          dedupeKey: `match:${openBid.id}:${c.ownerUserId}`,
        });

        void notifyMediaOwnerMatchInquiry({
          ownerUserId: c.ownerUserId,
          mediaName: c.mediaName,
          summaryKo: bodyKo,
          link,
        }).catch(() => {});
      }
    }

    return { openBidId: openBid.id, notified };
  } catch (e) {
    if (isMissingContentTableError(e)) return null;
    throw e;
  }
}

export async function recordOwnerResponseTime(
  ownerUserId: string,
  interestedAt: Date,
  notifiedAt: Date | null,
): Promise<void> {
  if (!isDatabaseConfigured() || !notifiedAt) return;
  const minutes = Math.max(
    1,
    Math.round((interestedAt.getTime() - notifiedAt.getTime()) / 60_000),
  );
  const db = getPrisma();
  try {
    const stats = await db.mediaOwnerStats.findUnique({
      where: { ownerUserId },
    });
    const prevAvg = stats?.avgResponseMinutes;
    const responseCount = stats?.successfulBidCount ?? 0;
    const newAvg =
      prevAvg != null
        ? Math.round(
            (prevAvg * Math.max(responseCount, 1) + minutes) /
              (Math.max(responseCount, 1) + 1),
          )
        : minutes;

    await db.mediaOwnerStats.upsert({
      where: { ownerUserId },
      create: {
        ownerUserId,
        avgResponseMinutes: minutes,
        lastResponseAt: interestedAt,
      },
      update: {
        avgResponseMinutes: newAvg,
        lastResponseAt: interestedAt,
      },
    });
  } catch (e) {
    if (!isMissingContentTableError(e)) throw e;
  }
}

export async function getOwnerOpenBids(ownerUserId: string) {
  const db = getPrisma();
  return db.mediaOwnerBid.findMany({
    where: { ownerUserId },
    include: {
      openBidRequest: true,
      media: { select: { id: true, name: true, type: true, region: true } },
    },
    orderBy: { createdAt: "desc" },
    take: 50,
  });
}
