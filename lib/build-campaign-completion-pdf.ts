import type { jsPDF } from "jspdf";
import {
  krFontFamily,
  registerNotoSansKrIfAvailable,
} from "@/lib/jspdf-register-noto-kr";

export type CompletionPdfSchedule = {
  title: string;
  startsAt: Date;
  endsAt: Date;
  kind: string;
};

export type CompletionPdfProof = {
  imageUrl: string;
  caption: string | null;
};

export type CompletionPdfFinancial = {
  kind: string;
  title: string;
  amountKrw: number | null;
  status: string;
};

export type CompletionPdfMediaBooking = {
  title: string;
  mediaName: string;
  location: string;
  type: string;
  startsAt: Date;
  endsAt: Date;
  status: string;
};

export type BuildCampaignCompletionPdfParams = {
  campaignName: string;
  clientCompany: string;
  clientName: string;
  clientEmail: string;
  status: string;
  notes: string | null;
  scheduleEvents: CompletionPdfSchedule[];
  proofPhotos: CompletionPdfProof[];
  financialDocs: CompletionPdfFinancial[];
  /** 예약된 매체 행 */
  mediaBookings?: CompletionPdfMediaBooking[];
  /** AI 생성 섹션 (한국어) */
  aiOverviewKo?: string | null;
  aiMediaDetailKo?: string | null;
  aiPerformanceKo?: string | null;
  aiInsightsKo?: string | null;
};

