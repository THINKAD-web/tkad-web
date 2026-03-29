"use client";

import dynamic from "next/dynamic";
import { useLocale, useTranslations } from "next-intl";
import { useState } from "react";
import { Link } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import type { PublicSuccessCaseDetail } from "@/lib/success-case-public";
import {
  ArrowLeft,
  ArrowRight,
  BadgeCheck,
  Calendar,
  Download,
  Eye,
  MessageSquareQuote,
  Quote,
  Target,
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
  const a = start ? new Date(start).toLocaleDateString(isKo ? "ko-KR" : "en-US", opts) : "";
  const b = end ? new Date(end).toLocaleDateString(isKo ? "ko-KR" : "en-US", opts) : "";
  if (a && b) return `${a} – ${b}`;
  return a || b || null;
}

export default function CaseDetailClient({ row, prev, next }: Props) {
  const locale = useLocale();
  const t = useTranslations();
  const isKo = locale === "ko";
  const [showLeadModal, setShowLeadModal] = useState(false);

  const title = isKo ? row.titleKo : row.titleEn ?? row.titleKo;
  const period = formatPeriod(row.periodStartIso, row.periodEndIso, isKo);

  const metricEntries = row.metricsJson
    ? Object.entries(row.metricsJson).filter(
        ([, v]) => v != null && String(v).length > 0,
      )
    : [];

  return (
    <>
      <section className="relative overflow-hidden bg-navy py-28">
        <div className="pointer-events-none absolute -right-32 -top-32 h-96 w-96 rounded-full bg-gold/10 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-24 -left-24 h-80 w-80 rounded-full bg-sky-500/8 blur-3xl" />
        <div className="relative mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
          <Link
            href="/cases"
            className="mb-6 inline-flex items-center gap-1.5 text-sm font-medium text-slate-400 transition-colors hover:text-white"
          >
            <ArrowLeft className="h-4 w-4" />
            {t("cases.detailBack")}
          </Link>

          <div className="flex flex-wrap items-center gap-3">
            <Badge className="text-xs bg-gold/20 text-gold">{row.industry}</Badge>
            <div className="flex items-center gap-1.5 rounded-full bg-emerald-500/20 px-2.5 py-0.5 text-[11px] font-bold text-emerald-300">
              <BadgeCheck className="h-3.5 w-3.5" />
              {t("cases.detailVerified")}
            </div>
          </div>

          <h1 className="mt-4 text-3xl font-extrabold tracking-tight text-white sm:text-4xl lg:text-5xl">
            {title}
          </h1>

          <p className="mt-4 max-w-3xl text-lg leading-relaxed text-slate-300/90">
            {row.summaryKo}
          </p>

          <div className="mt-6 flex flex-wrap gap-3">
            <Link href={`/contact?case=${encodeURIComponent(row.id)}`}>
              <Button
                size="lg"
                className="h-12 rounded-full border-0 bg-gold px-8 text-sm font-bold text-navy shadow-lg shadow-gold/25 hover:bg-gold-dark"
              >
                {t("cases.ctaSimilar")}
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
          </div>

          <div className="mt-6 flex flex-wrap items-center gap-x-6 gap-y-2 text-sm text-slate-400">
            <span className="flex items-center gap-1.5">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border-2 border-gold/35 bg-navy text-xs font-extrabold text-gold">
                {row.clientName.slice(0, 2)}
              </span>
              <span>{row.clientName}</span>
            </span>
            {period ? (
              <span className="flex items-center gap-1.5">
                <Calendar className="h-4 w-4 text-gold/60" />
                {period}
              </span>
            ) : null}
          </div>
        </div>
      </section>

      <section className="py-28">
        <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
          <div className="grid gap-12 md:grid-cols-2">
            <div>
              <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-gold-dark">
                <Target className="h-4 w-4" />
                {t("cases.challengeLabel")}
              </div>
              <p className="text-lg leading-relaxed text-navy/80 whitespace-pre-wrap">
                {row.challengeKo}
              </p>
            </div>
            <div>
              <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-gold-dark">
                <Eye className="h-4 w-4" />
                {t("cases.solutionLabel")}
              </div>
              <p className="text-lg leading-relaxed text-navy/80 whitespace-pre-wrap">
                {row.solutionKo}
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="border-y bg-slate-50 py-28">
        <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
          <div className="mb-6 flex items-center gap-2 text-sm font-semibold text-gold-dark">
            <Eye className="h-4 w-4" />
            {t("cases.mediaLabel")}
          </div>
          <div className="flex flex-wrap gap-2">
            {row.mediaUsed.map((m) => (
              <Badge
                key={m}
                variant="secondary"
                className="bg-navy/5 px-3 py-1 text-sm font-medium text-navy"
              >
                {m}
              </Badge>
            ))}
          </div>

          {row.resultsKo.length > 0 ? (
            <div className="mt-10">
              <p className="mb-3 text-sm font-semibold text-navy">
                {t("cases.resultsLabel")}
              </p>
              <ul className="list-disc space-y-2 pl-5 text-navy/80">
                {row.resultsKo.map((line, i) => (
                  <li key={i}>{line}</li>
                ))}
              </ul>
            </div>
          ) : null}

          {metricEntries.length > 0 ? (
            <div className="mt-10 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {metricEntries.map(([k, v]) => (
                <div
                  key={k}
                  className="rounded-2xl border bg-white p-4 shadow-sm"
                >
                  <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    {k}
                  </p>
                  <p className="mt-1 text-lg font-extrabold text-navy">
                    {typeof v === "object" ? JSON.stringify(v) : String(v)}
                  </p>
                </div>
              ))}
            </div>
          ) : null}
        </div>
      </section>

      {row.galleryUrls.length > 0 ? (
        <section className="py-16">
          <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
            <p className="mb-4 text-xs font-bold uppercase tracking-wide text-navy/45">
              {t("cases.galleryLabel")}
            </p>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {row.galleryUrls.map((url, i) => (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  key={i}
                  src={url}
                  alt=""
                  className="aspect-video w-full rounded-xl border object-cover"
                />
              ))}
            </div>
          </div>
        </section>
      ) : null}

      {row.testimonialKo ? (
        <section className="border-t bg-slate-50 py-28">
          <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
            <div className="rounded-2xl bg-white p-8 shadow-md">
              <p className="text-xs font-bold uppercase tracking-wide text-navy/45">
                {t("cases.testimonialLabel")}
              </p>
              <Quote className="mt-3 h-8 w-8 text-gold/30" />
              <p className="mt-4 text-lg leading-relaxed text-navy/80 italic whitespace-pre-wrap">
                &ldquo;{row.testimonialKo}&rdquo;
              </p>
              <div className="mt-6 border-t pt-4">
                <p className="text-xs text-muted-foreground">{row.clientName}</p>
              </div>
            </div>
          </div>
        </section>
      ) : null}

      <section className="py-28">
        <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
            <Button
              size="lg"
              onClick={() => setShowLeadModal(true)}
              className="h-14 rounded-full bg-gold px-10 text-base font-bold text-navy shadow-lg shadow-gold/20 hover:bg-gold-dark"
            >
              <Download className="mr-2 h-5 w-5" />
              {t("cases.detailDownloadPdf")}
            </Button>
            <Link href={`/contact?case=${encodeURIComponent(row.id)}`}>
              <Button
                size="lg"
                variant="outline"
                className="h-14 rounded-full border-navy/20 px-10 text-base font-semibold text-navy hover:bg-navy hover:text-white"
              >
                {t("cases.detailSimilarCampaign")}
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {(prev || next) && (
        <section className="border-t bg-slate-50 py-28">
          <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
            <div className="flex items-stretch justify-between gap-4">
              {prev ? (
                <Link
                  href={`/cases/${prev.id}`}
                  className="group flex flex-1 flex-col rounded-xl border bg-white p-4 shadow-sm transition-shadow hover:shadow-md"
                >
                  <span className="flex items-center gap-1 text-xs font-semibold text-muted-foreground">
                    <ArrowLeft className="h-3 w-3" />
                    {t("cases.detailPrev")}
                  </span>
                  <span className="mt-2 text-sm font-bold text-navy transition-colors group-hover:text-gold-dark">
                    {isKo ? prev.titleKo : prev.titleEn ?? prev.titleKo}
                  </span>
                </Link>
              ) : (
                <div className="flex-1" />
              )}
              {next ? (
                <Link
                  href={`/cases/${next.id}`}
                  className="group flex flex-1 flex-col items-end rounded-xl border bg-white p-4 text-right shadow-sm transition-shadow hover:shadow-md"
                >
                  <span className="flex items-center gap-1 text-xs font-semibold text-muted-foreground">
                    {t("cases.detailNext")}
                    <ArrowRight className="h-3 w-3" />
                  </span>
                  <span className="mt-2 text-sm font-bold text-navy transition-colors group-hover:text-gold-dark">
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
    </>
  );
}
