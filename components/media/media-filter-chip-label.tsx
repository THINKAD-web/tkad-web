import type { LucideIcon } from "lucide-react";
import type { MediaCategoryIconKey } from "@/lib/media-category-icons";
import { MediaCategoryIconImage } from "@/components/media/media-category-icon-image";

type Props = {
  label: string;
  icon?: LucideIcon;
  categoryIcon?: MediaCategoryIconKey;
};

export function MediaFilterChipLabel({
  label,
  icon: Icon,
  categoryIcon,
}: Props) {
  if (categoryIcon) {
    return (
      <span className="inline-flex items-center gap-1.5">
        <MediaCategoryIconImage
          iconKey={categoryIcon}
          size={18}
          className="h-[18px] w-[18px] shrink-0"
        />
        {label}
      </span>
    );
  }
  if (!Icon) return <>{label}</>;

  return (
    <span className="inline-flex items-center gap-1.5">
      <Icon className="h-3.5 w-3.5 shrink-0 opacity-80" aria-hidden />
      {label}
    </span>
  );
}
