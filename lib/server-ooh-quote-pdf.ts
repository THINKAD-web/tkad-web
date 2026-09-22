import type { PrismaClient } from "@prisma/client";
import {
  ensureKrFontForServerPdf,
  krFontFamily,
} from "@/lib/jspdf-register-noto-kr";
import { splitPdfLogicalLines } from "@/lib/pdf-line-break";
import {
  quotePdfToBase64,
  type BuildQuotePdfParams,
  type QuotePdfRow,
  type QuotePdfTimelineStep,
  type QuoteTemplateId,
} from "@/lib/build-quote-pdf";
import {
  NETWORK_CATALOG_ID_PREFIX,
  computeNetworkMonthlyPrice,
  parseNetworkRawId,
} from "@/lib/media-network-public";
import { periodLabelFromKey } from "@/lib/ooh-quote";
import { fetchKakaoStaticMapBase64 } from "@/lib/kakao-static-map";
import type { QuoteBreakdown } from "@/lib/quote-calculator";

export type OoHQuotePdfSource = {
  clientCompany: string | null;
  clientName: string;
  period: string;
  periodKey?: string | null;
  budgetMin: number | null;
  budgetMax: number | null;
  pdfTemplate: string;
  locale: string;
  mediaIds: string[];
  totalAmount: number;
  networkSelections?: unknown;
  quoteBreakdown?: unknown;
  validUntil?: Date | string | null;
  startDate?: Date | string | null;
  endDate?: Date | string | null;
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

function parseBreakdown(raw: unknown): QuoteBreakdown | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as QuoteBreakdown;
  if (!Array.isArray(o.lines)) return null;
  return o;
}

function accountManagerName(): string {
  return (
    process.env.QUOTE_ACCOUNT_MANAGER_NAME?.trim() || "THINKAD Sales Team"
  );
}

function buildTimeline(
  start: Date | null,
  end: Date | null,
  validUntil: Date | null,
  isKo: boolean,
): QuotePdfTimelineStep[] {
  const fmt = (d: Date) => d.toISOString().slice(0, 10);
  const issued = fmt(new Date());
  const steps: QuotePdfTimelineStep[] = [
    {
      label: isKo ? "견적 발행" : "Quote issued",
      date: issued,
    },
  ];
  if (start) {
    steps.push({
      label: isKo ? "집행 시작" : "Campaign start",
      date: fmt(start),
    });
  }
  if (end) {
    steps.push({
      label: isKo ? "집행 종료" : "Campaign end",
      date: fmt(end),
    });
  }
  if (validUntil) {
    steps.push({
      label: isKo ? "견적 유효기간" : "Quote valid until",
      date: fmt(validUntil),
    });
  }
  return steps;
}

