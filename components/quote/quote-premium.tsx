"use client";

import { forwardRef, useMemo, type CSSProperties } from "react";
import { useLocale } from "next-intl";
import { Check, Mail, Phone } from "lucide-react";
import { CONTACT_EMAIL } from "@/lib/constants";
import { MediaDetailCard } from "@/components/document/media-detail-card";
import {
  documentCardClass,
  DocumentGradientHero,
  DocumentSectionHeading,
} from "@/components/document/document-layout";
import type { DocumentMediaDetail } from "@/lib/document-media-detail";
import { formatDocumentManWon } from "@/lib/document-text";
import { cn } from "@/lib/utils";
import { formatQuoteValidUntilLabel } from "@/lib/admin-quote-calc";
import { useTrustMetrics } from "@/lib/use-trust-metrics";
import { MEDIA_COUNT_LABEL_FALLBACK } from "@/lib/media-count-copy";
import {
  computeQuotePremiumMetrics,
  formatCompactMetric,
  formatKrw,
  type QuotePremiumMediaInput,
} from "@/lib/quote-premium-metrics";
import {
  isQuoteCampaignPeriodKey,
  quoteCampaignDaysFromPeriodKey,
} from "@/lib/quote-wizard-pricing";
import { QuoteStampImage } from "@/components/quote/quote-stamp-image";

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
  /** 유효기간 — 없으면 14일 기본 문구 */
  validUntil?: Date | string;
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

