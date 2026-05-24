"use client";

import { Link } from "@/i18n/navigation";
import { CheckCircle2, Film, Image as ImageIcon, Tag } from "lucide-react";
import { cn } from "@/lib/utils";
import type { CreativeListItem } from "@/lib/creatives/types";

export function formatFileSize(bytes: number | null): string {
  if (bytes == null || bytes <= 0) return "—";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
  return `${(bytes / 1024 / 1024 / 1024).toFixed(2)} GB`;
}

export function formatDuration(sec: number | null): string {
  if (sec == null || sec <= 0) return "—";
  if (sec < 60) return `${sec}s`;
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

export function CreativeCard({
  item,
  selectable = false,
  selected = false,
  onToggle,
  hrefOverride,
}: {
  item: CreativeListItem;
  selectable?: boolean;
  selected?: boolean;
  onToggle?: (item: CreativeListItem) => void;
  hrefOverride?: string;
}) {
  const href = hrefOverride ?? `/creatives/${item.id}`;
  const preview = item.thumbnailUrl || (item.type === "image" ? item.url : null);

  const inner = (
    <div className="group relative flex h-full flex-col overflow-hidden rounded-2xl border-2 border-border bg-card transition-all hover:-translate-y-0.5 hover:shadow-[0_18px_60px_rgba(15,23,42,0.10)]">
      <div className="relative aspect-[16/10] w-full overflow-hidden border-b-2 border-border bg-muted">
        {preview ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={preview}
            alt={item.name}
            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.02]"
            loading="lazy"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-violet-600/30 via-cyan-500/20 to-pink-500/20">
            <Film className="h-10 w-10 dark:text-white text-gray-600" />
          </div>
        )}
        <span className="absolute left-2 top-2 inline-flex items-center gap-1 rounded-md border border-border bg-card/95 px-1.5 py-0.5 font-display text-xs font-medium uppercase tracking-[0.18em] text-foreground">
          {item.type === "video" ? (
            <>
              <Film className="h-3 w-3" /> Video
            </>
          ) : (
            <>
              <ImageIcon className="h-3 w-3" /> Image
            </>
          )}
        </span>
        {item.usageCount > 0 ? (
          <span className="absolute right-2 top-2 inline-flex items-center gap-1 rounded-md border border-accent bg-accent px-1.5 py-0.5 font-display text-xs font-medium uppercase tracking-[0.18em] text-accent-foreground">
            <CheckCircle2 className="h-3 w-3" /> 사용 {item.usageCount}
          </span>
        ) : null}
        {selectable ? (
          <span
            className={cn(
              "absolute right-2 bottom-2 flex h-7 w-7 items-center justify-center rounded-full border-2 transition-colors",
              selected
                ? "border-accent bg-accent text-accent-foreground"
                : "border-white/60 dark:bg-black bg-white/30 dark:text-white text-gray-700 backdrop-blur",
            )}
            aria-hidden
          >
            {selected ? <CheckCircle2 className="h-4 w-4" /> : null}
          </span>
        ) : null}
      </div>
      <div className="flex flex-1 flex-col gap-1.5 p-3 sm:p-4">
        <p className="line-clamp-2 text-sm font-bold leading-snug text-foreground">
          {item.name}
        </p>
        <p className="font-display text-xs font-medium uppercase tracking-[0.16em] text-muted-foreground">
          {item.width && item.height ? `${item.width}×${item.height}` : "—"}
          {item.type === "video" && item.duration ? ` · ${formatDuration(item.duration)}` : ""}
          {" · "}
          {formatFileSize(item.fileSize)}
        </p>
        {item.tags.length > 0 ? (
          <div className="mt-1 flex flex-wrap gap-1">
            {item.tags.slice(0, 4).map((tag) => (
              <span
                key={tag}
                className="inline-flex items-center gap-0.5 rounded-md border border-border bg-muted px-1.5 py-0.5 font-display text-xs font-medium uppercase tracking-[0.14em] text-foreground/80"
              >
                <Tag className="h-2.5 w-2.5" /> {tag}
              </span>
            ))}
          </div>
        ) : null}
      </div>
    </div>
  );

  if (selectable && onToggle) {
    return (
      <button
        type="button"
        onClick={() => onToggle(item)}
        className="block h-full text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#a855f7] focus-visible:ring-offset-2 focus-visible:ring-offset-background"
      >
        {inner}
      </button>
    );
  }
  return (
    <Link href={href} className="block h-full">
      {inner}
    </Link>
  );
}
