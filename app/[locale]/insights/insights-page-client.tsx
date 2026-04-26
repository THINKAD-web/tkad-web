"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useTranslations, useLocale } from "next-intl";
import { Link } from "@/i18n/navigation";
import { BtnBlock } from "@/components/brutalist";
import Modal from "@/components/ui/modal";

const inputCls =
  "h-10 w-full border-2 border-bx-black bg-bx-white px-3 font-mono text-sm text-bx-black placeholder:text-bx-gray-dim focus:border-bx-accent focus:outline-none";
const textareaCls =
  "min-h-[100px] w-full border-2 border-bx-black bg-bx-white px-3 py-2 font-mono text-sm text-bx-black placeholder:text-bx-gray-dim focus:border-bx-accent focus:outline-none";
const labelCls =
  "block font-mono text-[10px] font-bold uppercase tracking-[0.22em] text-bx-accent";
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
  const [formPeriodPref, setFormPeriodPref] = useState<"monthly" | "quarterly" | "both">(
    "both",
  );
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
    <>
      <section className="bg-bx-black py-24">
        <div className="mx-auto max-w-7xl px-4 text-center sm:px-6 lg:px-8">
          <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-bx-accent">
            {`// 09 / Insights`}
          </p>
          <div className="mt-3 inline-flex flex-wrap items-center justify-center gap-2">
            <span className="border-2 border-bx-white bg-transparent px-2 py-0.5 font-mono text-[10px] font-bold uppercase tracking-[0.22em] text-bx-white">
              {t("filterMonthly")} · {t("filterQuarterly")}
            </span>
            <span className="border-2 border-bx-accent bg-bx-accent px-2 py-0.5 font-mono text-[10px] font-bold uppercase tracking-[0.22em] text-bx-white">
              OOH
            </span>
            <span className="border-2 border-bx-white bg-bx-white px-2 py-0.5 font-mono text-[10px] font-bold uppercase tracking-[0.22em] text-bx-black">
              BETA
            </span>
          </div>
          <h1 className="mt-4 text-3xl font-bold tracking-tight text-bx-white sm:text-5xl lg:text-6xl">
            {t("heroTitle")}
          </h1>
          <p className="mx-auto mt-5 max-w-2xl font-mono text-[12px] tracking-tight text-bx-white/75 sm:text-sm">
            {t("heroSubtitle")}
          </p>
        </div>
      </section>

      <section className="bg-bx-white py-10">
        <div className="mx-auto grid max-w-7xl gap-0 px-4 sm:grid-cols-3 sm:px-6 lg:px-8">
          <a
            href="#reports"
            className="group -ml-[2px] flex gap-4 border-2 border-bx-black bg-bx-off p-5 transition-colors hover:bg-bx-black hover:text-bx-white"
          >
            <div className="flex h-12 w-12 shrink-0 items-center justify-center border-2 border-bx-black bg-bx-accent text-bx-white">
              <CalendarRange className="h-6 w-6" />
            </div>
            <div className="text-left">
              <p className="font-bold tracking-tight">{t("valueStripTrends")}</p>
              <p className="mt-1 font-mono text-[11px] tracking-tight opacity-75">
                {`// `}{t("valueStripTrendsDesc")}
              </p>
            </div>
          </a>
          <a
            href="#reports"
            className="group -ml-[2px] flex gap-4 border-2 border-bx-black bg-bx-off p-5 transition-colors hover:bg-bx-black hover:text-bx-white"
          >
            <div className="flex h-12 w-12 shrink-0 items-center justify-center border-2 border-bx-black bg-bx-accent text-bx-white">
              <Download className="h-6 w-6" />
            </div>
            <div className="text-left">
              <p className="font-bold tracking-tight">{t("valueStripPdf")}</p>
              <p className="mt-1 font-mono text-[11px] tracking-tight opacity-75">
                {`// `}{t("valueStripPdfDesc")}
              </p>
            </div>
          </a>
          <a
            href="#custom-report"
            className="group -ml-[2px] flex gap-4 border-2 border-bx-black bg-bx-off p-5 transition-colors hover:bg-bx-black hover:text-bx-white"
          >
            <div className="flex h-12 w-12 shrink-0 items-center justify-center border-2 border-bx-black bg-bx-accent text-bx-white">
              <Send className="h-6 w-6" />
            </div>
            <div className="text-left">
              <p className="font-bold tracking-tight">{t("valueStripCustom")}</p>
              <p className="mt-1 font-mono text-[11px] tracking-tight opacity-75">
                {`// `}{t("valueStripCustomDesc")}
              </p>
            </div>
          </a>
        </div>
      </section>

      <section className="bg-bx-off py-16 sm:py-20">
        <div className="mx-auto max-w-7xl space-y-8 px-4 sm:px-6 lg:px-8">
          <div id="reports" className="scroll-mt-24 space-y-2">
            <p className="font-mono text-[10px] font-bold uppercase tracking-[0.22em] text-bx-accent">
              [ REPORTS ]
            </p>
            <h2 className="text-2xl font-bold tracking-tight text-bx-black sm:text-3xl">
              {t("reportsSectionTitle")}
            </h2>
            <p className="max-w-2xl font-mono text-[12px] leading-relaxed tracking-tight text-bx-gray-dim">
              {`// `}{t("reportsSectionDesc")}
            </p>
          </div>

          {!hasLibrary ? (
            <div className="border-2 border-bx-black bg-bx-white py-12 text-center">
              <p className="font-mono text-[10px] font-bold uppercase tracking-[0.22em] text-bx-accent">
                [ PREPARING ]
              </p>
              <p className="mt-3 text-base font-bold text-bx-black">{t("preparingContent")}</p>
              <p className="mx-auto mt-3 max-w-md font-mono text-[12px] tracking-tight text-bx-gray-dim">
                {t("preparingContentDesc")}
              </p>
            </div>
          ) : (
            <>
              <div className="space-y-3">
                <p className={labelCls}>
                  [ {t("periodLabel")} ]
                </p>
                <div className="flex flex-wrap gap-0">
                  {periodTabs.map((tab) => (
                    <button
                      key={tab.value}
                      type="button"
                      onClick={() => setPeriod(tab.value)}
                      className={cn(
                        "-mt-[2px] -ml-[2px] inline-flex items-center gap-1.5 border-2 px-3 py-2 font-mono text-[11px] font-bold uppercase tracking-[0.18em] transition-colors",
                        period === tab.value
                          ? "border-bx-accent bg-bx-accent text-bx-white"
                          : "border-bx-black bg-bx-white text-bx-black hover:bg-bx-off",
                      )}
                    >
                      <CalendarRange className="h-3.5 w-3.5" />
                      {tab.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-3">
                <p className={labelCls}>
                  [ {t("verticalLabel")} ]
                </p>
                <div className="flex flex-wrap gap-0">
                  {verticalTabs.map((tab) => (
                    <button
                      key={tab.value}
                      type="button"
                      onClick={() => setVertical(tab.value)}
                      className={cn(
                        "-mt-[2px] -ml-[2px] inline-flex items-center gap-1.5 border-2 px-3 py-2 font-mono text-[11px] font-bold uppercase tracking-[0.18em] transition-colors",
                        vertical === tab.value
                          ? "border-bx-accent bg-bx-accent text-bx-white"
                          : "border-bx-black bg-bx-white text-bx-black hover:bg-bx-off",
                      )}
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>
              </div>

              <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-bx-gray-dim">
                {`// `}{t("resultsCount", { count: filtered.length })}
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
                <p className="py-8 text-center font-mono text-[12px] tracking-tight text-bx-gray-dim">
                  {`// `}{t("empty")}
                </p>
              ) : null}
            </>
          )}

          <div
            className="scroll-mt-24 border-2 border-bx-black bg-bx-white"
            id="custom-report"
          >
            <div className="border-b-2 border-bx-black p-5">
              <div className="flex items-start gap-3">
                <div className="flex h-11 w-11 items-center justify-center border-2 border-bx-black bg-bx-accent text-bx-white">
                  <Send className="h-5 w-5" />
                </div>
                <div>
                  <p className="font-mono text-[10px] font-bold uppercase tracking-[0.22em] text-bx-accent">
                    [ {t("customSectionEyebrow")} ]
                  </p>
                  <h3 className="mt-2 text-lg font-bold tracking-tight text-bx-black">
                    {t("formTitle")}
                  </h3>
                  <p className="mt-1 font-mono text-[12px] tracking-tight text-bx-gray-dim">
                    {`// `}{t("formDesc")}
                  </p>
                </div>
              </div>
            </div>
            <div className="p-5">
              <form className="grid gap-4 sm:grid-cols-2" onSubmit={submitCustomRequest}>
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
                    [ {t("formEmail")} ] <span className="text-bx-accent">*</span>
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
                      setFormPeriodPref(e.target.value as "monthly" | "quarterly" | "both")
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
        <div className="border-2 border-bx-black bg-bx-white p-6 pt-12">
          <p className="font-mono text-[10px] font-bold uppercase tracking-[0.22em] text-bx-accent">
            [ VIEWER ]
          </p>
          <h2 id="insights-viewer-title" className="mt-2 pr-8 text-lg font-bold tracking-tight text-bx-black">
            {viewerTitle}
          </h2>
          <p className="mt-1 font-mono text-[11px] tracking-tight text-bx-gray-dim">
            {`// `}{t("viewerHint")}
          </p>
          <div className="mt-4 min-h-[60vh] overflow-hidden border-2 border-bx-black bg-bx-off">
            {viewerLoading ? (
              <div className="flex min-h-[60vh] items-center justify-center gap-2 font-mono text-[12px] uppercase tracking-[0.18em] text-bx-gray-dim">
                <Loader2 className="h-6 w-6 animate-spin text-bx-accent" />
                {`// `}{t("viewerLoading")}
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
    </>
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
  const tags = report.verticalTags.filter((x) => x !== "general") as InsightVerticalTag[];

  return (
    <article className="-mt-[2px] -ml-[2px] flex flex-col border-2 border-bx-black bg-bx-white">
      <header className="border-b-2 border-bx-black p-5">
        <div className="flex flex-wrap items-center gap-1">
          <span className="border-2 border-bx-black bg-bx-black px-2 py-0.5 font-mono text-[10px] font-bold uppercase tracking-[0.18em] text-bx-white">
            [ {periodBadge} ]
          </span>
          <span className="border-2 border-bx-black bg-bx-white px-2 py-0.5 font-mono text-[10px] font-bold uppercase tracking-[0.18em] text-bx-black">
            {isKo ? report.labelKo : report.labelEn}
          </span>
          {tags.map((tag) => (
            <span
              key={tag}
              className="border-2 border-bx-accent bg-bx-accent px-2 py-0.5 font-mono text-[10px] font-bold uppercase tracking-[0.18em] text-bx-white"
            >
              {tag === "fashion"
                ? t("verticalFashion")
                : tag === "auto"
                  ? t("verticalAuto")
                  : t("verticalFb")}
            </span>
          ))}
        </div>
        <h3 className="mt-3 text-lg font-bold tracking-tight text-bx-black">
          {isKo ? report.titleKo : report.titleEn}
        </h3>
        <p className="mt-2 flex items-center gap-1.5 font-mono text-[11px] uppercase tracking-[0.18em] text-bx-gray-dim">
          <FileText className="h-3.5 w-3.5" />
          {report.publishedIso}
        </p>
      </header>
      <div className="mt-auto flex flex-1 flex-col gap-4 p-5">
        <ul className="space-y-2 text-sm text-bx-black">
          {(isKo ? report.summaryKo : report.summaryEn).map((line, i) => (
            <li key={i} className="flex gap-2 leading-relaxed">
              <BarChart3 className="mt-0.5 h-4 w-4 shrink-0 text-bx-accent" />
              <span>{line}</span>
            </li>
          ))}
        </ul>

        <div className="border-2 border-bx-black bg-bx-off p-3 text-xs">
          <p className="flex items-center gap-1.5 font-mono text-[10px] font-bold uppercase tracking-[0.22em] text-bx-accent">
            <MonitorPlay className="h-3.5 w-3.5" />
            [ {t("previewDooh")} ]
          </p>
          <p className="mt-2 leading-relaxed text-bx-black">
            {(isKo ? report.doohKo : report.doohEn)[0]}
          </p>
        </div>

        <div className="border-2 border-bx-black bg-bx-off p-3 text-xs">
          <p className="flex items-center gap-1.5 font-mono text-[10px] font-bold uppercase tracking-[0.22em] text-bx-accent">
            <BookOpen className="h-3.5 w-3.5" />
            [ {t("previewVertical")} ]
          </p>
          <p className="mt-2 font-bold text-bx-black">
            {isKo ? report.verticalBlocks[0]?.labelKo : report.verticalBlocks[0]?.labelEn}
          </p>
          <p className="mt-1 text-bx-black/75">
            {(isKo ? report.verticalBlocks[0]?.bulletsKo : report.verticalBlocks[0]?.bulletsEn)?.[0]}
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
