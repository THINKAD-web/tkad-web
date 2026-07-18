import { CONTACT_EMAIL } from "@/lib/constants";
import {
  addPdfThumbImage,
  EXPORT_THUMB_BOX_MM,
  loadExportThumbMap,
} from "@/lib/export-media-images";
import {
  ensureKrFontForServerPdf,
  krFontFamily,
} from "@/lib/jspdf-register-noto-kr";
import type { RfpProposalExportPayload } from "@/lib/rfp-proposal-export/types";

/** qp accent — planner PDF 와 동일 톤 */
const ACCENT = [255, 98, 0] as const;
const INK = [17, 24, 39] as const;
const GRAY_600 = [75, 85, 99] as const;
const GRAY_500 = [107, 114, 128] as const;
const GRAY_200 = [228, 230, 236] as const;
const GRAY_50 = [248, 249, 251] as const;
const WHITE = [255, 255, 255] as const;
const GREEN = [5, 150, 105] as const;
const AMBER = [180, 83, 9] as const;

const M = 14;

/**
 * RFP 제안서 PDF — 권역 그룹별 섹션 구조.
 * 기존 quote/planner export 파이프라인과 독립 (서버 jsPDF만 재사용).
 */
export async function buildRfpProposalPdf(
  p: RfpProposalExportPayload,
): Promise<Uint8Array> {
  const { default: JsPDF } = await import("jspdf");
  const doc = new JsPDF({ unit: "mm", format: "a4" });
  const hasKr = await ensureKrFontForServerPdf(doc);
  const FONT = krFontFamily(hasKr);

  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const contentW = pageW - M * 2;
  const isKo = p.isKo;

  const thumbs = await loadExportThumbMap(
    p.groups.flatMap((g) =>
      g.mediaItems.map((m) => ({ thumbUrl: m.thumbUrl })),
    ),
  );

  const setFill = (c: readonly number[]) =>
    doc.setFillColor(c[0]!, c[1]!, c[2]!);
  const setText = (c: readonly number[]) =>
    doc.setTextColor(c[0]!, c[1]!, c[2]!);
  const setDraw = (c: readonly number[]) =>
    doc.setDrawColor(c[0]!, c[1]!, c[2]!);

  let y = 0;

  function ensure(need: number) {
    if (y + need > pageH - 16) {
      doc.addPage();
      y = M;
    }
  }

  function footer() {
    const pages = doc.getNumberOfPages();
    for (let i = 1; i <= pages; i++) {
      doc.setPage(i);
      doc.setFont(FONT, "normal");
      doc.setFontSize(7);
      setText(GRAY_500);
      doc.text("THINKAD RFP PROPOSAL", M, pageH - 8);
      doc.text(`${i} / ${pages}`, pageW - M, pageH - 8, { align: "right" });
    }
  }

  function sectionTitle(label: string) {
    ensure(12);
    doc.setFont(FONT, "normal");
    doc.setFontSize(12);
    setFill(ACCENT);
    doc.rect(M, y, 1.8, 5.5, "F");
    setText(INK);
    doc.text(label, M + 4.5, y + 4.8);
    y += 10;
  }

  function drawWordmark(x: number, baseY: number, size: number) {
    doc.setFont(FONT, "normal");
    doc.setFontSize(size);
    doc.setTextColor(255, 255, 255);
    doc.text("THINK", x, baseY);
    const w = doc.getTextWidth("THINK");
    doc.setTextColor(255, 210, 180);
    doc.text("AD", x + w, baseY);
  }

  // ── Cover / hero ──
  const heroH = 42;
  setFill([28, 28, 31]);
  doc.rect(0, 0, pageW, heroH, "F");
  setFill(ACCENT);
  doc.rect(0, heroH, pageW, 1.4, "F");

  drawWordmark(M, 14, 13);
  doc.setFontSize(7.5);
  doc.setTextColor(200, 200, 205);
  doc.text(isKo ? "RFP 매체 제안서" : "RFP Media Proposal", pageW - M, 14, {
    align: "right",
  });

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(18);
  const titleLines = doc.splitTextToSize(p.documentTitle, contentW) as string[];
  doc.text(titleLines.slice(0, 2), M, 28);
  doc.setFontSize(9);
  doc.setTextColor(200, 200, 205);
  doc.text(
    `${p.generatedAt}${p.campaign.period ? ` · ${p.campaign.period}` : ""}`,
    M,
    38,
  );

  y = heroH + 10;

  // ── Campaign overview ──
  sectionTitle(isKo ? "1. 캠페인 개요" : "1. Campaign overview");
  setFill(GRAY_50);
  setDraw(GRAY_200);
  doc.setLineWidth(0.2);
  const overviewH = 28;
  doc.roundedRect(M, y, contentW, overviewH, 2, 2, "FD");

  const meta: [string, string][] = [
    [isKo ? "브랜드" : "Brand", p.campaign.brandName?.trim() || "—"],
    [isKo ? "진행 시기" : "Period", p.campaign.period?.trim() || "—"],
    [isKo ? "타겟" : "Target", p.campaign.target?.trim() || "—"],
    [isKo ? "업종" : "Industry", p.campaign.industry?.trim() || "—"],
  ];
  doc.setFont(FONT, "normal");
  let mx = M + 4;
  let my = y + 7;
  for (let i = 0; i < meta.length; i++) {
    const [label, value] = meta[i]!;
    doc.setFontSize(7);
    setText(GRAY_500);
    doc.text(label, mx, my);
    doc.setFontSize(9.5);
    setText(INK);
    const lines = doc.splitTextToSize(value, contentW / 2 - 10) as string[];
    doc.text(lines.slice(0, 2), mx, my + 5);
    if (i % 2 === 0) {
      mx = M + contentW / 2 + 2;
    } else {
      mx = M + 4;
      my += 12;
    }
  }
  y += overviewH + 8;

  // ── Group sections ──
  for (let gi = 0; gi < p.groups.length; gi++) {
    const g = p.groups[gi]!;
    sectionTitle(
      isKo
        ? `${gi + 2}. ${g.groupLabel}`
        : `${gi + 2}. ${g.groupLabel}`,
    );

    if (g.regionKeywords.length > 0 || g.mediaTypeKeywords.length > 0) {
      ensure(8);
      doc.setFontSize(7.5);
      setText(GRAY_500);
      const kw = [
        g.regionKeywords.length
          ? `${isKo ? "권역" : "Regions"}: ${g.regionKeywords.slice(0, 8).join(", ")}`
          : "",
        g.mediaTypeKeywords.length
          ? `${isKo ? "유형" : "Types"}: ${g.mediaTypeKeywords.slice(0, 6).join(", ")}`
          : "",
      ]
        .filter(Boolean)
        .join("  ·  ");
      const kwLines = doc.splitTextToSize(kw, contentW) as string[];
      doc.text(kwLines.slice(0, 2), M, y);
      y += Math.min(kwLines.length, 2) * 3.5 + 2;
    }

    if (g.mediaItems.length === 0) {
      ensure(8);
      doc.setFontSize(9);
      setText(GRAY_500);
      doc.text(
        isKo ? "매칭된 매체가 없습니다." : "No matched media.",
        M,
        y + 4,
      );
      y += 10;
      continue;
    }

    const thumbW = EXPORT_THUMB_BOX_MM.w;
    const thumbH = EXPORT_THUMB_BOX_MM.h;

    for (const m of g.mediaItems) {
      const cardH = 22;
      ensure(cardH + 2);

      setFill(WHITE);
      setDraw(GRAY_200);
      doc.setLineWidth(0.2);
      doc.roundedRect(M, y, contentW, cardH, 2, 2, "FD");

      const thumb = m.thumbUrl ? thumbs.get(m.thumbUrl) : undefined;
      const boxX = M + 2;
      const boxY = y + (cardH - thumbH) / 2;
      setFill(GRAY_50);
      doc.roundedRect(boxX, boxY, thumbW, thumbH, 1.2, 1.2, "F");
      if (thumb) {
        addPdfThumbImage(doc, thumb, boxX, boxY, thumbW, thumbH);
      }

      const textX = M + 2 + thumbW + 3;
      const textW = contentW - thumbW - 42;

      doc.setFont(FONT, "normal");
      doc.setFontSize(10);
      setText(INK);
      doc.text(
        (doc.splitTextToSize(m.name, textW) as string[]).slice(0, 1),
        textX,
        y + 5.5,
      );

      doc.setFontSize(7);
      setText(GRAY_600);
      doc.text(
        (doc.splitTextToSize(m.location || "—", textW) as string[]).slice(
          0,
          1,
        ),
        textX,
        y + 9.5,
      );

      doc.setFontSize(7.5);
      setText(GRAY_600);
      doc.text(
        (doc.splitTextToSize(m.oneLine || "—", textW) as string[]).slice(0, 1),
        textX,
        y + 14,
      );

      // TO badge
      const badge = m.toBadge === "available" ? GREEN : AMBER;
      const badgeW = isKo ? 16 : 18;
      setFill(badge);
      doc.roundedRect(textX, y + 16.2, badgeW, 4.2, 1, 1, "F");
      doc.setFontSize(6);
      setText(WHITE);
      doc.text(m.toLabel, textX + badgeW / 2, y + 19.2, { align: "center" });

      // Price
      const priceX = M + contentW - 3;
      doc.setFontSize(6.5);
      setText(GRAY_500);
      doc.text(isKo ? "월 단가" : "Monthly", priceX, y + 7, {
        align: "right",
      });
      doc.setFontSize(10);
      setText(ACCENT);
      doc.text(m.priceLabel, priceX, y + 12, { align: "right" });
      if (m.score > 0) {
        doc.setFontSize(6.5);
        setText(GRAY_500);
        doc.text(`${Math.round(m.score)}pt`, priceX, y + 16.5, {
          align: "right",
        });
      }

      y += cardH + 2;
    }

    // Contract notice under each group
    ensure(14);
    doc.setFontSize(7.5);
    setText(GRAY_600);
    const noticeLines = doc.splitTextToSize(
      p.contractNotice,
      contentW,
    ) as string[];
    doc.text(noticeLines.slice(0, 3), M, y + 3);
    y += Math.min(noticeLines.length, 3) * 3.4 + 6;
  }

  // ── Production cost notice ──
  const prodSectionN = p.groups.length + 2;
  sectionTitle(
    isKo
      ? `${prodSectionN}. 제작비 안내`
      : `${prodSectionN}. Production cost`,
  );
  ensure(14);
  setFill([255, 247, 237]);
  setDraw(ACCENT);
  doc.setLineWidth(0.25);
  const prodLines = doc.splitTextToSize(
    p.productionCostNotice,
    contentW - 8,
  ) as string[];
  const prodH = Math.max(12, prodLines.length * 4 + 6);
  doc.roundedRect(M, y, contentW, prodH, 2, 2, "FD");
  doc.setFontSize(8.5);
  setText(INK);
  doc.text(prodLines.slice(0, 4), M + 4, y + 5.5);
  y += prodH + 8;

  // ── Optional recommend comment ──
  if (p.recommendComment?.trim()) {
    const recN = prodSectionN + 1;
    sectionTitle(
      isKo
        ? `${recN}. 타겟 맞춤 추천`
        : `${recN}. Target recommendation`,
    );
    ensure(16);
    doc.setFontSize(9);
    setText(INK);
    const recLines = doc.splitTextToSize(
      p.recommendComment.trim(),
      contentW,
    ) as string[];
    doc.text(recLines.slice(0, 12), M, y + 3);
    y += Math.min(recLines.length, 12) * 4 + 6;
  }

  // ── Disclaimer ──
  ensure(18);
  doc.setFontSize(7);
  setText(GRAY_500);
  const disc = doc.splitTextToSize(p.disclaimer, contentW) as string[];
  doc.text(disc.slice(0, 3), M, y + 3);
  y += Math.min(disc.length, 3) * 3.2 + 6;
  doc.setFontSize(7.5);
  setText(GRAY_600);
  doc.text(
    isKo
      ? `문의: ${CONTACT_EMAIL}`
      : `Contact: ${CONTACT_EMAIL}`,
    M,
    y + 3,
  );

  footer();

  const ab = doc.output("arraybuffer");
  return new Uint8Array(ab);
}
