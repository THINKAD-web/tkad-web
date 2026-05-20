import QRCode from "qrcode";
import { siteUrl } from "@/lib/seo";

export type SalesEmailTemplate = {
  subject: string;
  bodyHtml: string;
  bodyText: string;
};

export async function generateMediaQrDataUrl(
  mediaId: string,
  locale = "ko",
): Promise<string> {
  const url = `${siteUrl.replace(/\/$/, "")}/${locale}/media/${mediaId}`;
  return QRCode.toDataURL(url, {
    width: 320,
    margin: 2,
    color: { dark: "#000000", light: "#ffffff" },
  });
}

export function buildAdvertiserProposalEmail(opts: {
  mediaName: string;
  location: string;
  companyName: string;
  contactName: string;
  contactEmail: string;
  contactPhone?: string;
  highlights: string[];
}): SalesEmailTemplate {
  const bullets = opts.highlights.map((h) => `<li>${h}</li>`).join("");
  const subject = `[${opts.companyName}] ${opts.mediaName} 옥외광고 제안`;
  const bodyHtml = `
<p>안녕하세요, ${opts.companyName} ${opts.contactName}입니다.</p>
<p><strong>${opts.mediaName}</strong> (${opts.location}) 매체를 제안드립니다.</p>
<ul>${bullets}</ul>
<p>상세 스펙·성과 데이터는 첨부 PDF 또는 THINKAD 매체 상세에서 확인하실 수 있습니다.</p>
<p>문의: ${opts.contactEmail}${opts.contactPhone ? ` · ${opts.contactPhone}` : ""}</p>
<p>감사합니다.</p>`;
  const bodyText = [
    `안녕하세요, ${opts.companyName} ${opts.contactName}입니다.`,
    `${opts.mediaName} (${opts.location}) 매체 제안`,
    ...opts.highlights.map((h) => `- ${h}`),
    `문의: ${opts.contactEmail}`,
  ].join("\n");
  return { subject, bodyHtml, bodyText };
}

export function defaultProposalHighlights(media: {
  region: string;
  type: string;
  dailyFootfall?: number | null;
}): string[] {
  return [
    `${media.region} ${media.type} 매체`,
    media.dailyFootfall
      ? `일 유동 ${media.dailyFootfall.toLocaleString("ko-KR")}명 추정`
      : "THINKAD 데이터 기반 타깃·상권 분석 제공",
    "집행 전 AI 플래너로 예산·기간 시뮬레이션 가능",
  ];
}
