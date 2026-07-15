"use client";

import { useEffect, useState } from "react";
import { Link } from "@/i18n/navigation";
import { BunnyFallbackImage } from "@/components/bunny-fallback-image";
import { useLocale } from "next-intl";
import { cn } from "@/lib/utils";
import type { TopNavLink } from "@/lib/navigation/desktop-top-nav";
import { getPrimaryMediaImageUrl, type MediaItem } from "@/lib/media-data";
import { resolveCatalogImageSrc } from "@/lib/optimized-image-url";

type Props = {
  links: TopNavLink[];
  className?: string;
};

type PreviewItem = {
  id: string;
  name: string;
  region: string;
  imageUrl?: string;
};

function mapPreviewItem(m: MediaItem): PreviewItem | null {
  const rawUrl = getPrimaryMediaImageUrl(m);
  if (!rawUrl || !resolveCatalogImageSrc(rawUrl)?.src) return null;
  return {
    id: m.id,
    name: m.name,
    region: m.region ?? m.district ?? m.city ?? "",
    imageUrl: rawUrl,
  };
}

export function MediaNavHoverPanel({ links, className }: Props) {
  const locale = useLocale();
  const isKo = locale === "ko";
  const [preview, setPreview] = useState<PreviewItem[]>([]);

  useEffect(() => {
    fetch("/api/public/media-catalog")
      .then((r) => r.json())
      .then((data) => {
        const items: MediaItem[] = Array.isArray(data) ? data : data?.items ?? [];
        if (!Array.isArray(items)) return;
        const featured = items
          .map(mapPreviewItem)
          .filter((item): item is PreviewItem => item != null)
          .slice(0, 3);
        setPreview(featured);
      })
      .catch(() => setPreview([]));
  }, []);

  return (
    <div
      className={cn(
        "grid w-[min(42rem,calc(100vw-2rem))] grid-cols-[1fr_1fr] gap-4 p-4",
        className,
      )}
    >
      <ul className="space-y-1">
        {links.map((link) => {
          const Icon = link.icon;
          return (
            <li key={link.id}>
              <Link
                href={link.href}
                className="flex items-start gap-3 rounded-xl px-3 py-2.5 transition-colors hover:bg-gray-100 dark:hover:bg-white/5"
              >
                {Icon ? (
                  <Icon
                    className="mt-0.5 h-5 w-5 shrink-0 text-cyan-600 dark:text-cyan-300"
                    aria-hidden
                  />
                ) : null}
                <span>
                  <span className="block text-sm font-semibold text-gray-900 dark:text-white">
                    {isKo ? link.labelKo : link.labelEn}
                  </span>
                  {link.descKo ? (
                    <span className="mt-0.5 block text-xs text-gray-500 dark:text-white/50">
                      {isKo ? link.descKo : link.descEn}
                    </span>
                  ) : null}
                </span>
              </Link>
            </li>
          );
        })}
      </ul>

      <div className="space-y-2 border-l border-gray-200 pl-4 dark:border-white/10">
        <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400 dark:text-white/40">
          {isKo ? "추천 매체" : "Featured"}
        </p>
        {preview.length === 0 ? (
          <div className="h-32 rounded-xl bg-gray-100 dark:bg-white/5" aria-hidden />
        ) : (
          preview.map((m) => (
            <Link
              key={m.id}
              href={`/media/${m.id}`}
              className="flex items-center gap-3 rounded-xl p-2 transition-colors hover:bg-gray-100 dark:hover:bg-white/5"
            >
              <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-lg bg-gray-200 dark:bg-white/10">
                <BunnyFallbackImage
                  rawSrc={m.imageUrl!}
                  alt=""
                  fill
                  className="object-cover"
                  sizes="48px"
                />
              </div>
              <span className="min-w-0">
                <span className="block truncate text-sm font-medium text-gray-900 dark:text-white">
                  {m.name}
                </span>
                <span className="block truncate text-xs text-gray-500">{m.region}</span>
              </span>
            </Link>
          ))
        )}
      </div>
    </div>
  );
}
