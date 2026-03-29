import type { PrismaClient } from "@prisma/client";
import type { OohContractPdfVars } from "@/lib/ooh-contract-pdf";

export async function loadOoHQuoteForContract(
  db: PrismaClient,
  quoteId: string,
) {
  return db.ooHQuote.findUnique({
    where: { id: quoteId },
    include: { oohContract: true },
  });
}

export function ooHQuoteToContractPdfVars(
  row: NonNullable<Awaited<ReturnType<typeof loadOoHQuoteForContract>>>,
  mediaNames: string[],
  contractRecordId: string,
): OohContractPdfVars {
  const isKo = row.locale !== "en";
  const company = row.clientCompany?.trim();
  const advertiserLine = company
    ? isKo
      ? `${company} (${row.clientName})`
      : `${company} — ${row.clientName}`
    : row.clientName;

  const amountLine = isKo
    ? `총 광고 집행 금액(참고, 부가세 별도, 만원): ₩${row.totalAmount.toLocaleString("ko-KR")}`
    : `Total media fee (excl. VAT, 10K KRW units): ₩${row.totalAmount.toLocaleString("en-US")}`;

  return {
    isKo,
    advertiserLine,
    mediaLines: mediaNames,
    period: row.period,
    amountLine,
    specialTerms: row.oohContract?.specialTerms ?? null,
    contractId: contractRecordId,
  };
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
