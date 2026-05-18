"use client";

import dynamic from "next/dynamic";
import { useLocale, useTranslations } from "next-intl";
import { useState } from "react";
import { Link } from "@/i18n/navigation";
import { BtnBlock } from "@/components/brutalist";
import { CategoryHeroBetaBadge } from "@/components/category-explore-hero";
import { HomeLandingDayNight } from "@/components/home-landing-day-night";
import { formatCaseStudyMetricValue } from "@/lib/campaign-case-study";
import type { PublicSuccessCaseDetail } from "@/lib/success-case-public";
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

export default function CaseDetailClient({ row, prev, next }: Props) {
  const locale = useLocale();
  const t = useTranslations("cases");
  const isKo = locale === "ko";
  const [showLeadModal, setShowLeadModal] = useState(false);

  const title = isKo ? row.titleKo : row.titleEn ?? row.titleKo;
  const period = formatPeriod(row.periodStartIso, row.periodEndIso, isKo);
  const managerComment =
    row.managerCommentKo ?? row.testimonialKo;
  const metrics =
    row.structuredMetrics.length > 0
      ? row.structuredMetrics
      : [];

  return (
    <HomeLandingDayNight>
      <div className="tkad-landing-neon tkad-planner-neon">
        <section className="bg-hero-void py-24">
          <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
            <Link
              href="/cases"
              className="group mb-6 inline-flex items-center gap-1.5 font-mono text-[11px] font-bold uppercase tracking-[0.18em] text-hero-fg/65 transition-colors hover:text-primary"
            >
              <ArrowLeft className="h-4 w-4 transition-transform group-hover:-translate-x-0.5" />
              {t("detailBack")}
            </Link>

            <p className="flex flex-wrap items-center gap-2 font-mono text-[11px] uppercase tracking-[0.22em] text-primary">
              <span>{`// CASE / ${row.id.slice(0, 8).toUpperCase()}`}</span>
              <CategoryHeroBetaBadge />
            </p>

            <div className="mt-3 flex flex-wrap items-center gap-2">
              <span className="border-2 border-primary bg-primary px-2 py-0.5 font-mono text-[10px] font-bold uppercase tracking-[0.22em] text-primary-foreground">
                [ {row.industry} ]
              </span>
              <span className="inline-flex items-center gap-1.5 border-2 border-hero-fg bg-transparent px-2 py-0.5 font-mono text-[10px] font-bold uppercase tracking-[0.22em] text-hero-fg">
                <BadgeCheck className="h-3 w-3" />
                {t("detailVerified")}
              </span>
            </div>

            <p className="mt-4 font-mono text-[11px] font-bold uppercase tracking-[0.22em] text-primary">
              {row.clientName}
            </p>

            <h1 className="mt-2 text-3xl font-bold tracking-tight text-hero-fg sm:text-5xl lg:text-6xl">
              {title}
            </h1>

            <div className="mt-6 border-l-4 border-primary pl-4">
              <p className="font-mono text-[10px] font-bold uppercase tracking-[0.22em] text-primary">
                [ {t("backgroundLabel")} ]
              </p>
              <p className="mt-2 max-w-3xl text-base leading-relaxed text-hero-fg/85 sm:text-lg">
                {row.summaryKo}
              </p>
            </div>

            <div className="mt-6 flex flex-wrap gap-4 font-mono text-[11px] uppercase tracking-[0.18em] text-hero-fg/70">
              {period ? (
                <span className="inline-flex items-center gap-1.5">
                  <Calendar className="h-4 w-4 text-primary" aria-hidden />
                  {period}
                </span>
              ) : null}
              {row.budgetRange ? (
                <span className="inline-flex items-center gap-1.5">
                  <Wallet className="h-4 w-4 text-primary" aria-hidden />
                  {t("budgetRangeLabel")}: {row.budgetRange}
                </span>
              ) : null}
            </div>

            <div className="mt-8 flex flex-wrap gap-3">
              <BtnBlock
                href={`/contact?case=${encodeURIComponent(row.id)}`}
                variant="accent"
                size="lg"
              >
                {t("ctaSimilar")}
                <ArrowRight className="h-4 w-4" />
              </BtnBlock>
            </div>
          </div>
        </section>

        {metrics.length > 0 ? (
          <section className="border-y-2 border-border bg-card py-12 sm:py-16">
            <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
              <p className="font-mono text-[10px] font-bold uppercase tracking-[0.22em] text-primary">
                [ {t("metricsSectionTitle")} ]
              </p>
              <div className="mt-6 grid gap-0 sm:grid-cols-2 lg:grid-cols-3">
                {metrics.map((m) => (
                  <div
                    key={m.key}
                    className="-mt-[2px] -ml-[2px] border-2 border-border bg-muted p-5 sm:p-6"
                  >
                    <p className="font-mono text-[10px] font-bold uppercase tracking-[0.22em] text-primary">
                      {isKo ? m.labelKo : m.labelEn}
                    </p>
                    <p className="mt-2 font-mono text-2xl font-bold tabular-nums text-foreground sm:text-3xl">
                      {formatCaseStudyMetricValue(m, locale)}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </section>
        ) : null}

        <section className="bg-card py-20 sm:py-24">
          <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
            <div className="grid gap-0 md:grid-cols-2">
              <div className="-mt-[2px] -ml-[2px] border-2 border-border p-6 sm:p-8">
                <div className="flex items-center gap-2 font-mono text-[10px] font-bold uppercase tracking-[0.22em] text-primary">
                  <Target className="h-4 w-4" aria-hidden />[ {t("challengeLabel")} ]
                </div>
                <p className="mt-4 whitespace-pre-wrap text-base leading-relaxed text-foreground sm:text-lg">
                  {row.challengeKo}
                </p>
              </div>
              <div className="-mt-[2px] -ml-[2px] border-2 border-border p-6 sm:p-8">
                <div className="flex items-center gap-2 font-mono text-[10px] font-bold uppercase tracking-[0.22em] text-primary">
                  <Eye className="h-4 w-4" aria-hidden />[ {t("solutionLabel")} ]
                </div>
                <p className="mt-4 whitespace-pre-wrap text-base leading-relaxed text-foreground sm:text-lg">
                  {row.solutionKo}
                </p>
              </div>
            </div>
          </div>
        </section>

        <section className="bg-muted py-20 sm:py-24">
          <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
            <div className="flex items-center gap-2 font-mono text-[10px] font-bold uppercase tracking-[0.22em] text-primary">
              <Eye className="h-4 w-4" aria-hidden />[ {t("mediaLabel")} ]
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              {(row.mediaLinks.length > 0
                ? row.mediaLinks
                : row.mediaUsed.map((label) => ({ label }))
              ).map((link) =>
                "id" in link && link.id ? (
                  <Link
                    key={String(link.id)}
                    href={`/media/${link.id}`}
                    className="border-2 border-border bg-card px-3 py-1.5 font-mono text-[11px] font-bold uppercase tracking-[0.18em] text-foreground transition-colors hover:border-primary hover:bg-primary hover:text-primary-foreground"
                  >
                    {link.label}
                  </Link>
                ) : (
                  <span
                    key={link.label}
                    className="border-2 border-border bg-card px-3 py-1.5 font-mono text-[11px] font-bold uppercase tracking-[0.18em] text-foreground"
                  >
                    {link.label}
                  </span>
                ),
              )}
            </div>

            {row.resultsKo.length > 0 ? (
              <div className="mt-10 border-2 border-border bg-card p-5 sm:p-6">
                <p className="font-mono text-[10px] font-bold uppercase tracking-[0.22em] text-primary">
                  [ {t("resultsLabel")} ]
                </p>
                <ul className="mt-4 space-y-3">
                  {row.resultsKo.map((line, i) => (
                    <li
                      key={i}
                      className="flex items-start gap-3 text-foreground"
                    >
                      <span className="mt-1.5 inline-block h-2 w-2 shrink-0 bg-primary" />
                      <span className="leading-relaxed">{line}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
          </div>
        </section>

        {row.galleryUrls.length > 0 ? (
          <section className="bg-card py-16">
            <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
              <p className="mb-5 font-mono text-[10px] font-bold uppercase tracking-[0.22em] text-primary">
                [ {t("galleryLabel")} ]
              </p>
              <div className="grid gap-0 sm:grid-cols-2 lg:grid-cols-3">
                {row.galleryUrls.map((url, i) => (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    key={i}
                    src={url}
                    alt={
                      isKo
                        ? `${title} 캠페인 이미지 ${i + 1}`
                        : `${title} campaign image ${i + 1}`
                    }
                    className="-mt-[2px] -ml-[2px] aspect-video w-full border-2 border-border object-cover grayscale transition-all duration-500 hover:grayscale-0"
                  />
                ))}
              </div>
            </div>
          </section>
        ) : null}

        {managerComment ? (
          <section className="bg-muted py-20 sm:py-24">
            <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
              <div className="border-2 border-primary bg-card p-8">
                <p className="font-mono text-[10px] font-bold uppercase tracking-[0.22em] text-primary">
                  [ {t("managerCommentTitle")} ]
                </p>
                <p className="mt-4 whitespace-pre-wrap text-base leading-relaxed text-foreground sm:text-lg">
                  {managerComment}
                </p>
              </div>
            </div>
          </section>
        ) : null}

        <section className="bg-card py-20 sm:py-24">
          <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
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
              >
                {t("detailSimilarCampaign")}
                <ArrowRight className="h-4 w-4" />
              </BtnBlock>
            </div>
          </div>
        </section>

        {(prev || next) && (
          <section className="bg-muted py-20 sm:py-24">
            <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
              <div className="flex items-stretch justify-between gap-0">
                {prev ? (
                  <Link
                    href={`/cases/${prev.id}`}
                    className="group -ml-[2px] flex flex-1 flex-col border-2 border-border bg-card p-5 transition-colors hover:bg-foreground hover:text-background"
                  >
                    <span className="flex items-center gap-1 font-mono text-[10px] font-bold uppercase tracking-[0.22em] text-primary">
                      <ArrowLeft className="h-3 w-3" />[ {t("detailPrev")} ]
                    </span>
                    <span className="mt-2 text-sm font-bold tracking-tight">
                      {isKo ? prev.titleKo : prev.titleEn ?? prev.titleKo}
                    </span>
                  </Link>
                ) : (
                  <div className="flex-1" />
                )}
                {next ? (
                  <Link
                    href={`/cases/${next.id}`}
                    className="group -ml-[2px] flex flex-1 flex-col items-end border-2 border-border bg-card p-5 text-right transition-colors hover:bg-foreground hover:text-background"
                  >
                    <span className="flex items-center gap-1 font-mono text-[10px] font-bold uppercase tracking-[0.22em] text-primary">
                      [ {t("detailNext")} ]
                      <ArrowRight className="h-3 w-3" />
                    </span>
                    <span className="mt-2 text-sm font-bold tracking-tight">
                      {isKo ? next.titleKo : next.titleEn ?? next.titleKo}
                    </span>
                  </Link>
                ) : (
                  <div className="flex-1" />
                )}
              </div>
            </div>
          </section>
        )}

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