export async function buildOoHQuotePdfParams(
  db: PrismaClient,
  row: OoHQuotePdfSource,
): Promise<BuildQuotePdfParams> {
  const isKo = row.locale !== "en";
  const breakdown = parseBreakdown(row.quoteBreakdown);
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

  const breakdownByMedia = new Map(
    breakdown?.lines.map((l) => [l.mediaId, l]) ?? [],
  );

  const rows: QuotePdfRow[] = [];

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
          : computeNetworkMonthlyPrice(
              {
                pricePackage: n.pricePackage,
                pricePerUnit: n.pricePerUnit,
                minUnits: n.minUnits,
                packageOptions: n.packageOptions,
              },
              units,
            );
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
      const bl = breakdownByMedia.get(m.id);
      let mapImageBase64: string | null = null;
      const lat = m.latitude;
      const lng = m.longitude;
      if (lat != null && lng != null) {
        mapImageBase64 = await fetchKakaoStaticMapBase64({ lat, lng });
      }
      const lineManwon = bl
        ? Math.max(1, Math.round(bl.lineSupplyWon / 10_000))
        : m.price;
      rows.push({
        name: (isKo ? m.name : m.nameEn) || m.name,
        location: m.location,
        price: lineManwon,
        nameAscii: (m.nameEn || m.name) ?? "",
        locationAscii: m.location,
        impressions: bl?.impressions,
        mapImageBase64,
      });
    }
  }

  const monthlyCost = rows.reduce((s, r) => s + r.price, 0);
  const periodLabelPdf = periodLabelFromKey(row.periodKey ?? "30days", "en");

  const start =
    row.startDate instanceof Date
      ? row.startDate
      : row.startDate
        ? new Date(row.startDate)
        : null;
  const end =
    row.endDate instanceof Date
      ? row.endDate
      : row.endDate
        ? new Date(row.endDate)
        : null;
  const validUntil =
    row.validUntil instanceof Date
      ? row.validUntil
      : row.validUntil
        ? new Date(row.validUntil)
        : breakdown?.validUntil
          ? new Date(breakdown.validUntil)
          : null;

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
    validUntil: validUntil?.toISOString() ?? breakdown?.validUntil ?? null,
    supplyWon: breakdown?.supplyWon ?? null,
    vatWon: breakdown?.vatWon ?? null,
    totalWithVatManwon: breakdown
      ? Math.max(1, Math.round(breakdown.totalWon / 10_000))
      : row.totalAmount,
    timeline: buildTimeline(
      start && !Number.isNaN(start.getTime()) ? start : null,
      end && !Number.isNaN(end.getTime()) ? end : null,
      validUntil && !Number.isNaN(validUntil.getTime()) ? validUntil : null,
      isKo,
    ),
    accountManagerName: accountManagerName(),
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
  const maxW = pageW - 2 * margin;
  const hasKr = p.isKo ? await ensureKrFontForServerPdf(doc) : false;
  const fam = p.isKo ? krFontFamily(hasKr) : "helvetica";
  let y = 20;
  doc.setFont(fam, "bold");
  doc.setFontSize(14);
  doc.text(p.title, margin, y);
  y += 12;
  doc.setFont(fam, "normal");
  doc.setFontSize(10);
  for (const line of p.lines) {
    for (const physical of splitPdfLogicalLines(line)) {
      if (!physical.trim()) {
        y += 4;
        continue;
      }
      for (const chunk of doc.splitTextToSize(physical, maxW) as string[]) {
        if (y > 280) {
          doc.addPage();
          y = 20;
        }
        doc.text(chunk, margin, y);
        y += 5;
      }
    }
    y += 2;
  }
  const dataUri = doc.output("datauristring") as string;
  const i = dataUri.indexOf(",");
  return i >= 0 ? dataUri.slice(i + 1) : dataUri;
}

export type BillingPdfLine = {
  name: string;
  spec?: string;
  amountWon: number;
};

