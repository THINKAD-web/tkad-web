import type { Quote, QuoteItem } from "@prisma/client";
import type {
  AdminFormalQuotePdfParams,
  AdminFormalQuotePdfRow,
} from "@/lib/build-admin-formal-quote-pdf";

export const ADMIN_QUOTE_STATUSES = [
  "draft",
  "sent",
  "contracted",
  "expired",
] as const;

export type AdminQuoteStatus = (typeof ADMIN_QUOTE_STATUSES)[number];

export function isAdminQuoteStatus(s: string): s is AdminQuoteStatus {
  return (ADMIN_QUOTE_STATUSES as readonly string[]).includes(s);
}

export type QuoteItemCreateInput = {
  mediaId: string | null;
  mediaName: string;
  spec: string | null;
  period: string;
  unitPrice: number;
  quantity: number;
  amount: number;
};

export type QuoteItemApi = {
  id: string;
  mediaId: string | null;
  mediaName: string;
  spec: string | null;
  period: string;
  unitPrice: number;
  quantity: number;
  amount: number;
};

export type QuoteApi = {
  id: string;
  quoteNumber: string;
  status: string;
  clientName: string;
  clientEmail: string | null;
  clientPhone: string | null;
  validUntil: string;
  subtotal: number;
  discount: number;
  tax: number;
  total: number;
  items: QuoteItemApi[];
  isKo: boolean;
  sentAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export function serializeQuoteItem(it: QuoteItem): QuoteItemApi {
  return {
    id: it.id,
    mediaId: it.mediaId,
    mediaName: it.mediaName,
    spec: it.spec,
    period: it.period,
    unitPrice: it.unitPrice,
    quantity: it.quantity,
    amount: it.amount,
  };
}

export function serializeQuote(
  q: Quote & { items?: QuoteItem[] },
): QuoteApi {
  return {
    id: q.id,
    quoteNumber: q.quoteNumber,
    status: q.status,
    clientName: q.clientName,
    clientEmail: q.clientEmail,
    clientPhone: q.clientPhone,
    validUntil: q.validUntil.toISOString(),
    subtotal: q.subtotal,
    discount: q.discount,
    tax: q.tax,
    total: q.total,
    items: (q.items ?? []).map(serializeQuoteItem),
    isKo: q.isKo,
    sentAt: q.sentAt?.toISOString() ?? null,
    createdAt: q.createdAt.toISOString(),
    updatedAt: q.updatedAt.toISOString(),
  };
}

export function parseQuoteItemsInput(raw: unknown): QuoteItemCreateInput[] | null {
  if (!Array.isArray(raw) || raw.length === 0) return null;
  const out: QuoteItemCreateInput[] = [];
  for (const r of raw) {
    if (!r || typeof r !== "object") return null;
    const o = r as Record<string, unknown>;
    const mediaName = String(o.mediaName ?? "").trim();
    if (!mediaName) return null;
    const period = String(o.period ?? "").trim();
    if (!period) return null;
    const unitPrice = Math.round(Number(o.unitPrice));
    const quantity = Math.max(1, Math.round(Number(o.quantity)) || 1);
    const amount = Math.round(Number(o.amount));
    if (!Number.isFinite(unitPrice) || !Number.isFinite(amount)) return null;
    const mediaId =
      typeof o.mediaId === "string" && o.mediaId.trim()
        ? o.mediaId.trim()
        : null;
    const spec =
      typeof o.spec === "string" && o.spec.trim() ? o.spec.trim() : null;
    out.push({
      mediaId,
      mediaName,
      spec,
      period,
      unitPrice,
      quantity,
      amount,
    });
  }
  return out;
}

/** UI에서 `회사 · 담당자` 형태로 합친 clientName을 PDF 고객 블록에 나눠 표시 */
function splitClientDisplay(clientName: string): { company: string; contact: string } {
  const sep = " · ";
  const i = clientName.indexOf(sep);
  if (i === -1) return { company: clientName, contact: "—" };
  const company = clientName.slice(0, i).trim() || clientName;
  const contact = clientName.slice(i + sep.length).trim() || "—";
  return { company, contact };
}

export function quoteToPdfParams(
  quote: Quote & { items: QuoteItem[] },
  opts?: { logoDataUrl?: string | null },
): AdminFormalQuotePdfParams {
  const { company, contact } = splitClientDisplay(quote.clientName);
  const issueDate = quote.createdAt.toISOString().slice(0, 10);
  const validUntil = quote.validUntil.toISOString().slice(0, 10);
  const periods = [...new Set(quote.items.map((i) => i.period))];
  const periodLabel =
    periods.length === 0 ? "—" : periods.length <= 2 ? periods.join(", ") : `${periods[0]} 외`;

  const rows: AdminFormalQuotePdfRow[] = quote.items.map((it) => ({
    name: it.mediaName,
    spec: it.spec ?? "—",
    period: it.period,
    unitPriceWon: it.unitPrice,
    quantity: it.quantity,
    lineTotalWon: it.amount,
  }));

  const supplyWon = Math.max(0, quote.subtotal - quote.discount);

  return {
    isKo: quote.isKo,
    logoDataUrl: opts?.logoDataUrl ?? null,
    quoteNumber: quote.quoteNumber,
    issueDate,
    validUntil,
    clientCompany: company,
    clientName: contact,
    clientPhone: quote.clientPhone?.trim() || "—",
    clientEmail: quote.clientEmail ?? undefined,
    periodLabel,
    vatIncluded: false,
    discountTotalWon: quote.discount,
    discountSummary:
      quote.discount > 0
        ? quote.isKo
          ? `할인`
          : "Discount"
        : undefined,
    rows,
    linesSubtotalWon: quote.subtotal,
    supplyWon,
    vatWon: quote.tax,
    totalWon: quote.total,
  };
}

export function generateAdminQuoteNumber(): string {
  const ymd = new Date().toISOString().slice(0, 10).replace(/-/g, "");
  const rnd = Math.random().toString(36).slice(2, 6).toUpperCase();
  return `TKQ-${ymd}-${rnd}`;
}

export function parseValidUntilDate(s: string): Date | null {
  const t = s.trim();
  if (!t) return null;
  const d = new Date(`${t.slice(0, 10)}T12:00:00.000Z`);
  return Number.isNaN(d.getTime()) ? null : d;
}
