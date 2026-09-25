import Image from "next/image";
import type { MediaCategoryIconKey } from "@/lib/media-category-icons";
import { mediaCategoryIconSrc } from "@/lib/media-category-icons";
import { cn } from "@/lib/utils";

type Props = {
  iconKey: MediaCategoryIconKey;
  size?: number;
  className?: string;
  alt?: string;
  priority?: boolean;
};

/** Category PNG from `public/assets/category` — object-contain for chip/tile/card fallbacks. */
export function MediaCategoryIconImage({
  iconKey,
  size = 40,
  className,
  alt = "",
  priority = false,
}: Props) {
  const src = mediaCategoryIconSrc(iconKey);
  return (
    <Image
      src={src}
      alt={alt}
      width={size}
      height={size}
      className={cn("object-contain", className)}
      priority={priority}
    />
  );
}
