"use client";

import { useLocale } from "next-intl";
import { useState } from "react";
import { Link } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { caseStudies, categoryColors, getCaseStudyBySlug } from "@/lib/case-studies";
import { LeadCaptureModal, type LeadData } from "@/components/lead-capture-modal";
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
  TrendingUp,
  Users,
} from "lucide-react";
import { notFound } from "next/navigation";
import { use } from "react";

type Props = {
  params: Promise<{ locale: string; slug: string }>;
};

const categoryLabels: Record<string, { ko: string; en: string }> = {
  billboard: { ko: "빌보드", en: "Billboard" },
  digital: { ko: "디지털", en: "Digital" },
  transport: { ko: "교통", en: "Transport" },
  special: { ko: "특수", en: "Special" },
};

export default function CaseStudyDetailPage({ params }: Props) {
  const { slug } = use(params);
  const locale = useLocale();
  const isKo = locale === "ko";
  const [showLeadModal, setShowLeadModal] = useState(false);

  const cs = getCaseStudyBySlug(slug);
  if (!cs) notFound();

  const currentIndex = caseStudies.findIndex((c) => c.slug === slug);
  const prev = currentIndex > 0 ? caseStudies[currentIndex - 1] : null;
  const next = currentIndex < caseStudies.length - 1 ? caseStudies[currentIndex + 1] : null;

  const handleLeadSubmit = (_data: LeadData) => {
    const link = document.createElement("a");
    link.href = `/cases/${slug}-report.pdf`;
    link.download = `${slug}-report.pdf`;
    link.click();
  };

  return (
    <>
      <section className="relative overflow-hidden bg-navy py-20">
        <div className="pointer-events-none absolute -right-32 -top-32 h-96 w-96 rounded-full bg-gold/10 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-24 -left-24 h-80 w-80 rounded-full bg-sky-500/8 blur-3xl" />
        <div className="relative mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
          <Link
            href="/cases"
            className="mb-6 inline-flex items-center gap-1.5 text-sm font-medium text-slate-400 transition-colors hover:text-white"
          >
            <ArrowLeft className="h-4 w-4" />
            {isKo ? "성공 사례 목록" : "All case studies"}
          </Link>

          <div className="flex flex-wrap items-center gap-3">
            <Badge className={`text-xs ${categoryColors[cs.category]}`}>
              {categoryLabels[cs.category]?.[isKo ? "ko" : "en"]}
            </Badge>
            <div className="flex items-center gap-1.5 rounded-full bg-emerald-500/20 px-2.5 py-0.5 text-[11px] font-bold text-emerald-300">
              <BadgeCheck className="h-3.5 w-3.5" />
              Verified Case
            </div>
          </div>

          <h1 className="mt-4 text-3xl font-extrabold tracking-tight text-white sm:text-4xl lg:text-5xl">
            {isKo ? cs.title : cs.titleEn}
          </h1>

          <p className="mt-4 max-w-3xl text-lg leading-relaxed text-slate-300/90">
            {isKo ? cs.description : cs.descriptionEn}
          </p>

          <div className="mt-6 flex flex-wrap items-center gap-x-6 gap-y-2 text-sm text-slate-400">
            <span className="flex items-center gap-2.5">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border-2 border-gold/35 bg-navy text-xs font-extrabold text-gold">
                {cs.clientLogo}
              </span>
              <span className="flex items-center gap-1.5">
                <Users className="h-4 w-4 text-gold/60" />
                {isKo ? cs.client : cs.clientEn}
              </span>
            </span>
            <span className="flex items-center gap-1.5">
              <Calendar className="h-4 w-4 text-gold/60" />
              {isKo ? cs.duration : cs.durationEn}
            </span>
          </div>
        </div>
      </section>

      <section className="border-b border-gold/15 bg-gradient-to-r from-gold/12 via-gold/8 to-navy/[0.06] py-10">
        <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col items-start gap-4 sm:flex-row sm:items-center sm:justify-between sm:gap-8">
            <div>
              <p className="text-xs font-bold uppercase tracking-widest text-gold-dark">
                ROI
              </p>
              <p className="mt-1 text-4xl font-extrabold tracking-tight text-navy sm:text-5xl">
                {cs.roi}
              </p>
            </div>
            <p className="max-w-xl text-base leading-relaxed text-navy/80 sm:text-lg">
              {isKo ? cs.roiDetail : cs.roiDetailEn}
            </p>
          </div>
        </div>
      </section>

      <section className="py-16">
        <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {cs.stats.map((stat, i) => (
              <div
                key={i}
                className="rounded-2xl border bg-gradient-to-br from-white to-slate-50 p-5 shadow-sm transition-shadow hover:shadow-md"
              >
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  {isKo ? stat.label : stat.labelEn}
                </p>
                <p className="mt-2 text-2xl font-extrabold text-navy">{stat.value}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="border-y bg-slate-50 py-16">
        <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
          <div className="grid gap-12 md:grid-cols-2">
            <div>
              <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-gold-dark">
                <Target className="h-4 w-4" />
                {isKo ? "캠페인 목표" : "Campaign Goal"}
              </div>
              <p className="text-lg leading-relaxed text-navy/80">
                {isKo ? cs.campaignGoal : cs.campaignGoalEn}
              </p>
            </div>

            <div>
              <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-gold-dark">
                <Eye className="h-4 w-4" />
                {isKo ? "활용 매체" : "Media Used"}
              </div>
              <div className="flex flex-wrap gap-2">
                {(isKo ? cs.mediaUsed : cs.mediaUsedEn).map((m) => (
                  <Badge
                    key={m}
                    variant="secondary"
                    className="bg-navy/5 text-navy text-sm font-medium px-3 py-1"
                  >
                    {m}
                  </Badge>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="py-16">
        <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="rounded-2xl bg-navy/[0.03] p-6 text-center">
              <Eye className="mx-auto h-6 w-6 text-gold/50" />
              <p className="mt-3 text-2xl font-extrabold text-navy">
                {isKo ? cs.exposures : cs.exposuresEn}
              </p>
              <p className="mt-1 text-xs font-medium text-muted-foreground">
                {isKo ? "총 노출수" : "Total Exposures"}
              </p>
            </div>
            <div className="rounded-2xl bg-navy/[0.03] p-6 text-center">
              <TrendingUp className="mx-auto h-6 w-6 text-emerald-500/50" />
              <p className="mt-3 text-2xl font-extrabold text-emerald-600">
                {cs.reachIncrease}
              </p>
              <p className="mt-1 text-xs font-medium text-muted-foreground">
                {isKo ? "도달률 증가" : "Reach Increase"}
              </p>
            </div>
            <div className="rounded-2xl bg-navy/[0.03] p-6 text-center">
              <BadgeCheck className="mx-auto h-6 w-6 text-gold/50" />
              <p className="mt-3 text-lg font-extrabold text-navy">
                {isKo ? cs.results : cs.resultsEn}
              </p>
              <p className="mt-1 text-xs font-medium text-muted-foreground">
                {isKo ? "핵심 성과" : "Key Result"}
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="border-t bg-slate-50 py-16">
        <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
          <div className="rounded-2xl bg-white p-8 shadow-md">
            <Quote className="h-8 w-8 text-gold/30" />
            <p className="mt-4 text-lg leading-relaxed text-navy/80 italic">
              &ldquo;{isKo ? cs.testimonial : cs.testimonialEn}&rdquo;
            </p>
            <div className="mt-6 border-t pt-4">
              <p className="text-sm font-bold text-navy">
                {isKo ? cs.testimonialAuthor : cs.testimonialAuthorEn}
              </p>
              <p className="text-xs text-muted-foreground">
                {isKo ? cs.client : cs.clientEn}
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="border-t bg-white py-12">
        <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
          <div className="rounded-2xl border border-gold/30 bg-gradient-to-br from-gold/10 to-white p-8 shadow-sm">
            <div className="mb-3 flex items-center gap-2 text-sm font-bold uppercase tracking-wide text-gold-dark">
              <MessageSquareQuote className="h-5 w-5" />
              {isKo ? "THINKAD 매니저 코멘트" : "THINKAD Manager Comment"}
            </div>
            <p className="text-lg leading-relaxed text-navy/85">
              &ldquo;{isKo ? cs.managerComment : cs.managerCommentEn}&rdquo;
            </p>
            <div className="mt-6 border-t border-gold/20 pt-4">
              <p className="text-sm font-bold text-navy">
                {isKo ? cs.managerName : cs.managerNameEn}
              </p>
              <p className="text-xs text-muted-foreground">
                {isKo ? cs.managerRole : cs.managerRoleEn}
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="py-16">
        <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
            <Button
              size="lg"
              onClick={() => setShowLeadModal(true)}
              className="bg-gold text-navy hover:bg-gold-dark h-14 rounded-full px-10 text-base font-bold shadow-lg shadow-gold/20"
            >
              <Download className="mr-2 h-5 w-5" />
              {isKo ? "캠페인 리포트 PDF 다운로드" : "Download Campaign Report PDF"}
            </Button>
            <Link href="/contact">
              <Button
                size="lg"
                variant="outline"
                className="h-14 rounded-full border-navy/20 px-10 text-base text-navy font-semibold hover:bg-navy hover:text-white"
              >
                {isKo ? "비슷한 캠페인 문의하기" : "Inquire About Similar Campaign"}
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {(prev || next) && (
        <section className="border-t bg-slate-50 py-12">
          <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
            <div className="flex items-stretch justify-between gap-4">
              {prev ? (
                <Link
                  href={`/cases/${prev.slug}`}
                  className="group flex flex-1 flex-col rounded-xl border bg-white p-4 shadow-sm transition-shadow hover:shadow-md"
                >
                  <span className="flex items-center gap-1 text-xs font-semibold text-muted-foreground">
                    <ArrowLeft className="h-3 w-3" />
                    {isKo ? "이전 사례" : "Previous"}
                  </span>
                  <span className="mt-2 text-sm font-bold text-navy group-hover:text-gold-dark transition-colors">
                    {isKo ? prev.title : prev.titleEn}
                  </span>
                </Link>
              ) : (
                <div className="flex-1" />
              )}
              {next ? (
                <Link
                  href={`/cases/${next.slug}`}
                  className="group flex flex-1 flex-col items-end rounded-xl border bg-white p-4 shadow-sm transition-shadow hover:shadow-md text-right"
                >
                  <span className="flex items-center gap-1 text-xs font-semibold text-muted-foreground">
                    {isKo ? "다음 사례" : "Next"}
                    <ArrowRight className="h-3 w-3" />
                  </span>
                  <span className="mt-2 text-sm font-bold text-navy group-hover:text-gold-dark transition-colors">
                    {isKo ? next.title : next.titleEn}
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
        onSubmit={handleLeadSubmit}
        locale={locale}
        title={isKo ? "캠페인 리포트 다운로드" : "Download Campaign Report"}
        description={
          isKo
            ? "정보를 입력하시면 PDF 리포트를 다운로드할 수 있습니다."
            : "Enter your details to download the PDF report."
        }
      />
    </>
  );
}
