import Image from "next/image";
import { cn } from "@/lib/utils";

type Props = {
  src: string;
  className?: string;
  priority?: boolean;
};

/** 마케팅 히어로 PNG — 페이지 상단 비주얼 (preview*.png) */
export function MarketingHeroVisual({
  src,
  className,
  priority = false,
}: Props) {
  return (
    <div
      className={cn(
        "mx-auto w-full max-w-5xl px-4 sm:px-6 lg:px-8",
        className,
      )}
    >
      <Image
        src={src}
        alt=""
        width={1200}
        height={675}
        className="w-full rounded-2xl border border-gray-200/80 object-contain shadow-lg shadow-black/10 dark:border-white/10 dark:shadow-black/40"
        priority={priority}
        sizes="(max-width: 1024px) 100vw, 1024px"
      />
    </div>
  );
}
