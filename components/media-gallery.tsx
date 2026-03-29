"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";

export default function MediaGallery({
  images,
  altBase,
  className,
}: {
  images: string[];
  altBase: string;
  className?: string;
}) {
  const [active, setActive] = useState(0);
  const safe =
    images.length > 0
      ? images
      : ["https://picsum.photos/seed/tkad-media-empty/1200/800"];
  const main = safe[Math.min(active, safe.length - 1)];

  return (
    <div className={cn("space-y-3", className)}>
      <div className="relative aspect-[16/9] overflow-hidden rounded-xl border border-navy/10 bg-slate-100">
        {/* eslint-disable-next-line @next/next/no-img-element -- remote demo URLs */}
        <img
          src={main}
          alt={`${altBase} — gallery ${active + 1} of ${safe.length}`}
          className="h-full w-full object-cover"
        />
      </div>
      {safe.length > 1 && (
        <div className="flex gap-2 overflow-x-auto pb-1">
          {safe.map((src, i) => (
            <button
              key={`${src}-${i}`}
              type="button"
              onClick={() => setActive(i)}
              className={cn(
                "relative h-16 w-24 shrink-0 overflow-hidden rounded-lg border-2 transition-colors",
                i === active ? "border-gold ring-1 ring-gold/40" : "border-transparent opacity-80 hover:opacity-100",
              )}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={src} alt="" className="h-full w-full object-cover" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
