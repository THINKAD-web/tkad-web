"use client";

import { forwardRef, useMemo, type CSSProperties } from "react";
import { useLocale } from "next-intl";
import { Check, Mail, Phone } from "lucide-react";
import { CONTACT_EMAIL } from "@/lib/constants";
import {
  computeQuotePremiumMetrics,
  formatCompactMetric,
  formatKrw,
  type QuotePremiumMediaInput,
} from "@/lib/quote-premium-metrics";

const STAMP_URL =
  "https://tkad-cdn.b-cdn.net/tkad/admin/2026/05/%5B%EC%8B%B1%EC%BB%A4%EB%93%9C%5D%20%EB%8F%84%EC%9E%A5.png";

const STAMP_CAPTURE_SRC = `/api/image-proxy?url=${encodeURIComponent(STAMP_URL)}`;

export type QuotePremiumProps = {
  /** BILL TO 회사명 */
  customerName: string;
  contactName?: string;
  contactPhone?: string;
  contactEmail?: string;
  region?: string;
  goal?: string;
  quoteNumber?: string;
  brandName: string;
  version?: string;
  dateLabel: string;
  durationLabel: string;
  periodKey: string;
  periodMonths: number;
  mediaItems: QuotePremiumMediaInput[];
  subtotalWon: number;
  vatWon?: number;
  grandTotalWon?: number;
  issuedAt?: Date;
};

type ThemeTokens = {
  pageBg: string;
  pageBorder: string;
  topBar: string;
  card: CSSProperties;
  sectionTitle: string;
  label: string;
  value: string;
  durationValue: string;
  bodyMuted: string;
  tableHead: string;
  tableCell: string;
  tableCellMuted: string;
  tableBorder: string;
  whyTitle: string;
  whySub: string;
  contactMuted: string;
  footer: string;
  emptyChip: string;
};

/** Page 1 제안서 — 항상 다크 대시보드 (사이트 헤더 다크모드와 별개) */
const PROPOSAL_TOKENS: ThemeTokens = {
  pageBg: "#0a0a14",
  pageBorder: "#22222e",
  topBar: "#555555",
  card: {
    background: "rgba(255,255,255,0.035)",
    border: "1px solid rgba(255,255,255,0.08)",
    borderRadius: 12,
    padding: 18,
    backdropFilter: "blur(8px)",
    WebkitBackdropFilter: "blur(8px)",
  },
  sectionTitle: "#c4b5fd",
  label: "rgba(255,255,255,0.45)",
  value: "#ffffff",
  durationValue: "#a78bfa",
  bodyMuted: "rgba(255,255,255,0.45)",
  tableHead: "rgba(255,255,255,0.45)",
  tableCell: "rgba(255,255,255,0.9)",
  tableCellMuted: "rgba(255,255,255,0.7)",
  tableBorder: "rgba(255,255,255,0.06)",
  whyTitle: "rgba(255,255,255,0.9)",
  whySub: "rgba(255,255,255,0.45)",
  contactMuted: "rgba(255,255,255,0.65)",
  footer: "rgba(255,255,255,0.25)",
  emptyChip: "rgba(255,255,255,0.4)",
};

