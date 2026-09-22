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
  formatContractCampaignName,
  formatContractMediaCount,
} from "@/lib/ooh-contract-format";
import {
  buildContractMoney,
  resolveContractExtraWons,
  resolveContractMediaCountLabel,
  supplyWonFromManwonField,
} from "@/lib/contract-money";
import { inclusiveCampaignDays } from "@/lib/admin-quote-calc";
import { isQuoteAddonLineId } from "@/lib/quote-addon-line";
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
  const mediaLines = (breakdown?.lines ?? []).filter(
    (line) => line.mediaId && !isQuoteAddonLineId(line.mediaId),
  );
  if (mediaLines.length === 0) return 0;
  let sum = 0;
  for (const line of mediaLines) {
    sum += line.quantity ?? 1;
  }
  return Math.max(1, sum);
}

export function catalogSupplyWonForPeriod(input: {
  price: number | null | undefined;
  pricePeriod?: string | null;
  start: Date | null;
  end: Date | null;
}): number {
  const price = Math.round(input.price ?? 0);
  if (price <= 0) return 0;
  const start = input.start ?? new Date();
  const end = input.end ?? start;
  const days = Math.max(1, inclusiveCampaignDays(start, end));
  const period = input.pricePeriod ?? "month";
  if (period === "day") return price * days;
  if (period === "week") return price * Math.max(1, Math.round(days / 7));
  return price * Math.max(1, Math.round(days / 30));
}

export function ooHQuoteToContractPdfVars(
  row: NonNullable<Awaited<ReturnType<typeof loadOoHQuoteForContract>>>,
  mediaNames: string[],
  contractRecordId: string,
  metaOverride?: OohContractMeta,
  lineItems?: ContractMediaLineItem[],
): OohContractPdfVars {
  const isKo = row.locale !== "en";
  const breakdownForCount = row.quoteBreakdown as QuoteBreakdown | null;
  const mediaIdCount = row.mediaIds?.length ?? 0;
  const defaultUnitCount = Math.max(
    mediaIdCount,
    mediaNames.length,
    mediaCountFromBreakdown(breakdownForCount),
    1,
  );
  const meta = contractMetaWithDefaults(
    { ...parseOohContractMeta(row.adminNote), ...metaOverride },
    {
      productionCost: defaultProductionCostKo(),
      mediaCount: formatContractMediaCount(defaultUnitCount),
    },
  );
  const { start, end } = resolveContractDatesFromQuote(row);
  const extras = resolveContractExtraWons(meta, breakdownForCount);
  const breakdown = row.quoteBreakdown as QuoteBreakdown | null;
  const mediaItems = lineItems?.length
    ? lineItems
    : mediaLineItemsFromQuote(breakdown, mediaNames);
  const contractMediaSupplyWon = supplyWonFromManwonField(row.totalAmount);
  const money = buildContractMoney({
    mediaLines: mediaItems.map((item) => ({
      name: item.name,
      location: item.location ?? "",
      spec: item.spec,
      supplyWon: item.lineSupplyWon,
    })),
    contractMediaSupplyWon,
    ...extras,
    productionCostText: meta.productionCost,
  });

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
    totalWonVatIncluded: money.totalWon,
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
  vars.adUnitPriceDisplay = money.adUnitPriceDisplay;
  vars.totalAmount = money.totalAmountDisplay;
  vars.amountKorean = money.amountKorean;
  vars.contractMoney = money;
  const noteParts = [
    meta.otherNotes?.trim(),
    row.oohContract?.specialTerms?.trim(),
  ].filter(Boolean);
  vars.otherNotes = noteParts.length > 0 ? noteParts.join("\n") : undefined;
  const count = resolveContractMediaCountLabel({
    mediaUnitCount: defaultUnitCount,
    adminMediaCount: metaOverride?.mediaCount ?? meta.mediaCount,
  });
  vars.mediaCount = count.label;
  vars.mediaCountOverridden = count.overridden;
  return vars;
}

function mediaLineItemsFromQuote(
  breakdown: QuoteBreakdown | null,
  mediaNames: string[],
): ContractMediaLineItem[] {
  const mediaLines = (breakdown?.lines ?? []).filter(
    (line) => line.mediaId && !isQuoteAddonLineId(line.mediaId),
  );
  if (mediaLines.length) {
    return mediaLines.map((line) => ({
      name: line.mediaName,
      location: line.location || "",
      spec: line.quantityLabel || "",
      unitPriceWon: line.unitPriceWon,
      lineSupplyWon: line.lineSupplyWon,
    }));
  }
  return mediaNames.map((name) => ({
    name,
    location: "",
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
  period?: { start: Date | null; end: Date | null },
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
      price: true,
      pricePeriod: true,
    },
  });
  const order = new Map(mediaIds.map((id, i) => [id, i]));
  media.sort((a, b) => (order.get(a.id) ?? 0) - (order.get(b.id) ?? 0));

  const mediaLines = (breakdown?.lines ?? []).filter(
    (line) => line.mediaId && !isQuoteAddonLineId(line.mediaId),
  );
  const lineByMediaId = new Map(mediaLines.map((line) => [line.mediaId, line]));
  const lineByName = new Map(mediaLines.map((line) => [line.mediaName.trim(), line]));

  const names: string[] = [];
  const lineItems: ContractMediaLineItem[] = [];

  for (const m of media) {
    const name = (isKo ? m.name : m.nameEn) || m.name;
    names.push(name);
    const bd =
      lineByMediaId.get(m.id) ??
      lineByName.get(name.trim()) ??
      lineByName.get(m.name.trim()) ??
      mediaLines[lineItems.length];
    const sizeSpec = buildMediaContractSpecLabel({
      width: m.width,
      height: m.height,
    });
    const location =
      m.location?.trim() ||
      m.region?.trim() ||
      bd?.location?.trim() ||
      "";
    const spec = sizeSpec || bd?.quantityLabel?.trim() || "";
    const fromBreakdown = Math.round(bd?.lineSupplyWon ?? 0);
    const lineSupplyWon =
      fromBreakdown > 0
        ? fromBreakdown
        : catalogSupplyWonForPeriod({
            price: m.price,
            pricePeriod: m.pricePeriod,
            start: period?.start ?? null,
            end: period?.end ?? null,
          });
    lineItems.push({
      name,
      location,
      spec,
      unitPriceWon: bd?.unitPriceWon ?? lineSupplyWon,
      lineSupplyWon,
    });
  }

  return { names, lineItems };
}
