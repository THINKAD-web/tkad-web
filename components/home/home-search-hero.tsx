"use client";

import { usePathname, useRouter } from "@/i18n/navigation";
import { Search } from "lucide-react";
import { useMobileSearch } from "@/components/mobile/mobile-search-context";
import { cn } from "@/lib/utils";

const POPULAR_REGIONS_KO = [
  { label: "강남", query: "강남" },
  { label: "홍대", query: "홍대" },
  { label: "성수", query: "성수" },
  { label: "전국", query: "" },
];

const POPULAR_REGIONS_EN = [
  { label: "Gangnam", query: "Gangnam" },
  { label: "Hongdae", query: "Hongdae" },
  { label: "Seongsu", query: "Seongsu" },
  { label: "All", query: "" },
];

type Props = {
  locale: string;
  className?: string;
};

function isHomePath(pathname: string | null): boolean {
  return pathname === "/" || pathname === "";
}

export function HomeSearchHero({ locale, className }: Props) {
  const isKo = locale.startsWith("ko");
  const pathname = usePathname();
  const { openSearch } = useMobileSearch();
  const router = useRouter();
  const regions = isKo ? POPULAR_REGIONS_KO : POPULAR_REGIONS_EN;
  const showRegionChips = !isHomePath(pathname);

  const handleRegionSelect = (query: string) => {
    if (!query) {
      router.push("/media");
      return;
    }
    router.push(`/media?q=${encodeURIComponent(query)}`);
  };

  return (
    <section
      className={cn(
        "border-b border-gray-200 bg-white dark:border-white/10 dark:bg-gray-950",
        className,
      )}
    >
      <div className="mx-auto w-full max-w-6xl px-4 pb-5 pt-3 sm:px-6">
        <button
          type="button"
          onClick={() => openSearch()}
          className={cn(
            "flex w-full items-center gap-3 rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3.5",
            "text-left transition-colors hover:border-violet-300 hover:bg-gray-100",
            "dark:border-white/10 dark:bg-white/5 dark:hover:border-violet-500/30 dark:hover:bg-white/8",
          )}
          data-tour="search"
        >
          <Search className="h-5 w-5 shrink-0 text-gray-400 dark:text-white/40" />
          <span className="text-sm text-gray-500 dark:text-white/50">
            {isKo ? "매체명·지역·유형 검색" : "Search media, region, type"}
          </span>
        </button>

        {showRegionChips ? (
          <div className="mt-3 flex flex-wrap gap-2">
            {regions.map((region) => (
              <button
                key={region.label}
                type="button"
                onClick={() => handleRegionSelect(region.query)}
                className="rounded-full bg-gray-100 px-3.5 py-1.5 text-xs font-semibold text-gray-700 transition-colors hover:bg-violet-100 hover:text-violet-700 dark:bg-white/10 dark:text-white/80 dark:hover:bg-violet-500/20 dark:hover:text-violet-200"
              >
                {region.label}
              </button>
            ))}
          </div>
        ) : null}
      </div>
    </section>
  );
}
