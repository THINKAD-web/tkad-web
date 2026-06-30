import { ChevronRight } from "lucide-react";
import { Link } from "@/i18n/navigation";
import type { HomeCatalogMediaItem } from "@/lib/media-catalog-types";
import { mediaItemDetailPath } from "@/lib/media-slug";
import { HomeMediaScrollCard } from "@/components/home/home-media-scroll-card";

interface Props {
  title: string;
  media: HomeCatalogMediaItem[];
  locale?: string;
}

export function HomeMediaScroll({
  title,
  media,
  locale = "ko",
}: Props) {
  const isKo = locale.startsWith("ko");

  if (!media || media.length === 0) {
    return (
      <div className="px-4 py-4">
        <Link
          href="/media"
          className="flex items-center justify-center gap-1 rounded-xl border border-dashed border-gray-200 py-3 text-sm font-medium text-gray-600 transition hover:border-violet-300 hover:text-violet-600 dark:border-white/15 dark:text-white/60 dark:hover:border-violet-400/40 dark:hover:text-violet-300"
        >
          {isKo ? "매체 둘러보기" : "Browse media"}
          <ChevronRight className="h-4 w-4" aria-hidden />
        </Link>
      </div>
    );
  }

  return (
    <div className="py-4">
      <div className="mb-3 flex items-center justify-between px-4">
        <h3 className="text-base font-bold text-gray-900 dark:text-white">
          {title}
        </h3>
        <Link
          href={{ pathname: "/media", query: { sort: "popular" } }}
          className="flex items-center gap-0.5 text-xs font-medium tkad-home-accent-text"
        >
          {isKo ? "전체보기" : "View all"}
          <ChevronRight className="h-3 w-3" aria-hidden />
        </Link>
      </div>

      <div className="scrollbar-hide flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 pb-2">
        {media.map((item, idx) => (
          <HomeMediaScrollCard
            key={item.id}
            item={item}
            href={mediaItemDetailPath(item)}
            isKo={isKo}
            priority={idx < 4}
          />
        ))}
      </div>
    </div>
  );
}
