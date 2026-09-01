import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import {
  contentCategoryEmoji,
  contentGradientClass,
  isPlaceholderThumbnail,
} from "@/lib/content-card-visuals";

type Props = {
  thumbnailUrl?: string | null;
  alt: string;
  category?: string | null;
  industry?: string | null;
  heightClass?: string;
  className?: string;
  badge?: ReactNode;
};

export function ContentCardGradientThumb({
  thumbnailUrl,
  alt,
  category,
  industry,
  heightClass = "h-32",
  className,
  badge,
}: Props) {
  const gradientKey = contentGradientClass(category, industry);
  const emoji = contentCategoryEmoji(category, industry);
  const label = category?.trim() || industry?.trim();
  const showThumbnail = thumbnailUrl && !isPlaceholderThumbnail(thumbnailUrl);

  return (
    <div
      className={cn(
        "relative w-full overflow-hidden bg-gray-100 dark:bg-gray-800",
        heightClass,
        className,
      )}
    >
      {showThumbnail ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={thumbnailUrl!} alt={alt} className="h-full w-full object-cover" />
      ) : (
        <div
          className={cn(
            "flex h-full w-full flex-col items-center justify-center gap-1 bg-gradient-to-br",
            gradientKey,
          )}
        >
          <span className="text-lg opacity-80 sm:text-xl" aria-hidden>
            {emoji}
          </span>
          {label ? (
            <span className="tkad-type-note font-medium uppercase tracking-[0.14em] text-white/55">
              {label}
            </span>
          ) : null}
        </div>
      )}
      {badge}
    </div>
  );
}