/** Page 1 — 히어로만 다크 그라디언트, 본문 카드는 라이트 */
const PROPOSAL_TOKENS: ThemeTokens = {
  pageBg: "#F8F9FC",
  pageBorder: "#E5E7EB",
  topBar: "#6B7280",
  card: {
    background: "#FFFFFF",
    border: "1px solid #E5E7EB",
    borderRadius: 12,
    padding: 18,
    boxShadow: "0 1px 2px rgba(0,0,0,0.05)",
  },
  sectionTitle: "#ff6200",
  label: "#6B7280",
  value: "#111827",
  durationValue: "#ff6200",
  bodyMuted: "#6B7280",
  tableHead: "#9CA3AF",
  tableCell: "#111827",
  tableCellMuted: "#6B7280",
  tableBorder: "#F0F0F0",
  whyTitle: "#111827",
  whySub: "#6B7280",
  contactMuted: "#374151",
  footer: "#9CA3AF",
  emptyChip: "#9CA3AF",
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
          <stop offset="0%" stopColor="rgba(255,98,0,0.45)" />
          <stop offset="100%" stopColor="rgba(255,98,0,0.04)" />
        </linearGradient>
        <linearGradient id={lineId} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#ff6200" />
          <stop offset="100%" stopColor="#c24e00" />
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
          background: "linear-gradient(135deg, #ff6200 0%, #c24e00 100%)",
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
  return formatDocumentManWon(won, isKo);
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
  if (isQuoteCampaignPeriodKey(periodKey)) {
    const days = quoteCampaignDaysFromPeriodKey(periodKey);
    return isKo ? `${days}일` : `${days} days`;
  }
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
  | "validUntil"
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
  validUntil,
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
  const validityLabel = validUntil
    ? formatQuoteValidUntilLabel(validUntil, isKo)
    : isKo
      ? "발행일로부터 14일"
      : "14 days from issue";

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
        validityDays: validityLabel,
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
        footer: `// ${validityLabel}`,
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
        validityDays: validityLabel,
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
        footer: `// ${validityLabel}`,
      };

  const heroSubtitle = `${displayDuration} · ${isKo ? "견적번호" : "Quote"} #${quoteNo} · ${isKo ? "발행" : "Issued"} ${issuedDots}`;

  return (
    <div
      id="quote-premium-official"
      data-quote-premium-page="2"
      data-quote-pdf-background="#ffffff"
      className={cn(
        "quote-premium-official box-border w-full min-w-0 antialiased",
        documentCardClass,
        "max-w-[794px]",
      )}
      style={{
        minHeight: 1123,
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
      `}</style>

      <DocumentGradientHero
        badge="PREMIUM QUOTE"
        title={isKo ? "공식 견적서" : "Official Quote"}
        subtitle={heroSubtitle}
        topAccent="gold"
      />

      <div className="space-y-8 px-8 py-8">
        <section className="space-y-4">
          <DocumentSectionHeading>{copy.billTo}</DocumentSectionHeading>
          <dl className="grid grid-cols-2 gap-x-6 gap-y-4 rounded-xl border border-gray-200 bg-[#F8F9FC] p-4 sm:grid-cols-4">
            <div className="min-w-0 sm:col-span-2">
              <dt className="text-xs font-medium text-gray-500">
                {isKo ? "회사" : "Company"}
              </dt>
              <dd className="mt-0.5 text-sm font-semibold text-gray-900">
                {customerName.trim() || "—"}
              </dd>
            </div>
            <div className="min-w-0">
              <dt className="text-xs font-medium text-gray-500">
                {isKo ? "담당" : "Contact"}
              </dt>
              <dd className="mt-0.5 text-sm text-gray-900">
                {contactName?.trim() || "—"}
              </dd>
            </div>
            <div className="min-w-0">
              <dt className="text-xs font-medium text-gray-500">
                {isKo ? "연락처" : "Tel"}
              </dt>
              <dd className="mt-0.5 text-sm text-gray-900">
                {contactPhone?.trim() || "—"}
              </dd>
            </div>
            {contactEmail?.trim() ? (
              <div className="min-w-0 sm:col-span-2">
                <dt className="text-xs font-medium text-gray-500">
                  {isKo ? "이메일" : "Email"}
                </dt>
                <dd className="mt-0.5 break-all text-sm text-gray-900">
                  {contactEmail.trim()}
                </dd>
              </div>
            ) : null}
          </dl>
        </section>

        <section className="space-y-4">
          <DocumentSectionHeading>{copy.campaign}</DocumentSectionHeading>
          <dl className="grid grid-cols-2 gap-x-6 gap-y-4 rounded-xl border border-gray-200 bg-[#F8F9FC] p-4 sm:grid-cols-4">
            <div className="min-w-0">
              <dt className="text-xs font-medium text-gray-500">{copy.duration}</dt>
              <dd className="mt-0.5 text-sm font-semibold text-gray-900">
                {displayDuration}
              </dd>
            </div>
            <div className="min-w-0">
              <dt className="text-xs font-medium text-gray-500">{copy.region}</dt>
              <dd className="mt-0.5 text-sm text-gray-900">
                {region?.trim() || "—"}
              </dd>
            </div>
            <div className="min-w-0">
              <dt className="text-xs font-medium text-gray-500">{copy.goal}</dt>
              <dd className="mt-0.5 text-sm text-gray-900">{goal?.trim() || "—"}</dd>
            </div>
            <div className="min-w-0">
              <dt className="text-xs font-medium text-gray-500">
                {isKo ? "유효기간" : "Validity"}
              </dt>
              <dd className="mt-0.5 text-sm text-gray-900">{copy.validityDays}</dd>
            </div>
          </dl>
        </section>

        <section className="space-y-4">
          <DocumentSectionHeading>
            {isKo ? "매체 내역" : "Media lineup"}
          </DocumentSectionHeading>
          {mediaItems.length === 0 ? (
            <p className="rounded-xl border border-gray-200 bg-[#F8F9FC] px-4 py-8 text-center text-sm text-gray-500">
              —
            </p>
          ) : (
            <ul className="space-y-4">
              {mediaItems.map((row) => {
                const unitWon =
                  row.unitPriceWon && row.unitPriceWon > 0
                    ? row.unitPriceWon
                    : row.lineTotalWon;
                const detail: DocumentMediaDetail = {
                  id: row.id,
                  name: row.name,
                  location: row.location,
                  thumbUrl: row.thumbUrl,
                  categoryLabel: row.categoryLabel ?? row.mediaTypeLabel ?? undefined,
                  size: row.size ?? undefined,
                  operatingHours: row.operatingHours ?? undefined,
                  dailyTraffic: row.dailyFootTraffic ?? undefined,
                  broadcastLabel: row.broadcastLabel ?? undefined,
                  monthlyPriceLabel: formatManWon(unitWon, isKo),
                  lineTotalLabel: formatManWon(row.lineTotalWon, isKo),
                };
                return (
                  <li key={row.id}>
                    <MediaDetailCard detail={detail} isKo={isKo} compact />
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        <section className="space-y-4">
          <DocumentSectionHeading>{copy.total}</DocumentSectionHeading>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            <div className="rounded-xl border border-gray-200 bg-gray-50 p-3.5">
              <p className="text-[11px] font-medium text-gray-500">{copy.supply}</p>
              <p className="mt-1 font-display text-lg font-black tabular-nums text-[color:var(--qp-accent)]">
                {formatManWon(subtotalWon, isKo)}
              </p>
            </div>
            <div className="rounded-xl border border-gray-200 bg-gray-50 p-3.5">
              <p className="text-[11px] font-medium text-gray-500">{copy.vat}</p>
              <p className="mt-1 font-display text-lg font-black tabular-nums text-[color:var(--qp-accent)]">
                {formatManWon(vatWon, isKo)}
              </p>
            </div>
            <div className="col-span-2 rounded-xl border border-[color:var(--qp-accent)]/40 bg-[color:var(--qp-accent)] p-3.5 sm:col-span-1">
              <p className="text-[11px] font-medium text-white/85">{copy.total}</p>
              <p className="mt-1 font-display text-xl font-black tabular-nums text-white">
                {formatManWon(grandTotalWon, isKo)}
              </p>
            </div>
          </div>
        </section>

        <section className="grid grid-cols-2 gap-8 border-t border-gray-100 pt-8">
          <div>
            <p className="text-xs font-semibold text-[color:var(--qp-accent)]">{copy.signTitle}</p>
            <div className="mt-4 space-y-4 text-[11px] text-gray-500">
              {[copy.signName, copy.signSig, copy.signDate].map((label) => (
                <div key={label}>
                  <span>{label}</span>
                  <div className="mt-2 h-8 border-b border-gray-200" />
                </div>
              ))}
            </div>
          </div>
          <div className="relative min-h-[120px] pr-20">
            <p className="text-xs font-semibold text-[color:var(--qp-accent)]">{copy.issuer}</p>
            <p className="mt-2 text-sm font-bold text-gray-900">{copy.issuerName}</p>
            <p className="mt-2 text-[11px] text-gray-600">Tel: 02-515-2772</p>
            <p className="text-[11px] text-gray-600">Email: sales@tkad.co.kr</p>
            <p className="mt-1 text-[11px] text-gray-500">
              {isKo
                ? "주소: 서울 성동구 뚝섬로17가길 48"
                : "48, Ttukseom-ro 17ga-gil, Seongdong-gu, Seoul"}
            </p>
            <QuoteStampImage
              className="pointer-events-none absolute bottom-0 right-0 h-[72px] w-[72px] object-contain opacity-[0.85]"
              style={{ transform: "rotate(-3deg)" }}
            />
          </div>
        </section>

        <footer className="rounded-lg bg-[#F9FAFB] py-3 text-center text-[10px] text-gray-500">
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
      validUntil,
    },
    ref,
  ) {
    const locale = useLocale();
    const isKo = locale.startsWith("ko");
    const tokens = PROPOSAL_TOKENS;
    const trustMetrics = useTrustMetrics();
    const verifiedMediaLabel =
      trustMetrics?.verifiedMediaCount ?? MEDIA_COUNT_LABEL_FALLBACK;

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
          mediaList: "선정 매체 상세",
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
              sub: `현장 검증 ${verifiedMediaLabel} 매체`,
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
              sub: `${verifiedMediaLabel} field-verified placements`,
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
      <div ref={ref} className="quote-premium-export-root flex w-full min-w-0 max-w-[794px] flex-col">
        <div
          id="quote-premium-proposal"
          data-quote-premium-page="1"
          data-quote-pdf-background="#F8F9FC"
          className="quote-premium-proposal box-border w-full min-w-0 overflow-hidden antialiased"
          style={{
            minHeight: 1123,
            background: "#F8F9FC",
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
                radial-gradient(circle at 75% 40%, rgba(255,98,0,0.35), transparent 55%),
                linear-gradient(120deg, #121212 0%, #1a1a1a 45%, #242424 100%)
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
                      "0 0 20px rgba(255,98,0,0.45)",
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
                      className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[color:var(--qp-accent)]"
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

          <section className="space-y-3 px-4 pb-4">
            <h2
              className="text-xs font-bold tracking-[0.12em]"
              style={{ color: tokens.sectionTitle }}
            >
              {copy.mediaList}
            </h2>
            <ul className="space-y-3">
              {mediaItems.length === 0 ? (
                <p className="text-xs" style={{ color: tokens.emptyChip }}>
                  —
                </p>
              ) : (
                mediaItems.map((m) => {
                  const detail: DocumentMediaDetail = {
                    id: m.id,
                    name: m.name,
                    location: m.location,
                    thumbUrl: m.thumbUrl,
                    categoryLabel: m.categoryLabel ?? m.mediaTypeLabel ?? undefined,
                    size: m.size ?? undefined,
                    operatingHours: m.operatingHours ?? undefined,
                    dailyTraffic: m.dailyFootTraffic ?? undefined,
                    broadcastLabel: m.broadcastLabel ?? undefined,
                    monthlyPriceLabel: m.unitPriceWon
                      ? formatManWon(m.unitPriceWon, isKo)
                      : undefined,
                    lineTotalLabel: formatManWon(m.lineTotalWon, isKo),
                    recommendReason:
                      m.recommendReason ??
                      (isKo
                        ? "캠페인 목표·동선에 맞춘 핵심 노출 지점"
                        : "Key placement aligned with campaign routes"),
                  };
                  return (
                    <li key={m.id}>
                      <MediaDetailCard detail={detail} isKo={isKo} />
                    </li>
                  );
                })
              )}
            </ul>
          </section>

          <div
            className="quote-premium-page-break"
            style={{ pageBreakAfter: "always" }}
            aria-hidden
          />
        </div>

        <div
          className="mt-8 border-t-2 border-dashed border-[#E5E7EB] print:hidden"
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
          validUntil={validUntil}
        />
      </div>
    );
  },
);

export default QuotePremium;
