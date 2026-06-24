"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useTranslations, useLocale } from "next-intl";
import { BtnBlock } from "@/components/brutalist";
import Modal from "@/components/ui/modal";
import { HomeLandingDayNight } from "@/components/home-landing-day-night";

const inputCls =
  "h-10 w-full border-2 border-border bg-card px-3  text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none";
const textareaCls =
  "min-h-[100px] w-full border-2 border-border bg-card px-3 py-2  text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none";
const labelCls =
  "block font-display text-xs font-medium uppercase tracking-[0.22em] text-primary";
import {
  BarChart3,
  BookOpen,
  CalendarRange,
  Download,
  FileText,
  Loader2,
  Mail,
  MonitorPlay,
  Send,
} from "lucide-react";
import {
  filterInsightReports,
  type InsightReport,
  type InsightVerticalTag,
  type PeriodFilter,
  type VerticalFilter,
} from "@/lib/insights-reports";
import {
  downloadInsightReportPdf,
  insightReportPdfBlob,
} from "@/lib/build-insights-pdf";
import { useToast } from "@/components/toast-provider";
import { cn } from "@/lib/utils";

export default function InsightsPageClient({
  initialReports,
}: {
  initialReports: InsightReport[];
}) {
  const t = useTranslations("insights");
  const locale = useLocale();
  const isKo = locale === "ko";
  const { toast } = useToast();

  const [period, setPeriod] = useState<PeriodFilter>("all");
  const [vertical, setVertical] = useState<VerticalFilter>("all");
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [viewerOpen, setViewerOpen] = useState(false);
  const [viewerLoading, setViewerLoading] = useState(false);
  const [viewerUrl, setViewerUrl] = useState<string | null>(null);
  const [viewerTitle, setViewerTitle] = useState("");

  const [formCompany, setFormCompany] = useState("");
  const [formEmail, setFormEmail] = useState("");
  const [formIndustry, setFormIndustry] = useState("");
  const [formPeriodPref, setFormPeriodPref] = useState<
    "monthly" | "quarterly" | "both"
  >("both");
  const [formNotes, setFormNotes] = useState("");
  const [formSubmitting, setFormSubmitting] = useState(false);

  const hasLibrary = initialReports.length > 0;

  const filtered = useMemo(
    () => filterInsightReports(initialReports, period, vertical),
    [initialReports, period, vertical],
  );

  const revokeViewer = useCallback(() => {
    setViewerUrl((u) => {
      if (u) URL.revokeObjectURL(u);
      return null;
    });
  }, []);

  const closeViewer = useCallback(() => {
    setViewerOpen(false);
    revokeViewer();
    setViewerLoading(false);
  }, [revokeViewer]);

  useEffect(() => {
    return () => {
      revokeViewer();
    };
  }, [revokeViewer]);

  const handleDownload = async (report: InsightReport) => {
    setDownloadingId(report.id);
    try {
      await downloadInsightReportPdf(report, isKo);
      toast("success", t("toastDownloaded"));
    } catch {
      toast("error", t("toastPdfError"));
    } finally {
      setDownloadingId(null);
    }
  };

  const handleViewOnline = async (report: InsightReport) => {
    revokeViewer();
    setViewerTitle(isKo ? report.titleKo : report.titleEn);
    setViewerOpen(true);
    setViewerLoading(true);
    try {
      const blob = await insightReportPdfBlob(report, isKo);
      const url = URL.createObjectURL(blob);
      setViewerUrl(url);
    } catch {
      toast("error", t("toastPdfError"));
      setViewerOpen(false);
    } finally {
      setViewerLoading(false);
    }
  };

  const submitCustomRequest = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formEmail.trim() || !formEmail.includes("@")) {
      toast("warning", t("formEmailInvalid"));
      return;
    }
    setFormSubmitting(true);
    setTimeout(() => {
      toast("success", t("formSuccess"));
      setFormCompany("");
      setFormEmail("");
      setFormIndustry("");
      setFormPeriodPref("both");
      setFormNotes("");
      setFormSubmitting(false);
    }, 600);
  };

  const periodTabs: { value: PeriodFilter; label: string }[] = [
    { value: "all", label: t("filterAll") },
    { value: "monthly", label: t("filterMonthly") },
    { value: "quarterly", label: t("filterQuarterly") },
  ];

  const verticalTabs: { value: VerticalFilter; label: string }[] = [
    { value: "all", label: t("verticalAll") },
    { value: "fashion", label: t("verticalFashion") },
    { value: "auto", label: t("verticalAuto") },
    { value: "fb", label: t("verticalFb") },
  ];

  const industryOptions: { value: string; label: string }[] = [
    { value: "", label: t("formIndustryPlaceholder") },
    { value: "fashion", label: t("verticalFashion") },
    { value: "auto", label: t("verticalAuto") },
    { value: "fb", label: t("verticalFb") },
    { value: "tech", label: t("formIndustryTech") },
    { value: "finance", label: t("formIndustryFinance") },
    { value: "other", label: t("formIndustryOther") },
  ];

  return (
    <HomeLandingDayNight>
      <div className="tkad-landing-neon tkad-planner-neon">
        <section className="tkad-home-hero tkad-neon-surface relative overflow-hidden bg-gray-50 text-gray-900 dark:bg-[#05050a] dark:text-white">
          <div aria-hidden className="absolute inset-0 tkad-neon-depth" />
          <div
            aria-hidden
            className="absolute inset-0 opacity-20 tkad-neon-grid"
          />
          <div
            aria-hidden
            className="absolute inset-0 tkad-hero-noise opacity-[0.07] mix-blend-overlay"
          />
          <div
            aria-hidden
            className="absolute inset-0 bg-[linear-gradient(to_bottom,rgba(0,0,0,0.14),rgba(0,0,0,0.58),rgba(0,0,0,0.92))]"
          />

          <div className="relative mx-auto max-w-7xl px-4 pb-24 pt-24 text-center sm:px-6 sm:pb-32 sm:pt-32 lg:px-8 lg:pb-44 lg:pt-40">
            <p className="font-display text-xs font-medium uppercase tracking-[0.22em] dark:text-white text-gray-500">
              {`// 09 / Insights`}
            </p>
            <div className="mt-4 inline-flex flex-wrap items-center justify-center gap-2">
              <span className="tkad-neon-border rounded-2xl dark:bg-white/5 bg-gray-50 px-3 py-1 font-display text-[10px] font-black uppercase tracking-[0.22em] dark:text-white text-gray-700 backdrop-blur">
                {t("filterMonthly")} · {t("filterQuarterly")}
              </span>
              <span className="tkad-neon-border rounded-2xl dark:bg-white/5 bg-gray-50 px-3 py-1 font-display text-[10px] font-black uppercase tracking-[0.22em] dark:text-white text-gray-700 backdrop-blur">
                <span className="tkad-home-accent-text">OOH</span>
              </span>
              <span className="tkad-neon-border rounded-2xl dark:bg-white/5 bg-gray-50 px-3 py-1 font-display text-[10px] font-black uppercase tracking-[0.22em] dark:text-white text-gray-700 backdrop-blur">
                <span className="tkad-home-accent-text">BETA</span>
              </span>
            </div>
            <h1 className="mt-6 text-balance text-[clamp(44px,5.8vw,76px)] font-[950] leading-[0.92] tracking-[-0.065em] dark:text-white text-gray-900 [text-shadow:0_30px_160px_rgba(0,0,0,0.9)]">
              {t("heroTitle")}
            </h1>
            <p className="mx-auto mt-6 max-w-2xl text-base leading-relaxed dark:text-white text-gray-800 sm:text-lg">
              {t("heroSubtitle")}
            </p>
          </div>
        </section>

        <section className="bg-card py-10 text-foreground">
          <div className="mx-auto grid max-w-7xl gap-0 px-4 sm:grid-cols-3 sm:px-6 lg:px-8">
            <a
              href="#reports"
              className="group -ml-[2px] flex gap-4 border-2 border-border bg-muted p-5 transition-colors hover:bg-foreground hover:text-background"
            >
              <div className="flex h-12 w-12 shrink-0 items-center justify-center border-2 border-border bg-primary text-primary-foreground">
                <CalendarRange className="h-6 w-6" />
              </div>
              <div className="text-left">
                <p className="font-bold tracking-normal text-foreground">
                  {t("valueStripTrends")}
                </p>
                <p className="mt-1 text-[11px] tracking-normal opacity-75">
                  {`// `}
                  {t("valueStripTrendsDesc")}
                </p>
              </div>
            </a>
            <a
              href="#reports"
              className="group -ml-[2px] flex gap-4 border-2 border-border bg-muted p-5 transition-colors hover:bg-foreground hover:text-background"
            >
              <div className="flex h-12 w-12 shrink-0 items-center justify-center border-2 border-border bg-primary text-primary-foreground">
                <Download className="h-6 w-6" />
              </div>
              <div className="text-left">
                <p className="font-bold tracking-normal text-foreground">
                  {t("valueStripPdf")}
                </p>
                <p className="mt-1 text-[11px] tracking-normal opacity-75">
                  {`// `}
                  {t("valueStripPdfDesc")}
                </p>
              </div>
            </a>
            <a
              href="#custom-report"
              className="group -ml-[2px] flex gap-4 border-2 border-border bg-muted p-5 transition-colors hover:bg-foreground hover:text-background"
            >
              <div className="flex h-12 w-12 shrink-0 items-center justify-center border-2 border-border bg-primary text-primary-foreground">
                <Send className="h-6 w-6" />
              </div>
              <div className="text-left">
                <p className="font-bold tracking-normal text-foreground">
                  {t("valueStripCustom")}
                </p>
                <p className="mt-1 text-[11px] tracking-normal opacity-75">
                  {`// `}
                  {t("valueStripCustomDesc")}
                </p>
              </div>
            </a>
          </div>
        </section>

        <section className="bg-muted pb-0 pt-16 text-foreground sm:pt-20">
          <div className="mx-auto max-w-7xl space-y-8 px-4 sm:px-6 lg:px-8">
            <div id="reports" className="scroll-mt-24 space-y-2">
              <p className="font-display text-xs font-medium uppercase tracking-[0.22em] text-primary">
                [ REPORTS ]
              </p>
              <h2 className="text-2xl font-bold tracking-normal text-foreground sm:text-3xl">
                {t("reportsSectionTitle")}
              </h2>
              <p className="max-w-2xl text-[12px] leading-relaxed tracking-normal text-muted-foreground">
                {`// `}
                {t("reportsSectionDesc")}
              </p>
            </div>

            {!hasLibrary ? (
              <div className="border-2 border-border bg-card py-12 text-center">
                <p className="font-display text-xs font-medium uppercase tracking-[0.22em] text-primary">
                  [ PREPARING ]
                </p>
                <p className="mt-3 text-base font-bold text-foreground">
                  {t("preparingContent")}
                </p>
                <p className="mx-auto mt-3 max-w-md text-[12px] tracking-normal text-muted-foreground">
                  {t("preparingContentDesc")}
                </p>
              </div>
            ) : (
              <>
                <div className="space-y-3">
                  <p className={labelCls}>[ {t("periodLabel")} ]</p>
                  <div className="flex flex-wrap gap-0">
                    {periodTabs.map((tab) => (
                      <button
                        key={tab.value}
                        type="button"
                        onClick={() => setPeriod(tab.value)}
                        className={cn(
                          "-mt-[2px] -ml-[2px] inline-flex items-center gap-1.5 border-2 px-3 py-2 font-display text-xs font-medium uppercase tracking-[0.18em] transition-colors",
                          period === tab.value
                            ? "border-primary bg-primary text-primary-foreground"
                            : "border-border bg-card text-foreground hover:bg-muted",
                        )}
                      >
                        <CalendarRange className="h-3.5 w-3.5" />
                        {tab.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-3">
                  <p className={labelCls}>[ {t("verticalLabel")} ]</p>
                  <div className="flex flex-wrap gap-0">
                    {verticalTabs.map((tab) => (
                      <button
                        key={tab.value}
                        type="button"
                        onClick={() => setVertical(tab.value)}
                        className={cn(
                          "-mt-[2px] -ml-[2px] inline-flex items-center gap-1.5 border-2 px-3 py-2 font-display text-xs font-medium uppercase tracking-[0.18em] transition-colors",
                          vertical === tab.value
                            ? "border-primary bg-primary text-primary-foreground"
                            : "border-border bg-card text-foreground hover:bg-muted",
                        )}
                      >
                        {tab.label}
                      </button>
                    ))}
                  </div>
                </div>

                <p className="font-display text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">
                  {`// `}
                  {t("resultsCount", { count: filtered.length })}
                </p>

                <div className="grid gap-0 md:grid-cols-2">
                  {filtered.map((report) => (
                    <ReportCard
                      key={report.id}
                      report={report}
                      isKo={isKo}
                      downloading={downloadingId === report.id}
                      onDownload={() => handleDownload(report)}
                      onView={() => handleViewOnline(report)}
                    />
                  ))}
                </div>

                {filtered.length === 0 ? (
                  <p className="py-8 text-center text-[12px] tracking-normal text-muted-foreground">
                    {`// `}
                    {t("empty")}
                  </p>
                ) : null}
              </>
            )}

            <div
              className="scroll-mt-24 border-2 border-border bg-card"
              id="custom-report"
            >
              <div className="border-b-2 border-border p-5">
                <div className="flex items-start gap-3">
                  <div className="flex h-11 w-11 items-center justify-center border-2 border-border bg-primary text-primary-foreground">
                    <Send className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="font-display text-xs font-medium uppercase tracking-[0.22em] text-primary">
                      [ {t("customSectionEyebrow")} ]
                    </p>
                    <h3 className="mt-2 text-lg font-bold tracking-normal text-foreground">
                      {t("formTitle")}
                    </h3>
                    <p className="mt-1 text-[12px] tracking-normal text-muted-foreground">
                      {`// `}
                      {t("formDesc")}
                    </p>
                  </div>
                </div>
              </div>
              <div className="p-5">
                <form
                  className="grid gap-4 sm:grid-cols-2"
                  onSubmit={submitCustomRequest}
                >
                  <div className="sm:col-span-1">
                    <label className={labelCls} htmlFor="ins-company">
                      [ {t("formCompany")} ]
                    </label>
                    <input
                      id="ins-company"
                      value={formCompany}
                      onChange={(e) => setFormCompany(e.target.value)}
                      className={cn(inputCls, "mt-2")}
                      placeholder={t("formCompanyPh")}
                    />
                  </div>
                  <div className="sm:col-span-1">
                    <label className={labelCls} htmlFor="ins-email">
                      [ {t("formEmail")} ]{" "}
                      <span className="text-primary">*</span>
                    </label>
                    <input
                      id="ins-email"
                      type="email"
                      required
                      value={formEmail}
                      onChange={(e) => setFormEmail(e.target.value)}
                      className={cn(inputCls, "mt-2")}
                      placeholder="name@company.com"
                    />
                  </div>
                  <div className="sm:col-span-1">
                    <label className={labelCls} htmlFor="ins-industry">
                      [ {t("formIndustry")} ]
                    </label>
                    <select
                      id="ins-industry"
                      className={cn(inputCls, "mt-2")}
                      value={formIndustry}
                      onChange={(e) => setFormIndustry(e.target.value)}
                    >
                      {industryOptions.map((o) => (
                        <option key={o.value || "empty"} value={o.value}>
                          {o.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="sm:col-span-1">
                    <label className={labelCls} htmlFor="ins-pref">
                      [ {t("formPeriodPref")} ]
                    </label>
                    <select
                      id="ins-pref"
                      className={cn(inputCls, "mt-2")}
                      value={formPeriodPref}
                      onChange={(e) =>
                        setFormPeriodPref(
                          e.target.value as "monthly" | "quarterly" | "both",
                        )
                      }
                    >
                      <option value="monthly">{t("filterMonthly")}</option>
                      <option value="quarterly">{t("filterQuarterly")}</option>
                      <option value="both">{t("formPeriodBoth")}</option>
                    </select>
                  </div>
                  <div className="sm:col-span-2">
                    <label className={labelCls} htmlFor="ins-notes">
                      [ {t("formNotes")} ]
                    </label>
                    <textarea
                      id="ins-notes"
                      value={formNotes}
                      onChange={(e) => setFormNotes(e.target.value)}
                      className={cn(textareaCls, "mt-2")}
                      placeholder={t("formNotesPh")}
                    />
                  </div>
                  <div className="sm:col-span-2 flex flex-wrap gap-2">
                    <BtnBlock
                      type="submit"
                      variant="dark"
                      size="md"
                      disabled={formSubmitting}
                    >
                      {formSubmitting ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Mail className="h-4 w-4" />
                      )}
                      {t("formSubmit")}
                    </BtnBlock>
                    <BtnBlock href="/contact" variant="secondary" size="md">
                      {t("formContactInstead")}
                    </BtnBlock>
                  </div>
                </form>
              </div>
            </div>
          </div>
        </section>

        <Modal
          open={viewerOpen}
          onClose={closeViewer}
          className="max-w-5xl"
          ariaLabel={t("viewerTitle")}
          ariaLabelledBy="insights-viewer-title"
        >
          <div className="border-2 border-border bg-card p-6 pt-12">
            <p className="font-display text-xs font-medium uppercase tracking-[0.22em] text-primary">
              [ VIEWER ]
            </p>
            <h2
              id="insights-viewer-title"
              className="mt-2 pr-8 text-lg font-bold tracking-normal text-foreground"
            >
              {viewerTitle}
            </h2>
            <p className="mt-1 text-[11px] tracking-normal text-muted-foreground">
              {`// `}
              {t("viewerHint")}
            </p>
            <div className="mt-4 min-h-[60vh] overflow-hidden border-2 border-border bg-muted">
              {viewerLoading ? (
                <div className="flex min-h-[60vh] items-center justify-center gap-2 font-display text-[12px] uppercase tracking-[0.18em] text-muted-foreground">
                  <Loader2 className="h-6 w-6 animate-spin text-primary" />
                  {`// `}
                  {t("viewerLoading")}
                </div>
              ) : viewerUrl ? (
                <iframe
                  title={viewerTitle}
                  src={viewerUrl}
                  className="h-[70vh] w-full min-h-[320px] border-0"
                />
              ) : null}
            </div>
          </div>
        </Modal>
      </div>
    </HomeLandingDayNight>
  );
}

function ReportCard({
  report,
  isKo,
  downloading,
  onDownload,
  onView,
}: {
  report: InsightReport;
  isKo: boolean;
  downloading: boolean;
  onDownload: () => void;
  onView: () => void;
}) {
  const t = useTranslations("insights");
  const periodBadge =
    report.period === "monthly" ? t("badgeMonthly") : t("badgeQuarterly");
  const tags = report.verticalTags.filter(
    (x) => x !== "general",
  ) as InsightVerticalTag[];

  return (
    <article className="-mt-[2px] -ml-[2px] flex flex-col border-2 border-border bg-card">
      <header className="border-b-2 border-border p-5">
        <div className="flex flex-wrap items-center gap-1">
          <span className="border-2 border-border bg-hero-void px-2 py-0.5 font-display text-xs font-medium uppercase tracking-[0.18em] text-hero-fg">
            [ {periodBadge} ]
          </span>
          <span className="border-2 border-border bg-card px-2 py-0.5 font-display text-xs font-medium uppercase tracking-[0.18em] text-foreground">
            {isKo ? report.labelKo : report.labelEn}
          </span>
          {tags.map((tag) => (
            <span
              key={tag}
              className="border-2 border-primary bg-primary px-2 py-0.5 font-display text-xs font-medium uppercase tracking-[0.18em] text-primary-foreground"
            >
              {tag === "fashion"
                ? t("verticalFashion")
                : tag === "auto"
                  ? t("verticalAuto")
                  : t("verticalFb")}
            </span>
          ))}
        </div>
        <h3 className="mt-3 text-lg font-bold tracking-normal text-foreground">
          {isKo ? report.titleKo : report.titleEn}
        </h3>
        <p className="mt-2 flex items-center gap-1.5 font-display text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">
          <FileText className="h-3.5 w-3.5" />
          {report.publishedIso}
        </p>
      </header>
      <div className="mt-auto flex flex-1 flex-col gap-4 p-5">
        <ul className="space-y-2 text-sm text-foreground">
          {(isKo ? report.summaryKo : report.summaryEn).map((line, i) => (
            <li key={i} className="flex gap-2 leading-relaxed">
              <BarChart3 className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
              <span>{line}</span>
            </li>
          ))}
        </ul>

        <div className="border-2 border-border bg-muted p-3 text-xs">
          <p className="flex items-center gap-1.5 font-display text-xs font-medium uppercase tracking-[0.22em] text-primary">
            <MonitorPlay className="h-3.5 w-3.5" />[ {t("previewDooh")} ]
          </p>
          <p className="mt-2 leading-relaxed text-foreground">
            {(isKo ? report.doohKo : report.doohEn)[0]}
          </p>
        </div>

        <div className="border-2 border-border bg-muted p-3 text-xs">
          <p className="flex items-center gap-1.5 font-display text-xs font-medium uppercase tracking-[0.22em] text-primary">
            <BookOpen className="h-3.5 w-3.5" />[ {t("previewVertical")} ]
          </p>
          <p className="mt-2 font-bold text-foreground">
            {isKo
              ? report.verticalBlocks[0]?.labelKo
              : report.verticalBlocks[0]?.labelEn}
          </p>
          <p className="mt-1 text-foreground/75">
            {
              (isKo
                ? report.verticalBlocks[0]?.bulletsKo
                : report.verticalBlocks[0]?.bulletsEn)?.[0]
            }
          </p>
        </div>

        <div className="flex flex-col gap-2 sm:flex-row">
          <BtnBlock
            variant="accent"
            size="md"
            onClick={onDownload}
            disabled={downloading}
            className="flex-1"
          >
            {downloading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Download className="h-4 w-4" />
            )}
            {t("downloadPdf")}
          </BtnBlock>
          {report.slug ? (
            <BtnBlock
              href={`/insights/${report.slug}`}
              variant="secondary"
              size="md"
              className="flex-1"
            >
              <BookOpen className="h-4 w-4" />
              {t("viewOnline")}
            </BtnBlock>
          ) : (
            <BtnBlock
              variant="secondary"
              size="md"
              onClick={onView}
              className="flex-1"
            >
              <BookOpen className="h-4 w-4" />
              {t("viewOnline")}
            </BtnBlock>
          )}
        </div>
      </div>
    </article>
  );
}
