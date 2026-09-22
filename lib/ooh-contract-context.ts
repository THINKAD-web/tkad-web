import type { PrismaClient } from "@prisma/client";
import type { QuoteBreakdown } from "@/lib/quote-calculator";
import {
  buildKoOohContractPdfVars,
  contractMetaWithDefaults,
  resolveContractDatesFromQuote,
} from "@/lib/ooh-contract-pdf-vars";
import type { OohContractPdfVars } from "@/lib/ooh-contract-pdf";
import {
  defaultProductionCostKo,
  formatContractAdUnitPriceDisplay,
  formatContractCampaignName,
  formatContractMediaCount,
} from "@/lib/ooh-contract-format";
import {
  buildContractMoney,
  supplyWonFromManwonField,
} from "@/lib/contract-money";
import type { ContractMediaLineItem } from "@/lib/ooh-contract-pdf";
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
  extras: {
    extraProductionWon?: number;
    extraInstallWon?: number;
    extraOtherWon?: number;
  },
): number {
  const breakdown = row.quoteBreakdown as QuoteBreakdown | null;
  const mediaSupply =
    breakdown?.supplyWon && breakdown.supplyWon > 0
      ? Math.round(breakdown.supplyWon)
      : supplyWonFromManwonField(row.totalAmount, breakdown?.subtotalWon);
  return buildContractMoney({
    mediaSupplyWon: mediaSupply,
    ...extras,
  }).totalWon;
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
  const extras = {
    extraProductionWon: numMeta(meta.extraProductionWon),
    extraInstallWon: numMeta(meta.extraInstallWon),
    extraOtherWon: numMeta(meta.extraOtherWon),
  };
  const totalWon = totalWonFromQuote(row, extras);
  const breakdown = row.quoteBreakdown as QuoteBreakdown | null;
  const mediaItems = mediaLineItemsFromQuote(breakdown, mediaNames);
  const money = buildContractMoney({
    mediaSupplyWon:
      breakdown?.supplyWon && breakdown.supplyWon > 0
        ? breakdown.supplyWon
        : supplyWonFromManwonField(row.totalAmount, breakdown?.subtotalWon),
    ...extras,
  });
  const mediaSupplyWon =
    breakdown?.supplyWon && breakdown.supplyWon > 0
      ? Math.round(breakdown.supplyWon)
      : supplyWonFromManwonField(row.totalAmount, breakdown?.subtotalWon);

  const vars = buildKoOohContractPdfVars({
    contractId: contractRecordId,
    isKo,
    clientCompany: row.clientCompany?.trim() || row.clientName,
    clientRepName: meta.clientRepName ?? row.clientName,
    clientAddress: meta.clientAddress ?? "",
    clientPhone: row.clientPhone?.trim() ?? "",
    campaignName: formatContractCampaignName(mediaNames, meta.campaignName),
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
    totalAmountManwon: undefined,
  });
  vars.mediaLineItems = mediaItems;
  vars.costLines = [
    { label: "제작비", amountWon: money.extraProductionWon },
    { label: "설치비", amountWon: money.extraInstallWon },
    { label: "기타 비용", amountWon: money.extraOtherWon },
  ];
  vars.adUnitPriceDisplay = formatContractAdUnitPriceDisplay(mediaSupplyWon);
  vars.otherNotes = meta.otherNotes?.trim() || undefined;
  const countLabel = meta.mediaCount?.trim();
  if (countLabel && !/^\d+기?$/.test(countLabel)) {
    vars.mediaCount = countLabel;
  }
  return vars;
}

function numMeta(v: unknown): number {
  const n = typeof v === "number" ? v : Number(v);
  return Number.isFinite(n) && n > 0 ? Math.round(n) : 0;
}

function mediaLineItemsFromQuote(
  breakdown: QuoteBreakdown | null,
  mediaNames: string[],
): ContractMediaLineItem[] {
  if (breakdown?.lines?.length) {
    return breakdown.lines.map((line) => ({
      name: line.mediaName,
      spec: line.location || line.quantityLabel || "",
      unitPriceWon: line.unitPriceWon,
      lineSupplyWon: line.lineSupplyWon,
    }));
  }
  return mediaNames.map((name) => ({
    name,
    spec: "",
    unitPriceWon: 0,
    lineSupplyWon: 0,
  }));
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
