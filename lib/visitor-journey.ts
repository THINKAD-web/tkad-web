import type { Prisma } from "@prisma/client";
import { getPrisma, isDatabaseConfigured } from "@/lib/prisma";

export type UtmParams = {
  utmSource?: string | null;
  utmMedium?: string | null;
  utmCampaign?: string | null;
  utmContent?: string | null;
  utmTerm?: string | null;
};

export type JourneyTouchInput = {
  sessionId: string;
  step: string;
  path?: string | null;
  referrer?: string | null;
  landingPath?: string | null;
  userId?: string | null;
  utm?: UtmParams;
  metadata?: Record<string, unknown> | null;
  /** 타임스탬프 필드 갱신 */
  mark?: "signed_up" | "quote_requested" | "guide_downloaded" | "quick_quote" | "budget_preview";
};

function clip(s: string | null | undefined, max: number): string | null {
  if (!s?.trim()) return null;
  return s.trim().slice(0, max);
}

export async function touchVisitorJourney(input: JourneyTouchInput): Promise<void> {
  if (!isDatabaseConfigured()) return;
  const db = getPrisma();
  const sessionId = input.sessionId.slice(0, 64);
  const now = new Date();

  const utm = input.utm ?? {};
  const markFields = {
    signedUpAt: input.mark === "signed_up" ? now : undefined,
    quoteRequestedAt: input.mark === "quote_requested" ? now : undefined,
    guideDownloadedAt: input.mark === "guide_downloaded" ? now : undefined,
    quickQuoteAt: input.mark === "quick_quote" ? now : undefined,
    budgetPreviewAt: input.mark === "budget_preview" ? now : undefined,
    userId: input.userId ?? undefined,
  };

  const existing = await db.visitorJourney.findUnique({
    where: { sessionId },
    select: { id: true },
  });

  if (!existing) {
    const journey = await db.visitorJourney.create({
      data: {
        sessionId,
        utmSource: clip(utm.utmSource, 120),
        utmMedium: clip(utm.utmMedium, 120),
        utmCampaign: clip(utm.utmCampaign, 120),
        utmContent: clip(utm.utmContent, 120),
        utmTerm: clip(utm.utmTerm, 120),
        referrer: clip(input.referrer, 500),
        landingPath: clip(input.landingPath ?? input.path, 500),
        userId: input.userId ?? null,
        signedUpAt: markFields.signedUpAt ?? null,
        quoteRequestedAt: markFields.quoteRequestedAt ?? null,
        guideDownloadedAt: markFields.guideDownloadedAt ?? null,
        quickQuoteAt: markFields.quickQuoteAt ?? null,
        budgetPreviewAt: markFields.budgetPreviewAt ?? null,
        steps: {
          create: {
            step: input.step.slice(0, 64),
            path: clip(input.path, 500),
            metadata: (input.metadata ?? undefined) as Prisma.InputJsonValue | undefined,
          },
        },
      },
    });
    return void journey;
  }

  await db.visitorJourney.update({
    where: { sessionId },
    data: {
      lastSeenAt: now,
      ...(markFields.signedUpAt ? { signedUpAt: markFields.signedUpAt } : {}),
      ...(markFields.quoteRequestedAt
        ? { quoteRequestedAt: markFields.quoteRequestedAt }
        : {}),
      ...(markFields.guideDownloadedAt
        ? { guideDownloadedAt: markFields.guideDownloadedAt }
        : {}),
      ...(markFields.quickQuoteAt ? { quickQuoteAt: markFields.quickQuoteAt } : {}),
      ...(markFields.budgetPreviewAt
        ? { budgetPreviewAt: markFields.budgetPreviewAt }
        : {}),
      ...(markFields.userId ? { userId: markFields.userId } : {}),
      steps: {
        create: {
          step: input.step.slice(0, 64),
          path: clip(input.path, 500),
          metadata: (input.metadata ?? undefined) as Prisma.InputJsonValue | undefined,
        },
      },
    },
  });
}

export function parseUtmFromSearch(search: string): UtmParams {
  const params = new URLSearchParams(search.startsWith("?") ? search : `?${search}`);
  return {
    utmSource: params.get("utm_source"),
    utmMedium: params.get("utm_medium"),
    utmCampaign: params.get("utm_campaign"),
    utmContent: params.get("utm_content"),
    utmTerm: params.get("utm_term"),
  };
}
