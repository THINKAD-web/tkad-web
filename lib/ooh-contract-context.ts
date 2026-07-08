import type { PrismaClient } from "@prisma/client";
import type { QuoteBreakdown } from "@/lib/quote-calculator";
import {
  buildKoOohContractPdfVars,
  contractMetaWithDefaults,
  resolveContractDatesFromQuote,
  vatIncludedWonFromManwon,
} from "@/lib/ooh-contract-pdf-vars";
import type { OohContractPdfVars } from "@/lib/ooh-contract-pdf";
import {
  defaultProductionCostKo,
  formatContractMediaCount,
} from "@/lib/ooh-contract-format";
import {
  coerceOohQuoteTotalAmountManwon,
} from "@/lib/ooh-quote-amount";
import {
  parseOohContractMeta,
  type OohContractMeta,
} from "@/lib/ooh-contract-meta";

export async function loadOoHQuoteForContract(
  db: PrismaClient,
  quoteId: string,
) {
  return db.ooHQuote.findUnique({
    where: { id: quoteId },
    include: { oohContract: true },
  });
}

function mediaCountFromBreakdown(breakdown: QuoteBreakdown | null | undefined): number {
  if (!breakdown?.lines?.length) return 1;
  let sum = 0;
  for (const line of breakdown.lines) {
    sum += line.quantity ?? 1;
  }
  return Math.max(1, sum);
}

function totalWonFromQuote(
  row: {
    totalAmount: number;
    quoteBreakdown: QuoteBreakdown | null;
  },
): number {
  const breakdown = row.quoteBreakdown as QuoteBreakdown | null;
  if (breakdown?.totalWon && breakdown.totalWon > 0) {
    return Math.round(breakdown.totalWon);
  }
  const ref = breakdown?.totalWon ?? null;
  const { manwon } = coerceOohQuoteTotalAmountManwon(row.totalAmount, ref);
  return vatIncludedWonFromManwon(manwon);
}

export function ooHQuoteToContractPdfVars(
  row: NonNullable<Awaited<ReturnType<typeof loadOoHQuoteForContract>>>,
  mediaNames: string[],
  contractRecordId: string,
  metaOverride?: OohContractMeta,
): OohContractPdfVars {
  const isKo = row.locale !== "en";
  const meta = contractMetaWithDefaults(
    { ...parseOohContractMeta(row.adminNote), ...metaOverride },
    {
      productionCost: defaultProductionCostKo(),
      mediaCount: formatContractMediaCount(
        mediaNames.length || mediaCountFromBreakdown(row.quoteBreakdown as QuoteBreakdown | null),
      ),
    },
  );
  const { start, end } = resolveContractDatesFromQuote(row);
  const totalWon = totalWonFromQuote(row);
  const { manwon } = coerceOohQuoteTotalAmountManwon(
    row.totalAmount,
    (row.quoteBreakdown as QuoteBreakdown | null)?.totalWon,
  );
  const campaignDefault =
    mediaNames.length > 0 ? `${mediaNames[0]} 광고` : "옥외광고 집행";

  return buildKoOohContractPdfVars({
    contractId: contractRecordId,
    isKo,
    clientCompany: row.clientCompany?.trim() || row.clientName,
    clientRepName: meta.clientRepName ?? row.clientName,
    clientAddress: meta.clientAddress ?? "",
    clientPhone: row.clientPhone?.trim() ?? "",
    campaignName: meta.campaignName ?? campaignDefault,
    startDate: start,
    endDate: end,
    totalWonVatIncluded: totalWon,
    productionCost: meta.productionCost,
    mediaCount: meta.mediaCount
      ? parseInt(meta.mediaCount, 10) || mediaNames.length || 1
      : mediaNames.length || mediaCountFromBreakdown(row.quoteBreakdown as QuoteBreakdown | null),
    paymentMethod: meta.paymentMethod,
    clientName: row.clientName,
    mediaLines: mediaNames,
    periodLabel: row.period,
    specialTerms: row.oohContract?.specialTerms ?? null,
    totalAmountManwon: manwon,
  });
}

export async function resolveMediaNamesForQuote(
  db: PrismaClient,
  mediaIds: string[],
  isKo: boolean,
): Promise<string[]> {
  if (mediaIds.length === 0) return [];
  const media = await db.media.findMany({
    where: { id: { in: mediaIds } },
  });
  const order = new Map(mediaIds.map((id, i) => [id, i]));
  media.sort((a, b) => (order.get(a.id) ?? 0) - (order.get(b.id) ?? 0));
  return media.map((m) => (isKo ? m.name : m.nameEn) || m.name);
}
