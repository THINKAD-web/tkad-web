import type { PrismaClient } from "@prisma/client";
import type { QuoteBreakdown } from "@/lib/quote-calculator";
import {
  buildKoOohContractPdfVars,
  contractMetaWithDefaults,
  resolveContractDatesFromQuote,
} from "@/lib/ooh-contract-pdf-vars";
import type { OohContractPdfVars } from "@/lib/ooh-contract-pdf";
import {
  buildMediaContractSpecLabel,
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
  const breakdownForCount = row.quoteBreakdown as QuoteBreakdown | null;
  const defaultUnitCount = Math.max(
    mediaNames.length,
    mediaCountFromBreakdown(breakdownForCount),
  );
  const meta = contractMetaWithDefaults(
    { ...parseOohContractMeta(row.adminNote), ...metaOverride },
    {
      productionCost: defaultProductionCostKo(),
      mediaCount: formatContractMediaCount(defaultUnitCount),
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
    mediaCount: defaultUnitCount,
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
  const noteParts = [
    meta.otherNotes?.trim(),
    row.oohContract?.specialTerms?.trim(),
  ].filter(Boolean);
  vars.otherNotes = noteParts.length > 0 ? noteParts.join("\n") : undefined;
  const countLabel = metaOverride?.mediaCount?.trim() ?? meta.mediaCount?.trim();
  if (countLabel && !/^\d+기?$/.test(countLabel)) {
    vars.mediaCount = countLabel;
  } else {
    vars.mediaCount = formatContractMediaCount(defaultUnitCount);
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
  const pack = await resolveContractMediaForQuote(
    db,
    mediaIds,
    null,
    isKo,
  );
  return pack.names;
}

export async function resolveContractMediaForQuote(
  db: PrismaClient,
  mediaIds: string[],
  breakdown: QuoteBreakdown | null,
  isKo: boolean,
): Promise<{ names: string[]; lineItems: ContractMediaLineItem[] }> {
  if (mediaIds.length === 0) return { names: [], lineItems: [] };
  const media = await db.media.findMany({
    where: { id: { in: mediaIds } },
    select: {
      id: true,
      name: true,
      nameEn: true,
      location: true,
      region: true,
      width: true,
      height: true,
    },
  });
  const order = new Map(mediaIds.map((id, i) => [id, i]));
  media.sort((a, b) => (order.get(a.id) ?? 0) - (order.get(b.id) ?? 0));

  const lineByName = new Map(
    (breakdown?.lines ?? []).map((line) => [line.mediaName, line]),
  );

  const names: string[] = [];
  const lineItems: ContractMediaLineItem[] = [];

  for (const m of media) {
    const name = (isKo ? m.name : m.nameEn) || m.name;
    names.push(name);
    const bd = lineByName.get(name) ?? breakdown?.lines?.[lineItems.length];
    const spec =
      bd?.location?.trim() ||
      buildMediaContractSpecLabel(m) ||
      bd?.quantityLabel?.trim() ||
      "";
    lineItems.push({
      name,
      spec,
      unitPriceWon: bd?.unitPriceWon ?? 0,
      lineSupplyWon: bd?.lineSupplyWon ?? 0,
    });
  }

  if (lineItems.length === 0 && breakdown?.lines?.length) {
    for (const line of breakdown.lines) {
      names.push(line.mediaName);
      lineItems.push({
        name: line.mediaName,
        spec: line.location || line.quantityLabel || "",
        unitPriceWon: line.unitPriceWon,
        lineSupplyWon: line.lineSupplyWon,
      });
    }
  }

  return { names, lineItems };
}
