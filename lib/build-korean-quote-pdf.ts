import { registerNotoSansKrIfAvailable } from "@/lib/jspdf-register-noto-kr";
import { krFontFamily } from "@/lib/jspdf-kr-font-constants";

const NAVY = [13, 27, 46] as const;
const GOLD = [200, 145, 60] as const;
const GRAY_50 = [248, 249, 251] as const;
const GRAY_200 = [228, 230, 236] as const;
const GRAY_500 = [107, 114, 128] as const;
const GRAY_900 = [17, 24, 39] as const;

type KoreanQuoteRow = {
  name: string;
  location: string;
  type: string;
  price: number;
  pricePeriod: string;
  visibilityScore?: number;
};

export type BuildKoreanQuoteParams = {
  quoteId: string;
  createdAt: Date;
  clientName: string;
  clientEmail: string;
  clientCompany: string | null;
  period: string;
  startDate: Date | null;
  endDate: Date | null;
  budgetMin: number | null;
  budgetMax: number | null;
  totalAmount: number;
  rows: KoreanQuoteRow[];
};

function formatKRW(v: number): string {
  return `₩${new Intl.NumberFormat("ko-KR").format(v)}`;
}

function formatDate(d: Date | null): string {
  if (!d) return "-";
  return d.toLocaleDateString("ko-KR");
}

function periodLabel(key: string): string {
  if (key === "month") return "월";
  if (key === "biweekly") return "2주";
  if (key === "week") return "주";
  if (key === "day") return "일";
  return key;
}

