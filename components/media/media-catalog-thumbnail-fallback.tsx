import {
  resolveMediaCategoryIconFromMediaFields,
} from "@/lib/media-category-icons";
import { MediaCategoryIconImage } from "@/components/media/media-category-icon-image";
import { cn } from "@/lib/utils";

type Props = {
  type?: string | null;
  mediaSubCategory?: string | null;
  catalogChannel?: string | null;
  size?: number;
  className?: string;
};

/** Missing catalog image — category PNG or muted dash. */
export function MediaCatalogThumbnailFallback({
  type,
  mediaSubCategory,
  catalogChannel,
  size = 48,
  className,
}: Props) {
  const iconKey = resolveMediaCategoryIconFromMediaFields({
    type,
    mediaSubCategory,
    catalogChannel,
  });

  if (iconKey) {
    return (
      <div
        className={cn(
          "flex h-full w-full items-center justify-center bg-gray-50 dark:bg-white/5",
          className,
        )}
      >
        <MediaCategoryIconImage
          iconKey={iconKey}
          size={size}
          className="opacity-90"
        />
      </div>
    );
  }

  return (
    <div
      className={cn(
        "tkad-type-note flex h-full w-full items-center justify-center text-tkad-muted",
        className,
      )}
    >
      —
    </div>
  );
}