export async function createCampaignCompletionPdfDoc(
  p: BuildCampaignCompletionPdfParams,
): Promise<jsPDF> {
  const { default: JsPDF } = await import("jspdf");
  const doc = new JsPDF();
  const hasKrFont = registerNotoSansKrIfAvailable(doc);
  const fam = krFontFamily(hasKrFont);
  const margin = 20;
  const pageW = doc.internal.pageSize.getWidth();
  let y = 18;

  doc.setFont(fam, hasKrFont ? "normal" : "bold");
  doc.setFontSize(16);
  doc.setTextColor(15, 23, 42);
  doc.text("캠페인 완료 보고서", margin, y);
  y += 10;

  doc.setFontSize(9);
  doc.setFont(fam, "normal");
  doc.setTextColor(80, 80, 80);
  doc.text(
    `발행일: ${new Date().toLocaleString("sv-SE", { timeZone: "Asia/Seoul" }).replace("T", " ").slice(0, 16)} (KST)`,
    margin,
    y,
  );
  y += 8;

  const pageBottom = 275;
  const ensureSpace = (need: number) => {
    if (y + need > pageBottom) {
      doc.addPage();
      y = 20;
    }
  };

  const writeHeading = (label: string) => {
    ensureSpace(12);
    doc.setFont(fam, hasKrFont ? "normal" : "bold");
    doc.setFontSize(11);
    doc.setTextColor(15, 23, 42);
    doc.text(label, margin, y);
    y += 7;
    doc.setFont(fam, "normal");
    doc.setFontSize(10);
  };

  const writeBody = (text: string | null | undefined) => {
    if (!text?.trim()) return;
    for (const w of doc.splitTextToSize(text.trim(), pageW - 2 * margin)) {
      ensureSpace(6);
      doc.text(w, margin, y);
      y += 5;
    }
    y += 4;
  };

  if (p.aiOverviewKo?.trim()) {
    writeHeading("캠페인 개요 (AI)");
    writeBody(p.aiOverviewKo);
  }

  doc.setFontSize(11);
  doc.setTextColor(15, 23, 42);
  doc.setFont(fam, hasKrFont ? "normal" : "bold");
  doc.text("캠페인 정보", margin, y);
  y += 7;
  doc.setFont(fam, "normal");
  doc.setFontSize(10);
  const infoLines = [
    `캠페인명: ${p.campaignName}`,
    `고객사: ${p.clientCompany} / 담당: ${p.clientName}`,
    `이메일: ${p.clientEmail}`,
    `상태: ${p.status}`,
  ];
  for (const line of infoLines) {
    for (const w of doc.splitTextToSize(line, pageW - 2 * margin)) {
      doc.text(w, margin, y);
      y += 5;
    }
  }
  if (p.notes?.trim()) {
    y += 2;
    doc.text("비고:", margin, y);
    y += 5;
    for (const w of doc.splitTextToSize(p.notes.trim(), pageW - 2 * margin)) {
      doc.text(w, margin, y);
      y += 5;
    }
  }
  y += 6;

  const bookings = p.mediaBookings ?? [];
  if (bookings.length > 0) {
    writeHeading("예약 매체 (시스템)");
    doc.setFontSize(9);
    for (const b of bookings) {
      const line = `· ${b.mediaName} · ${b.location} (${b.type}) — ${b.title} [${b.status}] ${b.startsAt.toISOString().slice(0, 10)}~${b.endsAt.toISOString().slice(0, 10)}`;
      for (const w of doc.splitTextToSize(line, pageW - 2 * margin)) {
        ensureSpace(5);
        doc.text(w, margin, y);
        y += 4.5;
      }
    }
    y += 4;
    doc.setFontSize(10);
  }

  if (p.aiMediaDetailKo?.trim()) {
    writeHeading("매체·집행 상세 (AI)");
    writeBody(p.aiMediaDetailKo);
  }

  doc.setFont(fam, hasKrFont ? "normal" : "bold");
  doc.setFontSize(11);
  doc.text("송출·일정", margin, y);
  y += 7;
  doc.setFont(fam, "normal");
  doc.setFontSize(9);
  if (p.scheduleEvents.length === 0) {
    doc.text("등록된 일정 없음", margin, y);
    y += 6;
  } else {
    for (const ev of p.scheduleEvents) {
      const line = `· ${ev.title} (${ev.kind}) ${ev.startsAt.toISOString().slice(0, 16)} ~ ${ev.endsAt.toISOString().slice(0, 16)}`;
      for (const w of doc.splitTextToSize(line, pageW - 2 * margin)) {
        if (y > 275) {
          doc.addPage();
          y = 20;
        }
        doc.text(w, margin, y);
        y += 4.5;
      }
    }
  }
  y += 6;

  doc.setFont(fam, hasKrFont ? "normal" : "bold");
  doc.setFontSize(11);
  doc.text("송출 증빙 이미지 URL", margin, y);
  y += 7;
  doc.setFont(fam, "normal");
  doc.setFontSize(8);
  if (p.proofPhotos.length === 0) {
    doc.text("등록된 증빙 없음", margin, y);
    y += 5;
  } else {
    for (const ph of p.proofPhotos) {
      const cap = ph.caption ? ` — ${ph.caption}` : "";
      const line = `· ${ph.imageUrl}${cap}`;
      for (const w of doc.splitTextToSize(line, pageW - 2 * margin)) {
        if (y > 275) {
          doc.addPage();
          y = 20;
        }
        doc.text(w, margin, y);
        y += 4;
      }
    }
  }
  y += 6;

  if (p.aiPerformanceKo?.trim()) {
    writeHeading("성과 분석 (AI)");
    writeBody(p.aiPerformanceKo);
  }

  doc.setFont(fam, hasKrFont ? "normal" : "bold");
  doc.setFontSize(11);
  doc.text("견적·계약·청구 요약", margin, y);
  y += 7;
  doc.setFont(fam, "normal");
  doc.setFontSize(9);
  if (p.financialDocs.length === 0) {
    doc.text("등록된 문서 없음", margin, y);
    y += 5;
  } else {
    for (const d of p.financialDocs) {
      const amt =
        d.amountKrw != null ? ` ${d.amountKrw.toLocaleString("ko-KR")}원` : "";
      const line = `· [${d.kind}] ${d.title} · ${d.status}${amt}`;
      for (const w of doc.splitTextToSize(line, pageW - 2 * margin)) {
        if (y > 275) {
          doc.addPage();
          y = 20;
        }
        doc.text(w, margin, y);
        y += 4.5;
      }
    }
  }

  if (p.aiInsightsKo?.trim()) {
    writeHeading("AI 인사이트 · 다음 캠페인 제안");
    writeBody(p.aiInsightsKo);
  }

  y += 10;
  if (y > 260) {
    doc.addPage();
    y = 20;
  }
  doc.setFontSize(8);
  doc.setTextColor(100, 100, 100);
  doc.text(
    "※ 본 보고서는 관리 시스템 데이터 및 AI 초안을 기준으로 생성되었습니다. 수치·표현은 최종 검증이 필요합니다.",
    margin,
    y,
  );

  return doc;
}

export async function campaignCompletionPdfToBuffer(
  p: BuildCampaignCompletionPdfParams,
): Promise<Buffer> {
  const doc = await createCampaignCompletionPdfDoc(p);
  const out = doc.output("arraybuffer") as ArrayBuffer;
  return Buffer.from(out);
}
