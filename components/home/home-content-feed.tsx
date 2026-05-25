import Link from "next/link";
import Image from "next/image";
import { ChevronRight } from "lucide-react";
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
              className="flex items-center gap-0.5 text-xs font-medium text-violet-400"
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
                <div className="relative h-28 bg-gray-100 dark:bg-gray-800">
                  {item.thumbnailUrl ? (
                    <Image
                      src={item.thumbnailUrl}
                      alt={item.title}
                      fill
                      className="object-cover"
                      sizes="208px"
                      unoptimized
                    />
                  ) : null}
                  {item.category ? (
                    <span className="absolute top-2 left-2 rounded-full bg-violet-500 px-2 py-0.5 text-[10px] text-white">
                      {item.category}
                    </span>
                  ) : null}
                </div>
                <div className="p-3">
                  <p className="line-clamp-2 text-sm leading-snug font-medium text-gray-900 dark:text-white">
                    {item.title}
                  </p>
                  {item.publishedAt ? (
                    <p className="mt-1 text-xs text-gray-400 dark:text-white/40">
                      {new Date(item.publishedAt).toLocaleDateString("ko-KR")}
                    </p>
                  ) : null}
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
              className="flex items-center gap-0.5 text-xs font-medium text-violet-400"
            >
              전체보기 <ChevronRight className="h-3 w-3" />
            </Link>
          </div>
          <div className="scrollbar-hide flex gap-3 overflow-x-auto px-4 pb-2">
            {cases.map((item) => (
              <Link
                key={item.id}
                href={
                  item.slug ? `/ko/cases/${item.slug}` : `/ko/cases/${item.id}`
                }
                className="w-44 shrink-0 overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm dark:border-white/10 dark:bg-white/5"
              >
                <div className="relative h-24 bg-gray-100 dark:bg-gray-800">
                  {item.thumbnailUrl ? (
                    <Image
                      src={item.thumbnailUrl}
                      alt={item.title || ""}
                      fill
                      className="object-cover"
                      sizes="176px"
                      unoptimized
                    />
                  ) : null}
                  {item.industry ? (
                    <span className="absolute top-2 left-2 rounded-full bg-cyan-500 px-2 py-0.5 text-[10px] text-white">
                      {item.industry}
                    </span>
                  ) : null}
                </div>
                <div className="p-3">
                  <p className="line-clamp-2 text-xs leading-snug font-medium text-gray-900 dark:text-white">
                    {item.title || item.brandName}
                  </p>
                  {item.summary ? (
                    <p className="mt-1 truncate text-[11px] text-cyan-600 dark:text-cyan-400">
                      {item.summary}
                    </p>
                  ) : null}
                </div>
              </Link>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}
