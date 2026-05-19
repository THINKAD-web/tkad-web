"use client";

import dynamic from "next/dynamic";
import { useLocale, useTranslations } from "next-intl";
import { useMemo, useState } from "react";
import { Link } from "@/i18n/navigation";
import { BtnBlock } from "@/components/brutalist";
import { CategoryHeroBetaBadge } from "@/components/category-explore-hero";
import { CaseMetricsCharts } from "@/components/cases/case-metrics-charts";
import { SimilarCasesRow } from "@/components/cases/similar-cases-row";
import { HomeLandingDayNight } from "@/components/home-landing-day-night";
import MediaLightbox from "@/components/media-lightbox";
import { formatCaseStudyMetricValue } from "@/lib/campaign-case-study";
import { buildCaseHeadline } from "@/lib/success-case-hub";
import type {
  PublicSuccessCaseDetail,
  PublicSuccessCaseListItem,
} from "@/lib/success-case-public";
import {
  ArrowLeft,
  ArrowRight,
  BadgeCheck,
  Calendar,
  Download,
  Eye,
  Target,
  Wallet,
} from "lucide-react";

const LeadCaptureModal = dynamic(() =>
  import("@/components/lead-capture-modal").then((m) => ({
    default: m.LeadCaptureModal,
  })),
);

type NavItem = { id: string; titleKo: string; titleEn: string | null };

type Props = {
  row: PublicSuccessCaseDetail;
  prev: NavItem | null;
  next: NavItem | null;
  similarCases: PublicSuccessCaseListItem[];
};

function formatPeriod(
  start: string | null,
  end: string | null,
  isKo: boolean,
): string | null {
  if (!start && !end) return null;
  const opts: Intl.DateTimeFormatOptions = {
    year: "numeric",
    month: "short",
    day: "numeric",
  };
  const a = start
    ? new Date(start).toLocaleDateString(isKo ? "ko-KR" : "en-US", opts)
    : "";
  const b = end
    ? new Date(end).toLocaleDateString(isKo ? "ko-KR" : "en-US", opts)
    : "";
  if (a && b) return `${a} – ${b}`;
  return a || b || null;
}

