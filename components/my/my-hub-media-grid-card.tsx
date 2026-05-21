"use client";

import { Link } from "@/i18n/navigation";
import { X } from "lucide-react";
import { myHubGlassCard } from "@/lib/my-hub-ui";
import { cn } from "@/lib/utils";

export type MyHubMediaItem = {
  id: string;
  name: string;
  region: string;
  type: string;
  price: number;
  image: string | null;
};

function formatKRW(v: number, isKo: boolean): string {
  return new Intl.NumberFormat(isKo ? "ko-KR" : "en-US", {
    style: "currency",
    currency: "KRW",
    maximumFractionDigits: 0,
  }).format(v);
}

export function MyHubMediaGridCard({
  item,
  isKo,
  onRemove,
  className,
}: {
  item: MyHubMediaItem;
  isKo: boolean;
  onRemove?: (id: string) => void;
  className?: string;
}) {
  return (
    <li
      className={cn(
        myHubGlassCard,
        "group relative overflow-hidden p-4 transition-all hover:-translate-y-0.5 hover:border-primary/25 sm:p-5",
        className,
      )}
    >
      <Link
        href={`/media/${item.id}`}
        className="absolute inset-0 z-0"
        aria-label={item.name}
      />
      <div className="relative z-[1] pointer-events-none">
        <div className="mb-3 aspect-[4/3] overflow-hidden rounded-[18px] border border-border/60 bg-muted/40 dark:border-white/10 border-gray-200 dark:bg-black bg-white bg-white/30">
          {item.image ? (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img
              src={item.image}
              alt=""
              className="h-full w-full object-cover grayscale-[20%] transition-all duration-300 group-hover:grayscale-0"
            />
          ) : null}
        </div>
        <p className="truncate text-base font-bold text-foreground">{item.name}</p>
        <p className="mt-1 truncate font-mono text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
          {item.region} · {item.type}
        </p>
        <p className="mt-2 font-mono text-sm font-bold tabular-nums text-primary">
          {formatKRW(item.price, isKo)}
        </p>
      </div>
      {onRemove ? (
        <button
          type="button"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onRemove(item.id);
          }}
          className="pointer-events-auto absolute right-3 top-3 z-[2] inline-flex h-9 w-9 items-center justify-center rounded-xl border border-border bg-card/95 text-muted-foreground backdrop-blur transition-colors hover:border-destructive/40 hover:text-destructive dark:border-white/14 border-gray-200 dark:bg-black bg-white bg-white/40 dark:bg-white/8 bg-gray-100 dark:hover:text-red-300"
          aria-label={isKo ? "찜 해제" : "Remove favorite"}
        >
          <X className="h-4 w-4" />
        </button>
      ) : null}
    </li>
  );
}