function RoiChart() {
  const fillId = "quote-premium-roi-fill";
  const lineId = "quote-premium-roi-line";
  return (
    <svg
      viewBox="0 0 240 88"
      className="h-full w-full"
      aria-hidden
      preserveAspectRatio="none"
    >
      <defs>
        <linearGradient id={fillId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="rgba(124,58,237,0.55)" />
          <stop offset="100%" stopColor="rgba(6,182,212,0.05)" />
        </linearGradient>
        <linearGradient id={lineId} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#7c3aed" />
          <stop offset="100%" stopColor="#22d3ee" />
        </linearGradient>
      </defs>
      <path
        d="M8 72 L48 58 L92 52 L136 38 L184 22 L232 8 L232 80 L8 80 Z"
        fill={`url(#${fillId})`}
      />
      <path
        d="M8 72 L48 58 L92 52 L136 38 L184 22 L232 8"
        fill="none"
        stroke={`url(#${lineId})`}
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function ThinkadLogo() {
  return (
    <div className="flex items-center gap-2.5">
      <span
        className="flex h-9 w-9 items-center justify-center rounded-lg text-sm font-black text-white"
        style={{
          background: "linear-gradient(135deg, #7c3aed 0%, #22d3ee 100%)",
        }}
      >
        T
      </span>
      <span
        className="text-lg font-extrabold tracking-tight text-white"
        style={{
          fontFamily: "var(--font-space-grotesk), Pretendard, sans-serif",
        }}
      >
        THINKAD
      </span>
    </div>
  );
}

function formatManWon(won: number, isKo: boolean): string {
  const man = Math.round(won / 10_000);
  const num = man.toLocaleString(isKo ? "ko-KR" : "en-US");
  if (isKo) return `₩${num}만원`;
  return `₩${num} (10K KRW)`;
}

function formatIssuedDateDots(date: Date, isKo: boolean): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return isKo ? `${y}.${m}.${d}` : `${y}-${m}-${d}`;
}

function buildDefaultQuoteNumber(date: Date): string {
  const ymd = [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, "0"),
    String(date.getDate()).padStart(2, "0"),
  ].join("");
  const tail = String(date.getTime() % 100000).padStart(5, "0");
  return `QT-${ymd}-${tail}`;
}

function resolveDisplayDuration(
  durationLabel: string,
  periodKey: string,
  periodMonths: number,
  isKo: boolean,
): string {
  const trimmed = durationLabel.trim();
  if (trimmed) return trimmed;
  if (periodKey === "2weeks") return isKo ? "2주" : "2 weeks";
  if (periodMonths > 0) {
    return isKo ? `${periodMonths}개월` : `${periodMonths} mo`;
  }
  return isKo ? "—" : "—";
}

type OfficialPageProps = Pick<
  QuotePremiumProps,
  | "customerName"
  | "contactName"
  | "contactPhone"
  | "contactEmail"
  | "region"
  | "goal"
  | "quoteNumber"
  | "durationLabel"
  | "periodKey"
  | "periodMonths"
  | "mediaItems"
  | "subtotalWon"
  | "vatWon"
  | "grandTotalWon"
  | "issuedAt"
>;

function QuotePremiumOfficialPage({
  customerName,
  contactName,
  contactPhone,
  contactEmail,
  region,
  goal,
  quoteNumber,
  durationLabel,
  periodKey,
  periodMonths,
  mediaItems,
  subtotalWon,
  vatWon: vatWonProp,
  grandTotalWon: grandTotalWonProp,
  issuedAt,
}: OfficialPageProps) {
  const locale = useLocale();
  const isKo = locale.startsWith("ko");
  const issued = issuedAt ?? new Date();
  const vatWon = vatWonProp ?? Math.round(subtotalWon * 0.1);
  const grandTotalWon = grandTotalWonProp ?? subtotalWon + vatWon;
  const quoteNo = quoteNumber?.trim() || buildDefaultQuoteNumber(issued);
  const issuedDots = formatIssuedDateDots(issued, isKo);
  const displayDuration = resolveDisplayDuration(
    durationLabel,
    periodKey,
    periodMonths,
    isKo,
  );

  const copy = isKo
    ? {
        docTitle: "견적서",
        billTo: "BILL TO",
        campaign: "CAMPAIGN",
        duration: "광고 기간",
        region: "집행 지역",
        goal: "캠페인 목표",
        unitNote: "금액 단위: 만원 (₩10,000)",
        barDuration: "광고 기간",
        barMedia: "매체 수",
        barValidity: "유효기간",
        validityDays: "14일",
        colNo: "#",
        colMedia: "매체명",
        colLocation: "위치",
        colSpec: "규격",
        colPeriod: "기간",
        colUnit: "단가",
        colSub: "소계",
        supply: "공급가액",
        vat: "부가세(10%)",
        total: "합계 (VAT포함)",
        signTitle: "담당자 확인",
        signName: "성명",
        signSig: "서명",
        signDate: "날짜",
        issuer: "발행사 ㈜ 싱커드",
        issuerName: "회사명: ㈜ 싱커드 · THINKAD",
        footer: "// 본 견적서는 발행일로부터 14일간 유효합니다",
      }
    : {
        docTitle: "QUOTE",
        billTo: "BILL TO",
        campaign: "CAMPAIGN",
        duration: "Flight",
        region: "Region",
        goal: "Objective",
        unitNote: "Amounts in 10K KRW (₩10,000)",
        barDuration: "Duration",
        barMedia: "Media",
        barValidity: "Valid for",
        validityDays: "14 days",
        colNo: "#",
        colMedia: "Media",
        colLocation: "Location",
        colSpec: "Spec",
        colPeriod: "Period",
        colUnit: "Unit",
        colSub: "Subtotal",
        supply: "Subtotal",
        vat: "VAT (10%)",
        total: "Total (incl. VAT)",
        signTitle: "Authorized by",
        signName: "Name",
        signSig: "Signature",
        signDate: "Date",
        issuer: "Issuer THINKAD Inc.",
        issuerName: "㈜ 싱커드 · THINKAD",
        footer: "// Valid for 14 days from issue date",
      };

  return (
    <div
      id="quote-premium-official"
      data-quote-premium-page="2"
      data-quote-pdf-background="#ffffff"
      className="quote-premium-official relative box-border overflow-hidden antialiased"
      style={{
        width: 794,
        minHeight: 1123,
        background: "#ffffff",
        color: "#111827",
        fontFamily: "var(--font-pretendard), Pretendard, system-ui, sans-serif",
        WebkitPrintColorAdjust: "exact",
        printColorAdjust: "exact",
      }}
    >
      <style>{`
        #quote-premium-official, #quote-premium-official * {
          -webkit-print-color-adjust: exact !important;
          print-color-adjust: exact !important;
        }
        @media print {
          #quote-premium-official {
            background: #ffffff !important;
          }
        }
      `}</style>

      <div
        aria-hidden
        className="absolute bottom-0 left-0 top-0 w-[5px]"
        style={{
          background: "linear-gradient(180deg, #7C3AED 0%, #06B6D4 100%)",
        }}
      />

      <div className="relative px-8 pb-8 pt-7 pl-10">
        <header className="flex items-start justify-between gap-4">
          <div>
            <p
              className="text-[18px] font-bold tracking-tight"
              style={{ color: "#111111" }}
            >
              THINKAD
            </p>
            <p className="mt-0.5 text-[11px]" style={{ color: "#6B7280" }}>
              {isKo ? "싱커드 · 광고 견적서" : "THINKAD · Advertising Quote"}
            </p>
          </div>
          <div className="text-right">
            <p
              className="text-[42px] font-bold leading-none"
              style={{ color: "#F3F4F6" }}
            >
              {copy.docTitle}
            </p>
            <p className="mt-2 text-[11px]" style={{ color: "#6B7280" }}>
              {isKo ? "견적번호" : "Quote No."}: #{quoteNo}
            </p>
            <p className="text-[11px]" style={{ color: "#6B7280" }}>
              {isKo ? "발행일" : "Issued"}: {issuedDots}
            </p>
          </div>
        </header>

        <div className="mt-5 h-px w-full" style={{ background: "#F3F4F6" }} />

        <section className="mt-6 grid grid-cols-2 gap-8">
          <div>
            <p
              className="text-[9px] font-bold tracking-[0.2em]"
              style={{ color: "#7C3AED" }}
            >
              {copy.billTo}
            </p>
            <p className="mt-2 text-[15px] font-bold text-[#111827]">
              {customerName.trim() || "—"}
            </p>
            {contactName?.trim() ? (
              <p className="mt-1 text-[12px] text-[#6B7280]">
                {isKo ? "담당자" : "Contact"}: {contactName.trim()}
              </p>
            ) : null}
            {contactPhone?.trim() ? (
              <p className="text-[12px] text-[#6B7280]">
                {isKo ? "연락처" : "Tel"}: {contactPhone.trim()}
              </p>
            ) : null}
            {contactEmail?.trim() ? (
              <p className="text-[12px] text-[#6B7280]">
                {isKo ? "이메일" : "Email"}: {contactEmail.trim()}
              </p>
            ) : null}
          </div>
          <div>
            <p
              className="text-[9px] font-bold tracking-[0.2em]"
              style={{ color: "#06B6D4" }}
            >
              {copy.campaign}
            </p>
            <dl className="mt-2 space-y-1 text-[12px] text-[#374151]">
              <div className="flex gap-2">
                <dt className="w-20 shrink-0 text-[#6B7280]">{copy.duration}</dt>
                <dd className="font-medium">{displayDuration}</dd>
              </div>
              <div className="flex gap-2">
                <dt className="w-20 shrink-0 text-[#6B7280]">{copy.region}</dt>
                <dd className="font-medium">{region?.trim() || "—"}</dd>
              </div>
              <div className="flex gap-2">
                <dt className="w-20 shrink-0 text-[#6B7280]">{copy.goal}</dt>
                <dd className="font-medium">{goal?.trim() || "—"}</dd>
              </div>
              <div className="flex gap-2">
                <dt className="w-20 shrink-0 text-[#6B7280]">
                  {isKo ? "금액 단위" : "Unit"}
                </dt>
                <dd className="font-medium">{copy.unitNote}</dd>
              </div>
            </dl>
          </div>
        </section>

        <div
          className="mt-6 grid grid-cols-3 gap-4 rounded-lg px-4 py-3 text-center text-[12px]"
          style={{ background: "#F9FAFB" }}
        >
          <div>
            <p className="text-[10px] text-[#9CA3AF]">{copy.barDuration}</p>
            <p className="mt-1 font-bold text-[#111827]">{displayDuration}</p>
          </div>
          <div>
            <p className="text-[10px] text-[#9CA3AF]">{copy.barMedia}</p>
            <p className="mt-1 font-bold text-[#111827]">
              {mediaItems.length}
              {isKo ? "개" : ""}
            </p>
          </div>
          <div>
            <p className="text-[10px] text-[#9CA3AF]">{copy.barValidity}</p>
            <p className="mt-1 font-bold text-[#111827]">{copy.validityDays}</p>
          </div>
        </div>

        <section className="mt-8">
          <table className="w-full border-collapse text-left">
            <thead>
              <tr
                style={{
                  borderBottom: "2px solid #7C3AED",
                  color: "#9CA3AF",
                  fontSize: 9,
                  letterSpacing: "0.08em",
                  textTransform: "uppercase",
                }}
              >
                <th className="pb-2 pr-2 font-medium">{copy.colNo}</th>
                <th className="pb-2 pr-2 font-medium">{copy.colMedia}</th>
                <th className="pb-2 pr-2 font-medium">{copy.colLocation}</th>
                <th className="pb-2 pr-2 font-medium">{copy.colSpec}</th>
                <th className="pb-2 pr-2 font-medium">{copy.colPeriod}</th>
                <th className="pb-2 pr-2 text-right font-medium">
                  {copy.colUnit}
                </th>
                <th className="pb-2 text-right font-medium">{copy.colSub}</th>
              </tr>
            </thead>
            <tbody>
              {mediaItems.map((row, idx) => {
                const unitWon =
                  row.unitPriceWon && row.unitPriceWon > 0
                    ? row.unitPriceWon
                    : row.lineTotalWon;
                const periodCell =
                  row.executionPeriodLabel?.trim() || displayDuration;
                const specParts = [
                  row.mediaTypeLabel,
                  row.size,
                ].filter(Boolean);
                return (
                  <tr
                    key={row.id}
                    style={{ borderBottom: "1px solid #F3F4F6" }}
                  >
                    <td className="py-3 pr-2 align-top text-[11px] text-[#6B7280]">
                      {idx + 1}
                    </td>
                    <td className="py-3 pr-2 align-top">
                      <div className="flex gap-2">
                        <div
                          className="h-10 w-10 shrink-0 overflow-hidden rounded-lg"
                          style={{ background: "#F3F4F6" }}
                        >
                          {row.thumbUrl ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={row.thumbUrl}
                              alt=""
                              className="h-full w-full object-cover"
                              loading="eager"
                              decoding="sync"
                              referrerPolicy="no-referrer"
                            />
                          ) : null}
                        </div>
                        <div className="min-w-0">
                          <p className="text-[13px] font-bold text-[#111827]">
                            {row.name}
                          </p>
                          {specParts.length > 0 ? (
                            <p className="mt-0.5 text-[11px] text-[#6B7280]">
                              {specParts.join(" · ")}
                            </p>
                          ) : null}
                        </div>
                      </div>
                    </td>
                    <td className="max-w-[88px] py-3 pr-2 align-top text-[11px] text-[#374151]">
                      {row.location}
                    </td>
                    <td className="py-3 pr-2 align-top text-[11px] text-[#374151]">
                      {row.size?.trim() || "—"}
                    </td>
                    <td className="py-3 pr-2 align-top text-[11px] text-[#374151]">
                      {periodCell}
                    </td>
                    <td className="py-3 pr-2 align-top text-right text-[11px] tabular-nums text-[#374151]">
                      {formatManWon(unitWon, isKo)}
                    </td>
                    <td
                      className="py-3 align-top text-right text-[12px] font-bold tabular-nums"
                      style={{ color: "#7C3AED" }}
                    >
                      {formatManWon(row.lineTotalWon, isKo)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </section>

        <section className="mt-8 flex justify-end">
          <div className="w-full max-w-[300px] space-y-2 text-[12px]">
            <div className="flex justify-between gap-4 text-[#6B7280]">
              <span>{copy.supply}</span>
              <span className="tabular-nums">
                {formatManWon(subtotalWon, isKo)}
              </span>
            </div>
            <div className="flex justify-between gap-4 text-[#6B7280]">
              <span>{copy.vat}</span>
              <span className="tabular-nums">{formatManWon(vatWon, isKo)}</span>
            </div>
            <div
              className="flex items-center justify-between gap-4 rounded-lg px-5 py-3.5 text-[16px] font-bold text-white"
              style={{
                background:
                  "linear-gradient(135deg, #7C3AED 0%, #06B6D4 100%)",
              }}
            >
              <span>{copy.total}</span>
              <span className="tabular-nums">
                {formatManWon(grandTotalWon, isKo)}
              </span>
            </div>
          </div>
        </section>

        <section className="mt-10 grid grid-cols-2 gap-8">
          <div>
            <p
              className="text-[9px] font-bold tracking-[0.2em]"
              style={{ color: "#7C3AED" }}
            >
              {copy.signTitle}
            </p>
            <div className="mt-4 space-y-4 text-[11px] text-[#6B7280]">
              {[copy.signName, copy.signSig, copy.signDate].map((label) => (
                <div key={label}>
                  <span>{label}</span>
                  <div
                    className="mt-2 h-8 border-b"
                    style={{ borderColor: "#E5E7EB" }}
                  />
                </div>
              ))}
            </div>
          </div>
          <div className="relative min-h-[140px] pr-20">
            <p
              className="text-[9px] font-bold tracking-[0.2em]"
              style={{ color: "#06B6D4" }}
            >
              {copy.issuer}
            </p>
            <p className="mt-2 text-[13px] font-bold text-[#111827]">
              {copy.issuerName}
            </p>
            <p className="mt-2 text-[11px] text-[#374151]">Tel: 02-515-2772</p>
            <p className="text-[11px] text-[#374151]">Email: sales@tkad.co.kr</p>
            <p className="mt-1 text-[11px] text-[#6B7280]">
              {isKo
                ? "주소: 서울 성동구 뚝섬로17가길 48"
                : "48, Ttukseom-ro 17ga-gil, Seongdong-gu, Seoul"}
            </p>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={STAMP_CAPTURE_SRC}
              alt=""
              loading="eager"
              decoding="sync"
              referrerPolicy="no-referrer"
              className="pointer-events-none absolute bottom-0 right-0 object-contain"
              style={{
                width: 72,
                height: 72,
                opacity: 0.85,
                transform: "rotate(-3deg)",
              }}
            />
          </div>
        </section>

        <footer
          className="mt-10 rounded-lg py-3 text-center text-[10px]"
          style={{ background: "#F9FAFB", color: "#6B7280" }}
        >
          {copy.footer}
        </footer>
      </div>
    </div>
  );
}

export const QuotePremium = forwardRef<HTMLDivElement, QuotePremiumProps>(
  function QuotePremium(
    {
      customerName,
      contactName,
      brandName,
      version = "v1.0",
      dateLabel,
      durationLabel,
      periodKey,
      periodMonths,
      mediaItems,
      subtotalWon,
      contactPhone,
      contactEmail,
      region,
      goal,
      quoteNumber,
      vatWon,
      grandTotalWon,
      issuedAt,
    },
    ref,
  ) {
    const locale = useLocale();
    const isKo = locale.startsWith("ko");
    const tokens = PROPOSAL_TOKENS;

    const metrics = useMemo(
      () =>
        computeQuotePremiumMetrics({
          mediaItems,
          periodKey,
          periodMonths,
          durationLabel,
          subtotalWon,
        }),
      [mediaItems, periodKey, periodMonths, durationLabel, subtotalWon],
    );

    const displayDuration = useMemo(
      () =>
        resolveDisplayDuration(
          metrics.durationLabel,
          periodKey,
          periodMonths,
          isKo,
        ),
      [metrics.durationLabel, periodKey, periodMonths, isKo],
    );

    const heroImage = mediaItems.find((m) => m.thumbUrl)?.thumbUrl ?? null;
    const displayBrand =
      brandName.trim() || customerName.trim() || (isKo ? "고객" : "Client");
    const campaignTitle = "2026 Seoul Premium DOOH Campaign";

    const copy = isKo
      ? {
          topTagline: "// 생각하는 광고회사, 싱커드",
          clientMeta: `고객: ${displayBrand} · ${dateLabel} · ${version}`,
          heroEn: "Advertising Proposal",
          heroKo: "광고 제안서",
          clientLine: `고객: ${displayBrand}`,
          overview: "캠페인 개요",
          reach: "도달",
          impression: "노출",
          duration: "기간",
          mediaList: "선정 매체",
          exposure: "예상 노출·비용",
          mediaCol: "매체",
          imprCol: "노출",
          costCol: "비용",
          roi: "ROI 예측",
          roiNote: "OOH+디지털 시너지 기반 상향 곡선 (추정)",
          why: "싱커드를 선택하는 이유",
          whyItems: [
            {
              title: "검증된 매체 데이터",
              sub: "현장 검증 500+ 매체",
            },
            {
              title: "AI 기반 최적 매체 믹스",
              sub: "예산 대비 효율 극대화",
            },
            {
              title: "원스톱 집행 관리",
              sub: "견적부터 집행·인증까지",
            },
          ],
          contact: "문의",
          cta: "계약 문의하기",
        }
      : {
          topTagline: "// THINKAD — thinking ad company",
          clientMeta: `Client: ${displayBrand} · ${dateLabel} · ${version}`,
          heroEn: "Advertising Proposal",
          heroKo: "Advertising Proposal",
          clientLine: `Client: ${displayBrand}`,
          overview: "Campaign Overview",
          reach: "Reach",
          impression: "Impression",
          duration: "Duration",
          mediaList: "Media List",
          exposure: "Exposure & Cost",
          mediaCol: "Media",
          imprCol: "Impr.",
          costCol: "Cost",
          roi: "ROI Projection",
          roiNote: "Estimated uplift with OOH + digital synergy",
          why: "Why THINKAD",
          whyItems: [
            {
              title: "Verified media data",
              sub: "500+ field-verified placements",
            },
            {
              title: "AI-optimized media mix",
              sub: "Maximize efficiency per budget",
            },
            {
              title: "One-stop operations",
              sub: "Quote through execution & proof",
            },
          ],
          contact: "Contact",
          cta: "Contact for Contract",
        };

    return (
      <div ref={ref} className="quote-premium-export-root flex w-[794px] max-w-full flex-col">
        <div
          id="quote-premium-proposal"
          data-quote-premium-page="1"
          data-quote-pdf-background={tokens.pageBg}
          className="quote-premium-proposal box-border overflow-hidden antialiased"
          style={{
            width: 794,
            minHeight: 1123,
            background: tokens.pageBg,
            border: `1px solid ${tokens.pageBorder}`,
            borderRadius: 16,
            color: tokens.value,
            fontFamily: "var(--font-pretendard), Pretendard, system-ui, sans-serif",
            WebkitPrintColorAdjust: "exact",
            printColorAdjust: "exact",
          }}
        >
          <style>{`
            #quote-premium-proposal, #quote-premium-proposal * {
              -webkit-print-color-adjust: exact !important;
              print-color-adjust: exact !important;
            }
          `}</style>

          <div
            className="flex items-center justify-between px-6 pt-5"
            style={{ fontSize: 11, color: tokens.topBar }}
          >
            <span>{copy.topTagline}</span>
            <span>{copy.clientMeta}</span>
          </div>

          <div
            className="relative mx-4 mt-3 overflow-hidden rounded-xl"
            style={{ height: 260 }}
          >
            <div
              className="absolute inset-0"
              style={{
                background: `
                radial-gradient(circle at 75% 40%, rgba(124,58,237,0.5), transparent 55%),
                linear-gradient(120deg, #120e26 0%, #1d1640 45%, #2a1f52 100%)
              `,
              }}
            />
            <div
              className="pointer-events-none absolute inset-0 opacity-[0.22]"
              style={{
                backgroundImage:
                  "linear-gradient(rgba(255,255,255,0.06) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.06) 1px, transparent 1px)",
                backgroundSize: "28px 28px",
              }}
            />
            {heroImage ? (
              <div
                className="absolute inset-y-0 right-0 w-[48%] opacity-35"
                style={{
                  backgroundImage: `url(${heroImage})`,
                  backgroundSize: "cover",
                  backgroundPosition: "center",
                  maskImage:
                    "linear-gradient(90deg, transparent, black 35%)",
                  WebkitMaskImage:
                    "linear-gradient(90deg, transparent, black 35%)",
                }}
              />
            ) : null}

            <div className="relative z-[1] flex h-full items-stretch justify-between px-6 py-6">
              <div className="flex max-w-[52%] flex-col justify-between">
                <div>
                  <ThinkadLogo />
                  <p
                    className="mt-4 text-[11px] font-semibold uppercase tracking-[0.28em] text-white/55"
                    style={{
                      fontFamily:
                        "var(--font-space-grotesk), var(--font-pretendard), sans-serif",
                    }}
                  >
                    {copy.heroEn}
                  </p>
                  <h1
                    className="mt-1 text-white"
                    style={{
                      fontSize: 46,
                      fontWeight: 800,
                      lineHeight: 1.05,
                      fontFamily:
                        "var(--font-pretendard), Pretendard, sans-serif",
                    }}
                  >
                    {copy.heroKo}
                  </h1>
                </div>
                <p className="text-sm font-semibold text-white/75">
                  {copy.clientLine}
                </p>
              </div>

              <div className="flex items-center pr-2">
                <p
                  className="max-w-[240px] text-right text-[22px] font-bold italic leading-tight text-white"
                  style={{
                    transform: "rotate(-4deg) skewY(-3deg)",
                    textShadow:
                      "0 0 24px rgba(124,58,237,0.85), 0 0 48px rgba(34,211,238,0.35)",
                    fontFamily:
                      "var(--font-space-grotesk), var(--font-pretendard), sans-serif",
                  }}
                >
                  {campaignTitle}
                </p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3 p-4">
            <div style={tokens.card}>
              <h2
                className="text-xs font-bold tracking-[0.12em]"
                style={{ color: tokens.sectionTitle }}
              >
                {copy.overview}
              </h2>
              <dl className="mt-4 grid grid-cols-2 gap-3">
                {[
                  {
                    label: copy.reach,
                    value: formatCompactMetric(metrics.totalReach, locale),
                  },
                  {
                    label: copy.impression,
                    value: formatCompactMetric(
                      metrics.totalImpression,
                      locale,
                    ),
                  },
                  {
                    label: copy.duration,
                    value: displayDuration,
                    accent: true,
                  },
                  {
                    label: "CPM",
                    value: formatKrw(metrics.avgCpm, locale),
                  },
                ].map((item) => (
                  <div key={item.label}>
                    <dt
                      className="text-[10px] font-medium tracking-wider"
                      style={{ color: tokens.label }}
                    >
                      {item.label}
                    </dt>
                    <dd
                      className="mt-1 text-lg font-extrabold tabular-nums"
                      style={{
                        color: item.accent
                          ? tokens.durationValue
                          : tokens.value,
                      }}
                    >
                      {item.value}
                    </dd>
                  </div>
                ))}
              </dl>
            </div>

            <div style={tokens.card}>
              <h2
                className="text-xs font-bold tracking-[0.12em]"
                style={{ color: tokens.sectionTitle }}
              >
                {copy.mediaList}
              </h2>
              <div className="mt-3 flex max-h-[148px] flex-wrap gap-1.5 overflow-hidden">
                {mediaItems.map((m) => (
                  <span
                    key={m.id}
                    className="rounded-full px-2.5 py-1 text-[10px] font-semibold text-white"
                    style={{
                      background:
                        "linear-gradient(135deg, rgba(124,58,237,0.85) 0%, rgba(6,182,212,0.65) 100%)",
                      border: "1px solid rgba(255,255,255,0.12)",
                    }}
                  >
                    {m.name}
                  </span>
                ))}
              </div>
              {mediaItems.length === 0 ? (
                <p
                  className="mt-3 text-xs"
                  style={{ color: tokens.emptyChip }}
                >
                  —
                </p>
              ) : null}
            </div>

            <div style={tokens.card}>
              <h2
                className="text-xs font-bold tracking-[0.12em]"
                style={{ color: tokens.sectionTitle }}
              >
                {copy.exposure}
              </h2>
              <table className="mt-3 w-full text-left text-[10px]">
                <thead>
                  <tr style={{ color: tokens.tableHead }}>
                    <th className="pb-1 font-medium">{copy.mediaCol}</th>
                    <th className="pb-1 text-right font-medium">
                      {copy.imprCol}
                    </th>
                    <th className="pb-1 text-right font-medium">
                      {copy.costCol}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {metrics.mediaRows.slice(0, 6).map((row) => (
                    <tr
                      key={row.id}
                      style={{ borderTop: `1px solid ${tokens.tableBorder}` }}
                    >
                      <td
                        className="max-w-[90px] truncate py-1.5 pr-1 font-medium"
                        style={{ color: tokens.tableCell }}
                      >
                        {row.name}
                      </td>
                      <td
                        className="py-1.5 text-right tabular-nums"
                        style={{ color: tokens.tableCellMuted }}
                      >
                        {formatCompactMetric(row.impressions, locale)}
                      </td>
                      <td
                        className="py-1.5 text-right tabular-nums"
                        style={{ color: "#22d3ee" }}
                      >
                        {formatKrw(row.costWon, locale)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div style={tokens.card} className="flex flex-col">
              <h2
                className="text-xs font-bold tracking-[0.12em]"
                style={{ color: tokens.sectionTitle }}
              >
                {copy.roi}
              </h2>
              <div className="mt-2 min-h-[120px] flex-1">
                <RoiChart />
              </div>
              <p
                className="mt-2 text-[10px]"
                style={{ color: tokens.bodyMuted }}
              >
                {copy.roiNote}
              </p>
            </div>

            <div style={tokens.card}>
              <h2
                className="text-xs font-bold tracking-[0.12em]"
                style={{ color: tokens.sectionTitle }}
              >
                {copy.why}
              </h2>
              <ul className="mt-3 space-y-3">
                {copy.whyItems.map((item) => (
                  <li key={item.title} className="flex items-start gap-2">
                    <Check
                      className="mt-0.5 h-3.5 w-3.5 shrink-0 text-cyan-500"
                      aria-hidden
                    />
                    <div className="min-w-0">
                      <p
                        className="text-[11px] font-semibold leading-snug"
                        style={{ color: tokens.whyTitle }}
                      >
                        {item.title}
                      </p>
                      <p
                        className="mt-0.5 text-[10px] leading-snug"
                        style={{ color: tokens.whySub }}
                      >
                        {item.sub}
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
            </div>

            <div style={tokens.card} className="flex flex-col justify-between">
              <div>
                <h2
                  className="text-xs font-bold tracking-[0.12em]"
                  style={{ color: tokens.sectionTitle }}
                >
                  {copy.contact}
                </h2>
                <span
                  className="mt-4 inline-flex w-full items-center justify-center rounded-xl py-2.5 text-xs font-bold text-white"
                  style={{
                    background:
                      "linear-gradient(90deg, #7c3aed 0%, #22d3ee 100%)",
                  }}
                >
                  {copy.cta}
                </span>
                <div
                  className="mt-4 space-y-1.5 text-[11px]"
                  style={{ color: tokens.contactMuted }}
                >
                  {contactPhone?.trim() ? (
                    <p className="flex items-center gap-1.5">
                      <Phone className="h-3 w-3" aria-hidden />
                      {contactPhone.trim()}
                    </p>
                  ) : null}
                  <p className="flex items-center gap-1.5">
                    <Mail className="h-3 w-3" aria-hidden />
                    {contactEmail?.trim() || CONTACT_EMAIL}
                  </p>
                </div>
              </div>
              <p
                className="mt-3 text-center text-[9px] tracking-[0.2em]"
                style={{ color: tokens.footer }}
              >
                THINKAD · tkad.co.kr
              </p>
            </div>
          </div>
          <div
            className="quote-premium-page-break"
            style={{ pageBreakAfter: "always" }}
            aria-hidden
          />
        </div>

        <div
          className="mt-8 border-t-2 border-dashed border-white/25 print:hidden"
          role="separator"
          aria-hidden
        />

        <QuotePremiumOfficialPage
          customerName={customerName}
          contactName={contactName}
          contactPhone={contactPhone}
          contactEmail={contactEmail}
          region={region}
          goal={goal}
          quoteNumber={quoteNumber}
          durationLabel={durationLabel}
          periodKey={periodKey}
          periodMonths={periodMonths}
          mediaItems={mediaItems}
          subtotalWon={subtotalWon}
          vatWon={vatWon}
          grandTotalWon={grandTotalWon}
          issuedAt={issuedAt}
        />
      </div>
    );
  },
);

export default QuotePremium;
