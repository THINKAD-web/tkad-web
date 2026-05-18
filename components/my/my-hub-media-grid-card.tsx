"use client";

import { Link } from "@/i18n/navigation";
import { X } from "lucide-react";
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
        "group relative overflow-hidden rounded-2xl border border-white/12 bg-white/5 p-3 shadow-[0_12px_40px_rgba(0,0,0,0.35)] backdrop-blur transition-colors hover:border-white/20 hover:bg-white/8",
        className,
      )}
    >
      <Link
        href={`/media/${item.id}`}
        className="absolute inset-0 z-0"
        aria-label={item.name}
      />
      <div className="relative z-[1] pointer-events-none">
        <div className="mb-3 aspect-[4/3] overflow-hidden rounded-xl border border-white/10 bg-black/30">
          {item.image ? (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img
              src={item.image}
              alt=""
              className="h-full w-full object-cover grayscale-[20%] transition-all duration-300 group-hover:grayscale-0"
            />
          ) : null}
        </div>
        <p className="truncate text-sm font-bold text-white">{item.name}</p>
        <p className="mt-1 truncate font-mono text-[10px] uppercase tracking-[0.16em] text-white/55">
          {item.region} · {item.type}
        </p>
        <p className="mt-2 font-mono text-xs font-bold tabular-nums text-cyan-300/95">
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
          className="pointer-events-auto absolute right-2 top-2 z-[2] inline-flex h-8 w-8 items-center justify-center rounded-lg border border-white/15 bg-black/50 text-white/80 transition-colors hover:bg-white/15 hover:text-white"
          aria-label={isKo ? "찜 해제" : "Remove favorite"}
        >
          <X className="h-4 w-4" />
        </button>
      ) : null}
    </li>
  );
}
