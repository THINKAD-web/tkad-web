import Link from "next/link";
import { ChevronRight } from "lucide-react";
import type { HomeCatalogMediaItem } from "@/lib/media-catalog-types";
import { HomeMediaScrollCard } from "@/components/home/home-media-scroll-card";

interface Props {
  title: string;
  subtitle?: string;
  viewAllHref: string;
  media: HomeCatalogMediaItem[];
  locale?: string;
}

export function HomeMediaScroll({
  title,
  subtitle,
  viewAllHref,
  media,
  locale = "ko",
}: Props) {
  const isKo = locale.startsWith("ko");
  if (!media || media.length === 0) return null;

  return (
    <div className="py-4">
      <div className="mb-3 flex items-center justify-between px-4">
        <div>
          <h3 className="text-base font-bold text-gray-900 dark:text-white">
            {title}
          </h3>
          {subtitle ? (
            <p className="mt-0.5 text-xs text-gray-400 dark:text-white/50">
              {subtitle}
            </p>
          ) : null}
        </div>
        <Link
          href={viewAllHref}
          className="flex items-center gap-0.5 text-xs font-medium tkad-home-accent-text"
        >
          전체보기 <ChevronRight className="h-3 w-3" />
        </Link>
      </div>

      <div className="scrollbar-hide flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 pb-2">
        {media.map((item, idx) => {
          const href = item.slug
            ? `/ko/media/${item.slug}`
            : `/ko/media/${item.id}`;
          return (
            <HomeMediaScrollCard
              key={item.id}
              item={item}
              href={href}
              isKo={isKo}
              priority={idx < 4}
            />
          );
        })}
      </div>
    </div>
  );
}
