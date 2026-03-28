"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useTranslations, useLocale } from "next-intl";
import { Link } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import Modal from "@/components/ui/modal";
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

export default function InsightsPage() {
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

  const filtered = useMemo(
    () => filterInsightReports(period, vertical),
    [period, vertical],
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
      <section className="bg-navy py-24 sm:py-28">
        <div className="mx-auto max-w-7xl px-4 text-center sm:px-6 lg:px-8">
          <div className="mb-4 inline-flex flex-wrap items-center justify-center gap-2">
            <Badge className="border-0 bg-white/15 text-xs font-semibold text-gold">
              {t("filterMonthly")} · {t("filterQuarterly")}
            </Badge>
            <Badge className="border-0 bg-emerald-500/25 text-xs font-semibold text-emerald-100">
              OOH
            </Badge>
          </div>
          <h1 className="text-3xl font-bold text-white sm:text-4xl">{t("heroTitle")}</h1>
          <p className="mx-auto mt-3 max-w-2xl text-slate-300">{t("heroSubtitle")}</p>
        </div>
      </section>

      <section className="border-b border-navy/8 bg-white py-10">
        <div className="mx-auto grid max-w-7xl gap-4 px-4 sm:grid-cols-3 sm:px-6 lg:px-8">
          <a
            href="#reports"
            className="group flex gap-4 rounded-2xl border border-navy/10 bg-slate-50/80 p-5 shadow-sm transition-all hover:border-gold/40 hover:shadow-md"
          >
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-navy/10 text-navy group-hover:bg-navy group-hover:text-white">
              <CalendarRange className="h-6 w-6" />
            </div>
            <div className="text-left">
              <p className="font-bold text-navy">{t("valueStripTrends")}</p>
              <p className="mt-1 text-xs text-muted-foreground">{t("valueStripTrendsDesc")}</p>
            </div>
          </a>
          <a
            href="#reports"
            className="group flex gap-4 rounded-2xl border border-navy/10 bg-slate-50/80 p-5 shadow-sm transition-all hover:border-gold/40 hover:shadow-md"
          >
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-gold/20 text-navy group-hover:bg-gold group-hover:text-navy">
              <Download className="h-6 w-6" />
            </div>
            <div className="text-left">
              <p className="font-bold text-navy">{t("valueStripPdf")}</p>
              <p className="mt-1 text-xs text-muted-foreground">{t("valueStripPdfDesc")}</p>
            </div>
          </a>
          <a
            href="#custom-report"
            className="group flex gap-4 rounded-2xl border border-navy/10 bg-slate-50/80 p-5 shadow-sm transition-all hover:border-gold/40 hover:shadow-md"
          >
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-navy/10 text-navy group-hover:bg-navy group-hover:text-white">
              <Send className="h-6 w-6" />
            </div>
            <div className="text-left">
              <p className="font-bold text-navy">{t("valueStripCustom")}</p>
              <p className="mt-1 text-xs text-muted-foreground">{t("valueStripCustomDesc")}</p>
            </div>
          </a>
        </div>
      </section>

      <section className="py-10">
        <div className="mx-auto max-w-7xl space-y-8 px-4 sm:px-6 lg:px-8">
          <div id="reports" className="scroll-mt-24 space-y-2">
            <h2 className="text-xl font-extrabold text-navy sm:text-2xl">{t("reportsSectionTitle")}</h2>
            <p className="max-w-2xl text-sm text-muted-foreground">{t("reportsSectionDesc")}</p>
          </div>

          <div className="space-y-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-navy/45">
              {t("periodLabel")}
            </p>
            <div className="flex flex-wrap gap-2">
              {periodTabs.map((tab) => (
                <Button
                  key={tab.value}
                  type="button"
                  size="sm"
                  variant={period === tab.value ? "default" : "outline"}
                  onClick={() => setPeriod(tab.value)}
                  className={cn(
                    period === tab.value ? "bg-navy text-white" : "border-navy/20 text-navy",
                  )}
                >
                  <CalendarRange className="mr-1.5 h-3.5 w-3.5" />
                  {tab.label}
                </Button>
              ))}
            </div>
          </div>

          <div className="space-y-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-navy/45">
              {t("verticalLabel")}
            </p>
            <div className="flex flex-wrap gap-2">
              {verticalTabs.map((tab) => (
                <Button
                  key={tab.value}
                  type="button"
                  size="sm"
                  variant={vertical === tab.value ? "default" : "outline"}
                  onClick={() => setVertical(tab.value)}
                  className={cn(
                    vertical === tab.value ? "bg-gold text-navy" : "border-navy/20 text-navy",
                  )}
                >
                  {tab.label}
                </Button>
              ))}
            </div>
          </div>

          <p className="text-sm text-muted-foreground">
            {t("resultsCount", { count: filtered.length })}
          </p>

          <div className="grid gap-6 md:grid-cols-2">
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
            <p className="py-8 text-center text-sm text-muted-foreground">{t("empty")}</p>
          ) : null}

          <Card
            className="border-navy/10 shadow-md scroll-mt-24"
            id="custom-report"
          >
            <CardHeader>
              <div className="flex items-start gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gold/15 text-navy">
                  <Send className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-xs font-bold uppercase tracking-wide text-gold-dark">
                    {t("customSectionEyebrow")}
                  </p>
                  <CardTitle className="mt-1 text-navy">{t("formTitle")}</CardTitle>
                  <CardDescription>{t("formDesc")}</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <form className="grid gap-4 sm:grid-cols-2" onSubmit={submitCustomRequest}>
                <div className="sm:col-span-1">
                  <label className="text-xs font-semibold text-navy/70" htmlFor="ins-company">
                    {t("formCompany")}
                  </label>
                  <Input
                    id="ins-company"
                    value={formCompany}
                    onChange={(e) => setFormCompany(e.target.value)}
                    className="mt-1"
                    placeholder={t("formCompanyPh")}
                  />
                </div>
                <div className="sm:col-span-1">
                  <label className="text-xs font-semibold text-navy/70" htmlFor="ins-email">
                    {t("formEmail")} *
                  </label>
                  <Input
                    id="ins-email"
                    type="email"
                    required
                    value={formEmail}
                    onChange={(e) => setFormEmail(e.target.value)}
                    className="mt-1"
                    placeholder="name@company.com"
                  />
                </div>
                <div className="sm:col-span-1">
                  <label className="text-xs font-semibold text-navy/70" htmlFor="ins-industry">
                    {t("formIndustry")}
                  </label>
                  <select
                    id="ins-industry"
                    className="mt-1 flex h-10 w-full rounded-md border border-navy/15 bg-white px-3 text-sm text-navy shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold/40"
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
                  <label className="text-xs font-semibold text-navy/70" htmlFor="ins-pref">
                    {t("formPeriodPref")}
                  </label>
                  <select
                    id="ins-pref"
                    className="mt-1 flex h-10 w-full rounded-md border border-navy/15 bg-white px-3 text-sm text-navy shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold/40"
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
                  <label className="text-xs font-semibold text-navy/70" htmlFor="ins-notes">
                    {t("formNotes")}
                  </label>
                  <Textarea
                    id="ins-notes"
                    value={formNotes}
                    onChange={(e) => setFormNotes(e.target.value)}
                    className="mt-1 min-h-[100px]"
                    placeholder={t("formNotesPh")}
                  />
                </div>
                <div className="sm:col-span-2 flex flex-wrap gap-3">
                  <Button
                    type="submit"
                    className="bg-navy text-white hover:bg-navy/90"
                    disabled={formSubmitting}
                  >
                    {formSubmitting ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <Mail className="mr-2 h-4 w-4" />
                    )}
                    {t("formSubmit")}
                  </Button>
                  <Button type="button" variant="outline" asChild>
                    <Link href="/contact">{t("formContactInstead")}</Link>
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      </section>

      <Modal
        open={viewerOpen}
        onClose={closeViewer}
        className="max-w-5xl"
        ariaLabel={t("viewerTitle")}
        ariaLabelledBy="insights-viewer-title"
      >
        <div className="p-6 pt-12">
          <h2 id="insights-viewer-title" className="pr-8 text-lg font-bold text-navy">
            {viewerTitle}
          </h2>
          <p className="mt-1 text-xs text-muted-foreground">{t("viewerHint")}</p>
          <div className="mt-4 min-h-[60vh] overflow-hidden rounded-xl border border-navy/10 bg-slate-100">
            {viewerLoading ? (
              <div className="flex min-h-[60vh] items-center justify-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-6 w-6 animate-spin text-gold" />
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
    <Card className="flex flex-col border-navy/10 shadow-md transition-shadow hover:shadow-lg">
      <CardHeader className="pb-3">
        <div className="flex flex-wrap items-center gap-2">
          <Badge className="bg-navy/90 text-white">{periodBadge}</Badge>
          <Badge variant="outline" className="border-navy/20 text-xs text-navy/70">
            {isKo ? report.labelKo : report.labelEn}
          </Badge>
          {tags.map((tag) => (
            <Badge key={tag} className="bg-gold/20 text-navy">
              {tag === "fashion"
                ? t("verticalFashion")
                : tag === "auto"
                  ? t("verticalAuto")
                  : t("verticalFb")}
            </Badge>
          ))}
        </div>
        <CardTitle className="text-lg text-navy">
          {isKo ? report.titleKo : report.titleEn}
        </CardTitle>
        <CardDescription className="flex items-center gap-1.5 text-xs">
          <FileText className="h-3.5 w-3.5" />
          {report.publishedIso}
        </CardDescription>
      </CardHeader>
      <CardContent className="mt-auto flex flex-1 flex-col gap-4">
        <ul className="space-y-2 text-sm text-navy/80">
          {(isKo ? report.summaryKo : report.summaryEn).map((line, i) => (
            <li key={i} className="flex gap-2 leading-relaxed">
              <BarChart3 className="mt-0.5 h-4 w-4 shrink-0 text-gold" />
              <span>{line}</span>
            </li>
          ))}
        </ul>

        <div className="rounded-xl border border-navy/8 bg-slate-50/90 p-3 text-xs">
          <p className="mb-2 flex items-center gap-1.5 font-bold text-navy">
            <MonitorPlay className="h-3.5 w-3.5 text-gold-dark" />
            {t("previewDooh")}
          </p>
          <p className="leading-relaxed text-navy/75">
            {(isKo ? report.doohKo : report.doohEn)[0]}
          </p>
        </div>

        <div className="rounded-xl border border-navy/8 bg-navy/[0.03] p-3 text-xs">
          <p className="mb-2 flex items-center gap-1.5 font-bold text-navy">
            <BookOpen className="h-3.5 w-3.5 text-gold-dark" />
            {t("previewVertical")}
          </p>
          <p className="font-medium text-navy">
            {isKo ? report.verticalBlocks[0]?.labelKo : report.verticalBlocks[0]?.labelEn}
          </p>
          <p className="mt-1 text-navy/70">
            {(isKo ? report.verticalBlocks[0]?.bulletsKo : report.verticalBlocks[0]?.bulletsEn)?.[0]}
          </p>
        </div>

        <div className="flex flex-col gap-2 sm:flex-row">
          <Button
            type="button"
            className="flex-1 btn-gold font-bold text-navy hover:bg-gold-dark"
            onClick={onDownload}
            disabled={downloading}
          >
            {downloading ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Download className="mr-2 h-4 w-4" />
            )}
            {t("downloadPdf")}
          </Button>
          <Button
            type="button"
            variant="outline"
            className="flex-1 border-navy/25 font-semibold text-navy"
            onClick={onView}
          >
            <BookOpen className="mr-2 h-4 w-4" />
            {t("viewOnline")}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