export default function CaseDetailClient({
  row,
  prev,
  next,
  similarCases,
}: Props) {
  const locale = useLocale();
  const t = useTranslations("cases");
  const isKo = locale === "ko";
  const [showLeadModal, setShowLeadModal] = useState(false);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState(0);

  const title = isKo ? row.titleKo : row.titleEn ?? row.titleKo;
  const period = formatPeriod(row.periodStartIso, row.periodEndIso, isKo);
  const managerComment = row.managerCommentKo ?? row.testimonialKo;
  const metrics =
    row.structuredMetrics.length > 0 ? row.structuredMetrics : [];
  const headline = buildCaseHeadline(row, locale);

  const galleryUrls = useMemo(
    () => row.galleryUrls.filter(Boolean),
    [row.galleryUrls],
  );

  return (
    <HomeLandingDayNight>
      <div className="tkad-landing-neon tkad-planner-neon min-h-screen bg-[#0A0A0A] text-white">
        <section className="py-20 sm:py-24">
          <CaseDetailContainer>
            <Link
              href="/cases"
              className="group mb-6 inline-flex items-center gap-1.5 font-mono text-[11px] font-bold uppercase tracking-[0.18em] text-white/55 transition-colors hover:text-[#22d3ee]"
            >
              <ArrowLeft className="h-4 w-4 transition-transform group-hover:-translate-x-0.5" />
              {t("detailBack")}
            </Link>

            <p className="flex flex-wrap items-center gap-2 font-mono text-[11px] uppercase tracking-[0.22em] text-[#22d3ee]">
              <span>{`// CASE / ${row.id.slice(0, 8).toUpperCase()}`}</span>
              <CategoryHeroBetaBadge />
            </p>

            <div className="mt-3 flex flex-wrap items-center gap-2">
              <span className="rounded-full border border-[#a855f7]/40 bg-[#a855f7]/20 px-3 py-0.5 font-mono text-[10px] font-bold uppercase tracking-[0.22em] text-[#e9d5ff]">
                {row.industry}
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-white/5 px-3 py-0.5 font-mono text-[10px] font-bold uppercase tracking-[0.22em] text-white/80">
                <BadgeCheck className="h-3 w-3 text-[#22d3ee]" />
                {t("detailVerified")}
              </span>
            </div>

            <p className="mt-4 font-mono text-[11px] font-bold uppercase tracking-[0.22em] text-white/50">
              {row.clientName}
            </p>

            <h1 className="mt-2 text-3xl font-black tracking-tight text-white sm:text-5xl">
              {title}
            </h1>
            {headline ? (
              <p className="mt-3 font-mono text-sm font-semibold text-[#22d3ee]">
                {headline}
              </p>
            ) : null}

            <div className="mt-6 rounded-[20px] border border-white/12 bg-white/5 p-5 backdrop-blur">
              <p className="font-mono text-[10px] font-bold uppercase tracking-[0.22em] text-[#a855f7]">
                [ {t("backgroundLabel")} ]
              </p>
              <p className="mt-2 max-w-3xl text-base leading-relaxed text-white/85 sm:text-lg">
                {row.summaryKo}
              </p>
            </div>

            <CaseDetailContainer className="mt-6 flex flex-wrap gap-4 font-mono text-[11px] uppercase tracking-[0.18em] text-white/60">
              {period ? (
                <span className="inline-flex items-center gap-1.5">
                  <Calendar className="h-4 w-4 text-[#22d3ee]" aria-hidden />
                  {period}
                </span>
              ) : null}
              {row.budgetRange ? (
                <span className="inline-flex items-center gap-1.5">
                  <Wallet className="h-4 w-4 text-[#22d3ee]" aria-hidden />
                  {t("budgetRangeLabel")}: {row.budgetRange}
                </span>
              ) : null}
            </CaseDetailContainer>
          </CaseDetailContainer>
        </section>

        {metrics.length > 0 ? (
          <section className="border-y border-white/10 py-12 sm:py-16">
            <CaseDetailContainer>
              <p className="font-mono text-[10px] font-bold uppercase tracking-[0.22em] text-[#22d3ee]">
                [ {t("metricsSectionTitle")} ]
              </p>
              <CaseMetricsCharts metrics={metrics} />
              <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {metrics.map((m) => (
                  <div
                    key={m.key}
                    className="rounded-[16px] border border-white/12 bg-black/40 p-4"
                  >
                    <p className="font-mono text-[10px] font-bold uppercase tracking-[0.22em] text-white/55">
                      {isKo ? m.labelKo : m.labelEn}
                    </p>
                    <p className="mt-2 font-mono text-2xl font-black tabular-nums text-white">
                      {formatCaseStudyMetricValue(m, locale)}
                    </p>
                  </div>
                ))}
              </div>
            </CaseDetailContainer>
          </section>
        ) : null}

        <section className="py-16 sm:py-20">
          <CaseDetailContainer>
            <p className="mb-6 font-mono text-[10px] font-bold uppercase tracking-[0.22em] text-[#a855f7]">
              [ {t("strategySectionTitle")} ]
            </p>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="rounded-[20px] border border-white/12 bg-white/5 p-6 sm:p-8">
                <div className="flex items-center gap-2 font-mono text-[10px] font-bold uppercase tracking-[0.22em] text-[#22d3ee]">
                  <Target className="h-4 w-4" aria-hidden />
                  {t("challengeLabel")}
                </div>
                <p className="mt-4 whitespace-pre-wrap text-base leading-relaxed text-white/85">
                  {row.challengeKo}
                </p>
              </div>
              <div className="rounded-[20px] border border-white/12 bg-white/5 p-6 sm:p-8">
                <div className="flex items-center gap-2 font-mono text-[10px] font-bold uppercase tracking-[0.22em] text-[#22d3ee]">
                  <Eye className="h-4 w-4" aria-hidden />
                  {t("solutionLabel")}
                </div>
                <p className="mt-4 whitespace-pre-wrap text-base leading-relaxed text-white/85">
                  {row.solutionKo}
                </p>
              </div>
            </div>
          </CaseDetailContainer>
        </section>

        <section className="border-t border-white/10 py-16 sm:py-20">
          <CaseDetailContainer>
            <p className="font-mono text-[10px] font-bold uppercase tracking-[0.22em] text-[#22d3ee]">
              [ {t("mediaLabel")} ]
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              {(row.mediaLinks.length > 0
                ? row.mediaLinks
                : row.mediaUsed.map((label) => ({ label }))
              ).map((link) =>
                "id" in link && link.id ? (
                  <Link
                    key={String(link.id)}
                    href={`/media/${link.id}`}
                    className="rounded-full border border-white/15 bg-white/5 px-4 py-2 font-mono text-[11px] font-bold uppercase tracking-[0.16em] text-white transition-colors hover:border-[#22d3ee]/40 hover:bg-[#22d3ee]/15"
                  >
                    {link.label}
                  </Link>
                ) : (
                  <span
                    key={link.label}
                    className="rounded-full border border-white/15 bg-white/5 px-4 py-2 font-mono text-[11px] font-bold uppercase tracking-[0.16em] text-white/70"
                  >
                    {link.label}
                  </span>
                ),
              )}
            </div>

            {row.resultsKo.length > 0 ? (
              <div className="mt-10 rounded-[20px] border border-white/12 bg-black/40 p-5 sm:p-6">
                <p className="font-mono text-[10px] font-bold uppercase tracking-[0.22em] text-[#a855f7]">
                  [ {t("resultsLabel")} ]
                </p>
                <ul className="mt-4 space-y-3">
                  {row.resultsKo.map((line, i) => (
                    <li key={i} className="flex items-start gap-3 text-white/85">
                      <span className="mt-1.5 inline-block h-2 w-2 shrink-0 rounded-full bg-[#22d3ee]" />
                      <span className="leading-relaxed">{line}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
          </CaseDetailContainer>
        </section>

        {galleryUrls.length > 0 ? (
          <section className="py-16">
            <CaseDetailContainer>
              <p className="mb-5 font-mono text-[10px] font-bold uppercase tracking-[0.22em] text-[#22d3ee]">
                [ {t("galleryLabel")} ]
              </p>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {galleryUrls.map((url, i) => (
                  <button
                    key={url}
                    type="button"
                    onClick={() => {
                      setLightboxIndex(i);
                      setLightboxOpen(true);
                    }}
                    className="group relative aspect-video overflow-hidden rounded-[16px] border border-white/12"
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={url}
                      alt={
                        isKo
                          ? `${title} 현장 사진 ${i + 1}`
                          : `${title} on-site photo ${i + 1}`
                      }
                      className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                    />
                  </button>
                ))}
              </div>
            </CaseDetailContainer>
          </section>
        ) : null}

        {managerComment ? (
          <section className="border-t border-white/10 py-16">
            <CaseDetailContainer className="mx-auto max-w-3xl">
              <div className="rounded-[24px] border border-[#a855f7]/30 bg-gradient-to-br from-[#a855f7]/15 to-transparent p-8">
                <p className="font-mono text-[10px] font-bold uppercase tracking-[0.22em] text-[#a855f7]">
                  [ {t("managerCommentTitle")} ]
                </p>
                <p className="mt-4 whitespace-pre-wrap text-base leading-relaxed text-white/85">
                  {managerComment}
                </p>
              </div>
            </CaseDetailContainer>
          </section>
        ) : null}

        <SimilarCasesRow items={similarCases} compact />

        <section className="py-16 sm:py-20">
          <CaseDetailContainer className="text-center">
            <div className="flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
              <BtnBlock
                variant="accent"
                size="lg"
                onClick={() => setShowLeadModal(true)}
              >
                <Download className="h-5 w-5" />
                {t("detailDownloadPdf")}
              </BtnBlock>
              <BtnBlock
                href={`/contact?case=${encodeURIComponent(row.id)}`}
                variant="dark"
                size="lg"
                className="border border-[#22d3ee]/30 bg-[#22d3ee]/10 text-[#22d3ee] hover:bg-[#22d3ee]/20"
              >
                {t("detailInquiryCta")}
                <ArrowRight className="h-4 w-4" />
              </BtnBlock>
            </div>
          </CaseDetailContainer>
        </section>

        {(prev || next) && (
          <section className="border-t border-white/10 py-12">
            <CaseDetailContainer>
              <div className="flex items-stretch justify-between gap-3">
                {prev ? (
                  <Link
                    href={`/cases/${prev.id}`}
                    className="group flex flex-1 flex-col rounded-[16px] border border-white/12 bg-white/5 p-5 transition-colors hover:border-[#22d3ee]/30"
                  >
                    <span className="flex items-center gap-1 font-mono text-[10px] font-bold uppercase tracking-[0.22em] text-[#22d3ee]">
                      <ArrowLeft className="h-3 w-3" />
                      {t("detailPrev")}
                    </span>
                    <span className="mt-2 text-sm font-bold text-white">
                      {isKo ? prev.titleKo : prev.titleEn ?? prev.titleKo}
                    </span>
                  </Link>
                ) : (
                  <div className="flex-1" />
                )}
                {next ? (
                  <Link
                    href={`/cases/${next.id}`}
                    className="group flex flex-1 flex-col items-end rounded-[16px] border border-white/12 bg-white/5 p-5 text-right transition-colors hover:border-[#22d3ee]/30"
                  >
                    <span className="flex items-center gap-1 font-mono text-[10px] font-bold uppercase tracking-[0.22em] text-[#22d3ee]">
                      {t("detailNext")}
                      <ArrowRight className="h-3 w-3" />
                    </span>
                    <span className="mt-2 text-sm font-bold text-white">
                      {isKo ? next.titleKo : next.titleEn ?? next.titleKo}
                    </span>
                  </Link>
                ) : (
                  <div className="flex-1" />
                )}
              </div>
            </CaseDetailContainer>
          </section>
        )}

        <MediaLightbox
          open={lightboxOpen}
          onClose={() => setLightboxOpen(false)}
          images={galleryUrls}
          index={lightboxIndex}
          onIndexChange={setLightboxIndex}
          altBase={title}
          labels={{
            close: isKo ? "닫기" : "Close",
            prev: isKo ? "이전" : "Prev",
            next: isKo ? "다음" : "Next",
            expand: isKo ? "확대" : "Expand",
          }}
        />

        <LeadCaptureModal
          open={showLeadModal}
          onClose={() => setShowLeadModal(false)}
          onSubmit={() => setShowLeadModal(false)}
          locale={locale}
          title={isKo ? "문의 접수" : "Get in touch"}
          description={
            isKo
              ? "담당자가 캠페인 자료 안내를 도와드립니다."
              : "Our team can share more about this campaign."
          }
        />
      </div>
    </HomeLandingDayNight>
  );
}

function CaseDetailContainer({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={className ?? "mx-auto max-w-5xl px-4 sm:px-6 lg:px-8"}>
      {children}
    </div>
  );
}
