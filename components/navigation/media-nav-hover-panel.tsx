"use client";

import { useEffect, useState } from "react";
import { Link } from "@/i18n/navigation";
import { BunnyFallbackImage } from "@/components/bunny-fallback-image";
import { useLocale } from "next-intl";
import { cn } from "@/lib/utils";
import { trackEvent } from "@/lib/ga-events";
import type { TopNavLink } from "@/lib/navigation/desktop-top-nav";
import { resolveCatalogImageSrc } from "@/lib/optimized-image-url";
import type { MediaCatalogListItem } from "@/lib/media-catalog-list-dto";

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

/** Module cache — hover reopen should not wait on network. */
let previewCache: PreviewItem[] | null = null;
let previewInflight: Promise<PreviewItem[]> | null = null;

function mapPreviewItem(m: MediaCatalogListItem): PreviewItem | null {
  const rawUrl = m.thumbnailUrl?.trim();
  if (!rawUrl || !resolveCatalogImageSrc(rawUrl)?.src) return null;
  return {
    id: m.id,
    name: m.name,
    region: m.region ?? m.district ?? m.city ?? "",
    imageUrl: rawUrl,
  };
}

function loadFeaturedPreview(): Promise<PreviewItem[]> {
  if (previewCache) return Promise.resolve(previewCache);
  if (previewInflight) return previewInflight;

  previewInflight = fetch("/api/public/media?sort=popular&limit=12")
    .then((r) => r.json())
    .then((data) => {
      const items: MediaCatalogListItem[] = Array.isArray(data)
        ? data
        : Array.isArray(data?.data)
          ? data.data
          : Array.isArray(data?.items)
            ? data.items
            : [];
      const featured = items
        .map(mapPreviewItem)
        .filter((item): item is PreviewItem => item != null)
        .slice(0, 3);
      previewCache = featured;
      return featured;
    })
    .catch(() => {
      previewCache = [];
      return [] as PreviewItem[];
    })
    .finally(() => {
      previewInflight = null;
    });

  return previewInflight;
}

export function MediaNavHoverPanel({ links, className }: Props) {
  const locale = useLocale();
  const isKo = locale === "ko";
  const [preview, setPreview] = useState<PreviewItem[]>(previewCache ?? []);
  const [loading, setLoading] = useState(previewCache == null);

  useEffect(() => {
    let cancelled = false;
    if (previewCache) {
      setPreview(previewCache);
      setLoading(false);
      return;
    }
    setLoading(true);
    void loadFeaturedPreview().then((items) => {
      if (cancelled) return;
      setPreview(items);
      setLoading(false);
    });
    return () => {
      cancelled = true;
    };
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
                    className="mt-0.5 h-5 w-5 shrink-0 text-[color:var(--qp-accent)]"
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
          {isKo ? "인기 매체" : "Popular"}
        </p>
        {loading ? (
          <div className="space-y-2" aria-hidden>
            {[0, 1, 2].map((i) => (
              <div
                key={i}
                className="flex items-center gap-3 rounded-xl p-2"
              >
                <div className="h-12 w-12 shrink-0 animate-pulse rounded-lg bg-gray-200 dark:bg-white/10" />
                <div className="min-w-0 flex-1 space-y-2">
                  <div className="h-3 w-[75%] animate-pulse rounded bg-gray-200 dark:bg-white/10" />
                  <div className="h-2.5 w-1/2 animate-pulse rounded bg-gray-100 dark:bg-white/5" />
                </div>
              </div>
            ))}
          </div>
        ) : preview.length === 0 ? null : (
          preview.map((m, index) => (
            <Link
              key={m.id}
              href={`/media/${m.id}`}
              onClick={() => {
                trackEvent("discovery_hover_popular_click", {
                  media_id: m.id,
                  media_name: m.name,
                  position: index + 1,
                  slot: "discovery_nav_hover",
                });
              }}
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