export async function buildKoreanQuotePdf(
  p: BuildKoreanQuoteParams,
): Promise<Uint8Array> {
  const { default: JsPDF } = await import("jspdf");
  const doc = new JsPDF({ unit: "mm", format: "a4" });

  const hasKoreanFont = registerNotoSansKrIfAvailable(doc);
  const FONT = krFontFamily(hasKoreanFont);

  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const M = 15;

  // ─ 헤더 배너 (navy) ─
  doc.setFillColor(NAVY[0], NAVY[1], NAVY[2]);
  doc.rect(0, 0, pageW, 38, "F");

  doc.setFillColor(GOLD[0], GOLD[1], GOLD[2]);
  doc.rect(0, 38, pageW, 2, "F");

  doc.setTextColor(GOLD[0], GOLD[1], GOLD[2]);
  doc.setFont(FONT, "normal");
  doc.setFontSize(9);
  doc.text("THINKAD", M, 14);

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(20);
  doc.text("견적서", M, 26);

  doc.setFontSize(8);
  doc.setTextColor(200, 200, 210);
  const rightX = pageW - M;
  doc.text(`No. ${p.quoteId.slice(-8).toUpperCase()}`, rightX, 14, {
    align: "right",
  });
  doc.text(`발행일 ${formatDate(p.createdAt)}`, rightX, 20, { align: "right" });

  // ─ 수신자 블록 ─
  let y = 52;
  doc.setTextColor(GRAY_500[0], GRAY_500[1], GRAY_500[2]);
  doc.setFontSize(8);
  doc.text("수신", M, y);

  doc.setTextColor(GRAY_900[0], GRAY_900[1], GRAY_900[2]);
  doc.setFontSize(13);
  const companyLine = p.clientCompany ?? p.clientName;
  doc.text(`${companyLine}  귀중`, M, y + 7);

  doc.setFontSize(9);
  doc.setTextColor(GRAY_500[0], GRAY_500[1], GRAY_500[2]);
  doc.text(
    `담당: ${p.clientName}   |   이메일: ${p.clientEmail}`,
    M,
    y + 13,
  );

  // 발행자
  const rightBlockX = pageW / 2 + 5;
  doc.setFontSize(8);
  doc.text("발행", rightBlockX, y);
  doc.setFontSize(11);
  doc.setTextColor(GRAY_900[0], GRAY_900[1], GRAY_900[2]);
  doc.text("THINKAD (싱커드)", rightBlockX, y + 7);
  doc.setFontSize(8);
  doc.setTextColor(GRAY_500[0], GRAY_500[1], GRAY_500[2]);
  doc.text("mannote@tkad.co.kr  |  02-515-2772", rightBlockX, y + 13);

  y += 22;
  doc.setDrawColor(GRAY_200[0], GRAY_200[1], GRAY_200[2]);
  doc.setLineWidth(0.3);
  doc.line(M, y, pageW - M, y);

  // ─ 캠페인 요약 4칼럼 ─
  y += 8;
  const cols = [
    {
      label: "총 금액",
      value: formatKRW(p.totalAmount),
      accent: true,
    },
    {
      label: "매체 수",
      value: `${p.rows.length}개`,
    },
    {
      label: "집행 기간",
      value: p.period,
    },
    {
      label: "일정",
      value:
        p.startDate && p.endDate
          ? `${formatDate(p.startDate)} ~\n${formatDate(p.endDate)}`
          : "협의",
    },
  ];
  const colW = (pageW - M * 2) / cols.length;
  cols.forEach((c, i) => {
    const x = M + colW * i;
    doc.setFontSize(7);
    doc.setTextColor(GRAY_500[0], GRAY_500[1], GRAY_500[2]);
    doc.text(c.label, x, y);
    if (c.accent) {
      doc.setTextColor(NAVY[0], NAVY[1], NAVY[2]);
      doc.setFontSize(13);
    } else {
      doc.setTextColor(GRAY_900[0], GRAY_900[1], GRAY_900[2]);
      doc.setFontSize(10);
    }
    const lines = c.value.split("\n");
    lines.forEach((line, li) => {
      doc.text(line, x, y + 6 + li * 5);
    });
  });

  y += 18;

  // ─ 매체 테이블 ─
  y += 4;
  doc.setFontSize(10);
  doc.setTextColor(NAVY[0], NAVY[1], NAVY[2]);
  doc.text("▎매체 구성", M, y);
  y += 5;

  // 헤더
  doc.setFillColor(NAVY[0], NAVY[1], NAVY[2]);
  doc.rect(M, y, pageW - M * 2, 7, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(8);
  const colX = {
    no: M + 2,
    name: M + 10,
    loc: M + 70,
    type: M + 120,
    price: pageW - M - 2,
  };
  doc.text("No.", colX.no, y + 5);
  doc.text("매체명", colX.name, y + 5);
  doc.text("위치", colX.loc, y + 5);
  doc.text("유형", colX.type, y + 5);
  doc.text("금액", colX.price, y + 5, { align: "right" });
  y += 7;

  p.rows.forEach((row, idx) => {
    const rowH = 8;
    if (idx % 2 === 0) {
      doc.setFillColor(GRAY_50[0], GRAY_50[1], GRAY_50[2]);
      doc.rect(M, y, pageW - M * 2, rowH, "F");
    }
    doc.setTextColor(GRAY_900[0], GRAY_900[1], GRAY_900[2]);
    doc.setFontSize(8.5);
    doc.text(String(idx + 1).padStart(2, "0"), colX.no, y + 5.5);

    const truncName = row.name.length > 28 ? row.name.slice(0, 27) + "…" : row.name;
    doc.text(truncName, colX.name, y + 5.5);

    doc.setFontSize(7.5);
    doc.setTextColor(GRAY_500[0], GRAY_500[1], GRAY_500[2]);
    const truncLoc = row.location.length > 26 ? row.location.slice(0, 25) + "…" : row.location;
    doc.text(truncLoc, colX.loc, y + 5.5);

    doc.text(row.type, colX.type, y + 5.5);

    doc.setFontSize(9);
    doc.setTextColor(NAVY[0], NAVY[1], NAVY[2]);
    doc.text(formatKRW(row.price), colX.price, y + 5.5, { align: "right" });

    // 검증 배지 (초록 점)
    if ((row.visibilityScore ?? 0) >= 4) {
      doc.setFillColor(GOLD[0], GOLD[1], GOLD[2]);
      doc.circle(colX.name - 4, y + 4, 0.9, "F");
    }

    y += rowH;
    if (y > pageH - 50) {
      doc.addPage();
      y = M;
    }
  });

  // ─ 합계 라인 ─
  y += 2;
  doc.setDrawColor(NAVY[0], NAVY[1], NAVY[2]);
  doc.setLineWidth(0.5);
  doc.line(M, y, pageW - M, y);
  y += 7;
  doc.setFontSize(9);
  doc.setTextColor(GRAY_500[0], GRAY_500[1], GRAY_500[2]);
  doc.text("합계 (VAT 별도)", pageW - M - 55, y, { align: "right" });
  doc.setFontSize(14);
  doc.setTextColor(NAVY[0], NAVY[1], NAVY[2]);
  doc.text(formatKRW(p.totalAmount), pageW - M, y, { align: "right" });
  y += 10;

  // ─ 안내 박스 ─
  if (y < pageH - 35) {
    doc.setFillColor(GRAY_50[0], GRAY_50[1], GRAY_50[2]);
    doc.roundedRect(M, y, pageW - M * 2, 22, 1.5, 1.5, "F");
    doc.setFontSize(8);
    doc.setTextColor(GRAY_500[0], GRAY_500[1], GRAY_500[2]);
    doc.text("본 견적은 THINKAD 매체 검증 기준에 따라 산출되었습니다.", M + 4, y + 6);
    doc.text("● 현장 4단계 검증: 입지 · 가시성 · 조도 · 경쟁매체", M + 4, y + 11);
    doc.text("● 유효 기간: 발행일로부터 30일", M + 4, y + 16);
    doc.text("● 문의: mannote@tkad.co.kr / 02-515-2772", M + 4, y + 21);
  }

  // ─ 푸터 ─
  doc.setFillColor(NAVY[0], NAVY[1], NAVY[2]);
  doc.rect(0, pageH - 12, pageW, 12, "F");
  doc.setFontSize(7.5);
  doc.setTextColor(180, 180, 195);
  doc.text("THINKAD · 주식회사 싱커드 · 서울 성동구 뚝섬로17가길 48  1102", M, pageH - 5);
  doc.setTextColor(GOLD[0], GOLD[1], GOLD[2]);
  doc.text("thinkad.kr", pageW - M, pageH - 5, { align: "right" });

  const ab = doc.output("arraybuffer");
  return new Uint8Array(ab);
}
