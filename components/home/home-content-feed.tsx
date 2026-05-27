import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { ContentCardGradientThumb } from "@/components/content/content-card-gradient-thumb";
import {
  cleanSummary,
  estimateReadMinutes,
} from "@/lib/content-card-visuals";
import type { HomeReportItem } from "@/lib/report-queries";
import type { HomeCaseItem } from "@/lib/case-queries";

interface Props {
  reports: HomeReportItem[];
  cases: HomeCaseItem[];
}

export function HomeContentFeed({ reports, cases }: Props) {
  return (
    <div className="border-t border-gray-100 dark:border-white/5">
      {reports.length > 0 ? (
        <div className="py-4">
          <div className="mb-3 flex items-center justify-between px-4">
            <h3 className="text-base font-bold text-gray-900 dark:text-white">
              트렌드 리포트
            </h3>
            <Link
              href="/ko/report"
              className="flex items-center gap-0.5 text-xs font-medium tkad-home-accent-text"
            >
              전체보기 <ChevronRight className="h-3 w-3" />
            </Link>
          </div>
          <div className="scrollbar-hide flex gap-3 overflow-x-auto px-4 pb-2">
            {reports.map((item) => (
              <Link
                key={item.id}
                href={
                  item.slug
                    ? `/ko/report/${item.slug}`
                    : `/ko/report/${item.id}`
                }
                className="w-52 shrink-0 overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm dark:border-white/10 dark:bg-white/5"
              >
                <ContentCardGradientThumb
                  thumbnailUrl={item.thumbnailUrl}
                  alt={item.title}
                  category={item.category}
                  heightClass="h-32"
                  badge={
                    item.category ? (
                      <span className="absolute top-2 left-2 rounded-full bg-gradient-to-r from-violet-500 to-cyan-400 px-2 py-0.5 text-[10px] text-white shadow-[0_0_10px_rgba(139,92,246,0.35)]">
                        {item.category}
                      </span>
                    ) : null
                  }
                />
                <div className="p-3">
                  <p className="line-clamp-2 text-sm font-semibold leading-snug text-gray-900 dark:text-white">
                    {item.title}
                  </p>
                  <div className="mt-1.5 flex items-center justify-between gap-2">
                    {item.publishedAt ? (
                      <p className="text-xs text-gray-400 dark:text-white/40">
                        {new Date(item.publishedAt).toLocaleDateString("ko-KR")}
                      </p>
                    ) : (
                      <span />
                    )}
                    <p className="shrink-0 text-xs text-violet-400">
                      {estimateReadMinutes(item.title)}분 읽기
                    </p>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      ) : null}

      {cases.length > 0 ? (
        <div className="border-t border-gray-100 py-4 dark:border-white/5">
          <div className="mb-3 flex items-center justify-between px-4">
            <h3 className="text-base font-bold text-gray-900 dark:text-white">
              성공 사례
            </h3>
            <Link
              href="/ko/cases"
              className="flex items-center gap-0.5 text-xs font-medium tkad-home-accent-text"
            >
              전체보기 <ChevronRight className="h-3 w-3" />
            </Link>
          </div>
          <div className="scrollbar-hide flex gap-3 overflow-x-auto px-4 pb-2">
            {cases.map((item) => {
              const cleanedSummary = item.summary
                ? cleanSummary(item.summary)
                : "";

              return (
                <Link
                  key={item.id}
                  href={
                    item.slug
                      ? `/ko/cases/${item.slug}`
                      : `/ko/cases/${item.id}`
                  }
                  className="w-44 shrink-0 overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm dark:border-white/10 dark:bg-white/5"
                >
                  <ContentCardGradientThumb
                    thumbnailUrl={item.thumbnailUrl}
                    alt={item.title || item.brandName || ""}
                    industry={item.industry}
                    heightClass="h-28"
                    badge={
                      item.industry ? (
                        <span className="absolute top-2 left-2 rounded-full bg-gradient-to-r from-cyan-500 to-cyan-300 px-2 py-0.5 text-[10px] text-white shadow-[0_0_10px_rgba(34,211,238,0.35)]">
                          {item.industry}
                        </span>
                      ) : null
                    }
                  />
                  <div className="p-3">
                    <p className="line-clamp-2 text-sm font-semibold leading-snug text-gray-900 dark:text-white">
                      {item.title || item.brandName}
                    </p>
                    {cleanedSummary ? (
                      <p className="mt-1 line-clamp-1 text-xs text-cyan-500 dark:text-cyan-400">
                        {cleanedSummary}
                      </p>
                    ) : null}
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      ) : null}
    </div>
  );
}
