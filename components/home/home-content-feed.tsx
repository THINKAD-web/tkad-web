import Image from "next/image";
import { Link } from "@/i18n/navigation";
import {
  getLatestPublishedSuccessCases,
  getPublishedInsightReports,
} from "@/lib/public-content-queries";
import type { InsightReport } from "@/lib/insights-reports";
import type { PublicSuccessCaseListItem } from "@/lib/success-case-public";
import { cn } from "@/lib/utils";

const REPORT_GRADIENTS = [
  "from-violet-600 to-cyan-500",
  "from-indigo-600 to-purple-700",
  "from-pink-600 to-violet-600",
  "from-gray-700 to-gray-900",
  "from-cyan-600 to-blue-700",
  "from-amber-600 to-orange-600",
];

function formatDate(iso: string, isKo: boolean) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return isKo
    ? `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, "0")}.${String(d.getDate()).padStart(2, "0")}`
    : d.toLocaleDateString("en-US", {
        year: "numeric",
        month: "short",
        day: "numeric",
      });
}

function reportHref(report: InsightReport) {
  return report.slug ? `/report/${report.slug}` : "/report";
}

function TrendCard({
  report,
  locale,
  gradient,
}: {
  report: InsightReport;
  locale: string;
  gradient: string;
}) {
  const isKo = locale.startsWith("ko");
  const title = isKo ? report.titleKo : report.titleEn;
  const date = formatDate(report.publishedIso, isKo);

  return (
    <Link
      href={reportHref(report)}
      className={cn(
        "group w-56 shrink-0 snap-start md:w-auto",
        "md:min-w-0",
      )}
    >
      <div
        className={cn(
          "relative h-32 overflow-hidden rounded-xl bg-gradient-to-br",
          gradient,
        )}
      >
        <div className="absolute inset-0 bg-black/10 transition group-hover:bg-black/5" />
        <p className="absolute bottom-3 left-3 right-3 line-clamp-2 text-sm font-semibold text-white">
          {title}
        </p>
      </div>
      <p className="mt-2 line-clamp-2 text-sm font-medium text-gray-900 dark:text-white">
        {title}
      </p>
      {date ? (
        <p className="mt-1 text-xs text-gray-400 dark:text-white/45">{date}</p>
      ) : null}
    </Link>
  );
}

function CaseCard({
  item,
  locale,
}: {
  item: PublicSuccessCaseListItem;
  locale: string;
}) {
  const isKo = locale.startsWith("ko");
  const title = isKo ? item.titleKo : item.titleEn || item.titleKo;
  const highlight = item.highlightMetrics[0];
  const metricText = highlight
    ? isKo
      ? `${highlight.valueKo}${highlight.labelKo ? ` ${highlight.labelKo}` : ""}`
      : `${highlight.valueEn?.trim() || highlight.valueKo}${highlight.labelEn ? ` ${highlight.labelEn}` : ""}`
    : null;

  return (
    <Link
      href={`/cases/${item.id}`}
      className="group w-48 shrink-0 snap-start md:w-auto"
    >
      <div className="relative h-28 overflow-hidden rounded-xl bg-gray-100 dark:bg-white/5">
        {item.thumbnailUrl ? (
          <Image
            src={item.thumbnailUrl}
            alt={title}
            fill
            className="object-cover transition-transform group-hover:scale-105"
            sizes="(max-width: 768px) 192px, 240px"
          />
        ) : (
          <div className="flex h-full items-center justify-center bg-gradient-to-br from-violet-600/20 to-cyan-500/20 text-xs text-gray-400">
            {isKo ? "성공 사례" : "Case study"}
          </div>
        )}
        <span className="absolute left-2 top-2 rounded-md bg-black/40 px-2 py-0.5 text-[10px] font-semibold text-white backdrop-blur-sm">
          {item.industry}
        </span>
      </div>
      <p className="mt-2 line-clamp-2 text-sm font-medium text-gray-900 dark:text-white">
        {title}
      </p>
      {metricText ? (
        <p className="mt-1 line-clamp-1 text-xs text-cyan-600 dark:text-cyan-400">
          {metricText}
        </p>
      ) : null}
    </Link>
  );
}

function FeedHeader({
  title,
  viewAllHref,
  viewAllLabel,
}: {
  title: string;
  viewAllHref: string;
  viewAllLabel: string;
}) {
  return (
    <div className="mb-3 flex items-end justify-between gap-3">
      <h2 className="text-base font-bold text-gray-900 dark:text-white">{title}</h2>
      <Link
        href={viewAllHref}
        className="shrink-0 text-xs font-medium text-violet-400 hover:text-violet-300"
      >
        {viewAllLabel} →
      </Link>
    </div>
  );
}

export async function HomeTrendReportsFeed({ locale }: { locale: string }) {
  const isKo = locale.startsWith("ko");
  const reports = (await getPublishedInsightReports()).slice(0, 6);
  if (reports.length === 0) return null;

  return (
    <section
      className="border-b border-gray-100 py-6 dark:border-white/5"
      data-screenshot="home-trend-reports"
    >
      <FeedHeader
        title={isKo ? "트렌드 리포트" : "Trend reports"}
        viewAllHref="/report"
        viewAllLabel={isKo ? "전체보기" : "View all"}
      />
      <div
        className={cn(
          "flex gap-3 overflow-x-auto pb-2 md:grid md:grid-cols-3 md:gap-4 md:overflow-visible md:pb-0",
          "snap-x snap-mandatory [-ms-overflow-style:none] [scrollbar-width:none]",
          "[&::-webkit-scrollbar]:hidden",
        )}
      >
        {reports.map((report, i) => (
          <TrendCard
            key={report.id}
            report={report}
            locale={locale}
            gradient={REPORT_GRADIENTS[i % REPORT_GRADIENTS.length]!}
          />
        ))}
      </div>
    </section>
  );
}

export async function HomeSuccessCasesFeed({ locale }: { locale: string }) {
  const isKo = locale.startsWith("ko");
  const cases = await getLatestPublishedSuccessCases(locale, 6);
  if (cases.length === 0) return null;

  return (
    <section
      className="border-b border-gray-100 py-6 dark:border-white/5"
      data-screenshot="home-success-cases"
    >
      <FeedHeader
        title={isKo ? "성공 사례" : "Success stories"}
        viewAllHref="/cases"
        viewAllLabel={isKo ? "전체보기" : "View all"}
      />
      <div
        className={cn(
          "flex gap-3 overflow-x-auto pb-2 md:grid md:grid-cols-3 md:gap-4 md:overflow-visible md:pb-0",
          "snap-x snap-mandatory [-ms-overflow-style:none] [scrollbar-width:none]",
          "[&::-webkit-scrollbar]:hidden",
        )}
      >
        {cases.map((item) => (
          <CaseCard key={item.id} item={item} locale={locale} />
        ))}
      </div>
    </section>
  );
}