export async function buildBillingDocumentPdfBase64(p: {
  isKo: boolean;
  kind: "invoice" | "summary";
  clientName: string;
  company?: string | null;
  period: string;
  dueDate?: string;
  lines: BillingPdfLine[];
  extraLines?: BillingPdfLine[];
  supplyWon: number;
  vatWon: number;
  totalWon: number;
  bankName?: string;
  bankAccount?: string;
  bankHolder?: string;
  contactEmail?: string;
  contactPhone?: string;
}): Promise<string> {
  const { default: JsPDF } = await import("jspdf");
  const { getFormalQuoteIssuer } = await import("@/lib/formal-quote-issuer");
  const issuer = getFormalQuoteIssuer();
  const doc = new JsPDF();
  const margin = 16;
  const pageW = doc.internal.pageSize.getWidth();
  const maxW = pageW - 2 * margin;
  const hasKr = p.isKo ? await ensureKrFontForServerPdf(doc) : false;
  const fam = p.isKo ? krFontFamily(hasKr) : "helvetica";
  const won = (n: number) =>
    `￦${Math.round(n).toLocaleString(p.isKo ? "ko-KR" : "en-US")}`;

  let y = 18;
  doc.setFillColor(26, 42, 108);
  doc.rect(0, 0, pageW, 22, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFont(fam, "bold");
  doc.setFontSize(14);
  doc.text(p.isKo ? issuer.companyKo : issuer.companyEn, margin, 14);
  doc.setFontSize(11);
  const title =
    p.kind === "invoice"
      ? p.isKo
        ? "청구서"
        : "Invoice"
      : p.isKo
        ? "계약 요약"
        : "Contract summary";
  doc.text(title, pageW - margin, 14, { align: "right" });

  y = 32;
  doc.setTextColor(20, 20, 20);
  doc.setFont(fam, "normal");
  doc.setFontSize(10);
  const meta = [
    p.isKo ? `수신: ${p.clientName}` : `To: ${p.clientName}`,
    p.company ? (p.isKo ? `회사: ${p.company}` : `Company: ${p.company}`) : "",
    p.isKo ? `집행 기간: ${p.period}` : `Period: ${p.period}`,
    p.dueDate ? (p.isKo ? `납기: ${p.dueDate}` : `Due: ${p.dueDate}`) : "",
  ].filter(Boolean);
  for (const line of meta) {
    doc.text(line, margin, y);
    y += 6;
  }
  y += 4;

  const rows = [...p.lines, ...(p.extraLines ?? [])];
  doc.setFont(fam, "bold");
  doc.text(p.isKo ? "항목" : "Item", margin, y);
  doc.text(p.isKo ? "금액 (VAT 별도)" : "Amount excl. VAT", pageW - margin, y, {
    align: "right",
  });
  y += 2;
  doc.setDrawColor(180, 180, 180);
  doc.line(margin, y, pageW - margin, y);
  y += 6;
  doc.setFont(fam, "normal");
  for (const row of rows) {
    if (y > 260) {
      doc.addPage();
      y = 20;
    }
    const label = row.spec ? `${row.name} · ${row.spec}` : row.name;
    const chunks = doc.splitTextToSize(label, maxW - 40) as string[];
    doc.text(chunks[0] ?? "", margin, y);
    doc.text(won(row.amountWon), pageW - margin, y, { align: "right" });
    y += 6;
  }

  y += 2;
  doc.line(margin, y, pageW - margin, y);
  y += 7;
  const totals = [
    [p.isKo ? "공급가액" : "Supply", won(p.supplyWon)],
    [p.isKo ? "VAT (10%)" : "VAT (10%)", won(p.vatWon)],
    [p.isKo ? "합계" : "Total", won(p.totalWon)],
  ] as const;
  totals.forEach(([label, value], idx) => {
    doc.setFont(fam, idx === 2 ? "bold" : "normal");
    doc.text(label, margin, y);
    doc.text(value, pageW - margin, y, { align: "right" });
    y += 6;
  });

  y += 6;
  doc.setFont(fam, "bold");
  doc.text(p.isKo ? "입금 계좌" : "Bank", margin, y);
  y += 6;
  doc.setFont(fam, "normal");
  for (const line of [
    p.bankName ?? "",
    p.bankAccount ?? "",
    p.bankHolder ? (p.isKo ? `예금주 ${p.bankHolder}` : `Holder ${p.bankHolder}`) : "",
  ].filter(Boolean)) {
    doc.text(line, margin, y);
    y += 5;
  }

  const footerY = 285;
  doc.setFontSize(8);
  doc.setTextColor(90, 90, 90);
  doc.text(
    `${p.isKo ? issuer.companyKo : issuer.companyEn} · ${issuer.tel} · ${issuer.email}`,
    margin,
    footerY,
  );
  if (p.contactPhone || p.contactEmail) {
    doc.text(
      p.isKo
        ? `문의 ${p.contactPhone ?? ""} ${p.contactEmail ?? ""}`.trim()
        : `Contact ${p.contactPhone ?? ""} ${p.contactEmail ?? ""}`.trim(),
      margin,
      footerY + 4,
    );
  }

  const dataUri = doc.output("datauristring") as string;
  const i = dataUri.indexOf(",");
  return i >= 0 ? dataUri.slice(i + 1) : dataUri;
}

