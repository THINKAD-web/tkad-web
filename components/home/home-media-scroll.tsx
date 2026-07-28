import { ChevronRight } from "lucide-react";
import { Link } from "@/i18n/navigation";
import type { HomeCatalogMediaItem } from "@/lib/media-catalog-types";
import { mediaItemDetailPath } from "@/lib/media-slug";
import { HomeMediaScrollCard } from "@/components/home/home-media-scroll-card";
import { cn } from "@/lib/utils";

interface Props {
  title: string;
  media: HomeCatalogMediaItem[];
  locale?: string;
  /** Landing section eyebrow (Quiet Professional) */
  eyebrow?: string;
  subtitle?: string;
  /** When embedded in another section — drop outer py/px duplication */
  embedded?: boolean;
}

export function HomeMediaScroll({
  title,
  media,
  locale = "ko",
  eyebrow,
  subtitle,
  embedded = false,
}: Props) {
  const isKo = locale.startsWith("ko");

  if (!media || media.length === 0) {
    return (
      <div className={cn(!embedded && "px-4 py-4")}>
        <Link
          href="/media"
          className="flex items-center justify-center gap-1 rounded-md border border-dashed border-gray-200 py-3 text-sm font-medium text-gray-600 transition hover:border-hermes/50 hover:text-hermes dark:border-white/15 dark:text-white/60"
        >
          {isKo ? "매체 둘러보기" : "Browse media"}
          <ChevronRight className="h-4 w-4" aria-hidden />
        </Link>
      </div>
    );
  }

  return (
    <div className={cn(!embedded && "py-4")}>
      <div className={cn("mb-4", !embedded && "px-4")}>
        {eyebrow ? (
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-hermes">
            {eyebrow}
          </p>
        ) : null}
        <div className="flex flex-nowrap items-center justify-between gap-3">
          <h3
            className={cn(
              "min-w-0 font-bold text-gray-900 dark:text-white",
              eyebrow ? "mt-1.5 text-lg md:text-xl" : "text-lg md:text-xl",
            )}
          >
            {title}
          </h3>
          <div className="shrink-0 text-sm font-medium tkad-home-accent-text">
            <Link
              href={{ pathname: "/media", query: { sort: "popular" } }}
              className="inline-flex items-center gap-0.5 whitespace-nowrap hover:opacity-90"
            >
              {isKo ? "전체보기" : "View all"}
              <ChevronRight className="h-3 w-3 shrink-0" aria-hidden />
            </Link>
          </div>
        </div>
        {subtitle ? (
          <p className="mt-1 text-sm text-gray-500 dark:text-white/50">
            {subtitle}
          </p>
        ) : null}
      </div>

      <div
        className={cn(
          "scrollbar-hide flex snap-x snap-mandatory gap-3 overflow-x-auto pb-2",
          embedded ? "-mx-0" : "px-4",
        )}
      >
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
