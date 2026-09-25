import Image from "next/image";
import { DESIGN_EMPTY_ASSETS } from "@/lib/media-category-icons";
import { cn } from "@/lib/utils";

type Variant = keyof typeof DESIGN_EMPTY_ASSETS;

type Props = {
  variant: Variant;
  className?: string;
  priority?: boolean;
};

const SIZES: Record<Variant, { w: number; h: number }> = {
  planner: { w: 280, h: 200 },
  noResults: { w: 280, h: 200 },
  notFound: { w: 320, h: 240 },
};

/** Empty-state PNGs under `public/assets/empty`. */
export function DesignEmptyIllustration({
  variant,
  className,
  priority = false,
}: Props) {
  const src = DESIGN_EMPTY_ASSETS[variant];
  const { w, h } = SIZES[variant];
  return (
    <Image
      src={src}
      alt=""
      width={w}
      height={h}
      className={cn("mx-auto object-contain", className)}
      priority={priority}
      aria-hidden
    />
  );
}
