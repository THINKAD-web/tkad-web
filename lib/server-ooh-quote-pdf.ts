import type { PrismaClient } from "@prisma/client";
import {
  quotePdfToBase64,
  type BuildQuotePdfParams,
  type QuoteTemplateId,
} from "@/lib/build-quote-pdf";
import {
  NETWORK_CATALOG_ID_PREFIX,
  parseNetworkRawId,
} from "@/lib/media-network-public";
import { periodLabelFromKey } from "@/lib/ooh-quote";

export type OoHQuotePdfSource = {
  clientCompany: string | null;
  clientName: string;
  /** Human period (any locale) — not used in PDF body */
  period: string;
  /** For English PDF period line */
  periodKey?: string | null;
  budgetMin: number | null;
  budgetMax: number | null;
  pdfTemplate: string;
  locale: string;
  mediaIds: string[];
  totalAmount: number;
  networkSelections?: unknown;
};

function templateId(raw: string): QuoteTemplateId {
  return raw === "premium" ? "premium" : "default";
}

type NetworkSel = {
  catalogId?: string;
  units?: number;
  regionScope?: string;
  lineTotal?: number;
};

function parseNetworkSelections(raw: unknown): NetworkSel[] {
  if (!Array.isArray(raw)) return [];
  const out: NetworkSel[] = [];
  for (const x of raw) {
    if (!x || typeof x !== "object") continue;
    const o = x as Record<string, unknown>;
    out.push({
      catalogId: typeof o.catalogId === "string" ? o.catalogId : undefined,
      units: typeof o.units === "number" ? o.units : undefined,
      regionScope: typeof o.regionScope === "string" ? o.regionScope : undefined,
      lineTotal: typeof o.lineTotal === "number" ? o.lineTotal : undefined,
    });
  }
  return out;
}

export async function buildOoHQuotePdfParams(
  db: PrismaClient,
  row: OoHQuotePdfSource,
): Promise<BuildQuotePdfParams> {
  const isKo = row.locale !== "en";
  const mediaIds = row.mediaIds.filter(
    (id) => !id.startsWith(NETWORK_CATALOG_ID_PREFIX),
  );
  const nwCatalogIds = row.mediaIds.filter((id) =>
    id.startsWith(NETWORK_CATALOG_ID_PREFIX),
  );
  const selections = parseNetworkSelections(row.networkSelections);
  const selByCatalog = new Map(
    selections
      .filter((s) => s.catalogId)
      .map((s) => [s.catalogId as string, s]),
  );

  const media = await db.media.findMany({
    where: { id: { in: mediaIds }, isActive: true },
  });
  const order = new Map(row.mediaIds.map((id, i) => [id, i]));
  media.sort((a, b) => (order.get(a.id) ?? 0) - (order.get(b.id) ?? 0));

  const rawNwIds = nwCatalogIds
    .map((id) => parseNetworkRawId(id))
    .filter((x): x is string => Boolean(x));
  const networks =
    rawNwIds.length > 0
      ? await db.mediaNetwork.findMany({
          where: { id: { in: rawNwIds }, isActive: true },
        })
      : [];
  const nwById = new Map(networks.map((n) => [n.id, n]));

  type Row = {
    name: string;
    location: string;
    price: number;
    nameAscii?: string;
    locationAscii?: string;
  };
  const rows: Row[] = [];

  for (const id of row.mediaIds) {
    if (id.startsWith(NETWORK_CATALOG_ID_PREFIX)) {
      const raw = parseNetworkRawId(id);
      if (!raw) continue;
      const n = nwById.get(raw);
      if (!n) continue;
      const sel = selByCatalog.get(id);
      const units = sel?.units ?? n.minUnits;
      const regionAscii =
        sel?.regionScope && sel.regionScope !== "all"
          ? sel.regionScope
          : "Regions: all";
      const region =
        sel?.regionScope && sel.regionScope !== "all"
          ? sel.regionScope
          : isKo
            ? "지역: 전체"
            : "Regions: all";
      const line =
        sel?.lineTotal != null && Number.isFinite(sel.lineTotal)
          ? Math.round(sel.lineTotal)
          : n.pricePackage ??
            (n.pricePerUnit != null ? n.pricePerUnit * units : 0);
      rows.push({
        name: `${isKo ? n.name : n.nameEn ?? n.name} (${units}${isKo ? "개소" : " sites"})`,
        location: region,
        price: line,
        nameAscii: `${n.nameEn ?? n.name} (${units} sites)`,
        locationAscii: regionAscii,
      });
    } else {
      const m = media.find((x) => x.id === id);
      if (!m) continue;
      rows.push({
        name: (isKo ? m.name : m.nameEn) || m.name,
        location: m.location,
        price: m.price,
        nameAscii: (m.nameEn || m.name) ?? "",
        locationAscii: m.location,
      });
    }
  }

  const monthlyCost = rows.reduce((s, r) => s + r.price, 0);

  const periodLabelPdf = periodLabelFromKey(row.periodKey ?? "1month", "en");

  return {
    template: templateId(row.pdfTemplate),
    logoDataUrl: null,
    isKo,
    company: row.clientCompany ?? "",
    name: row.clientName,
    periodLabelPdf,
    budgetMin: row.budgetMin,
    budgetMax: row.budgetMax,
    monthlyCost,
    totalCost: row.totalAmount,
    rows,
  };
}

export async function ooHQuotePdfToBase64(
  db: PrismaClient,
  row: OoHQuotePdfSource,
): Promise<string> {
  const params = await buildOoHQuotePdfParams(db, row);
  return quotePdfToBase64(params);
}

/** 간단 계약서/청구서 PDF (텍스트 위주, AI 없이 서버 생성) */
export async function buildSimpleContractPdfBase64(p: {
  isKo: boolean;
  title: string;
  lines: string[];
}): Promise<string> {
  const { default: JsPDF } = await import("jspdf");
  const doc = new JsPDF();
  const margin = 20;
  const pageW = doc.internal.pageSize.getWidth();
  let y = 20;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.text(p.title, margin, y);
  y += 12;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  for (const line of p.lines) {
    for (const chunk of doc.splitTextToSize(line, pageW - 2 * margin)) {
      if (y > 280) {
        doc.addPage();
        y = 20;
      }
      doc.text(chunk, margin, y);
      y += 5;
    }
    y += 2;
  }
  const dataUri = doc.output("datauristring") as string;
  const i = dataUri.indexOf(",");
  return i >= 0 ? dataUri.slice(i + 1) : dataUri;
}
