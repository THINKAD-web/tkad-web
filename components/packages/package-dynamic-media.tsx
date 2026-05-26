"use client";

import { useEffect, useState } from "react";
import { Link } from "@/i18n/navigation";
import { ArrowRight, Loader2 } from "lucide-react";
import { MediaCatalogListCard } from "@/components/media/media-catalog-list-card";
import type { MediaItem } from "@/lib/media-data";
import { buildPackageContactHref } from "@/lib/media-package-url";

type ApiResponse = {
  package: { slug: string; name: string };
  media: MediaItem[];
  meta?: { usedFallback?: boolean; count?: number };
};

export function PackageDynamicMediaSection({
  slug,
  packageName,
  isKo,
}: {
  slug: string;
  packageName: string;
  isKo: boolean;
}) {
  const [loading, setLoading] = useState(true);
  const [media, setMedia] = useState<MediaItem[]>([]);
  const [usedFallback, setUsedFallback] = useState(false);
  const [error, setError] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(false);
    void (async () => {
      try {
        const res = await fetch(
          `/api/public/packages/${encodeURIComponent(slug)}/media`,
          { cache: "no-store" },
        );
        if (!res.ok) throw new Error("fetch failed");
        const data = (await res.json()) as ApiResponse;
        if (cancelled) return;
        setMedia(Array.isArray(data.media) ? data.media : []);
        setUsedFallback(Boolean(data.meta?.usedFallback));
      } catch {
        if (!cancelled) setError(true);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [slug]);

  const title = isKo ? "이 패키지 추천 매체" : "Recommended media in this package";
  const emptyTitle = isKo ? "곧 매체가 추가됩니다" : "Media coming soon";
  const emptyBody = isKo
    ? usedFallback
      ? "정확히 일치하는 매체는 아직 없지만, 비슷한 조건의 추천 매체를 표시합니다."
      : "현재 이 패키지에 맞는 매체를 준비 중입니다. 견적 문의로 맞춤 추천을 받아보세요."
    : usedFallback
      ? "No exact matches yet — showing similar inventory."
      : "We are curating media for this package. Contact us for a tailored shortlist.";
  const cta = isKo ? "이 패키지로 견적 받기" : "Get a quote for this package";
  const contactHref = buildPackageContactHref(slug, packageName);

  return (
    <section className="py-12 sm:py-16">
      <div className="ui-container">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <h2 className="text-xl font-bold tracking-tight sm:text-2xl">
            {title}{" "}
            {!loading && media.length > 0 ? (
              <span className="text-accent tabular-nums">{media.length}</span>
            ) : null}
          </h2>
        </div>

        {loading ? (
          <div className="mt-10 flex items-center justify-center gap-2 text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin" aria-hidden />
            <span className="text-sm">{isKo ? "매체 불러오는 중…" : "Loading media…"}</span>
          </div>
        ) : error || media.length === 0 ? (
          <div className="mt-8 rounded-2xl border border-dashed border-border bg-muted/30 p-10 text-center">
            <p className="text-lg font-bold">{emptyTitle}</p>
            <p className="mt-2 text-sm text-muted-foreground">{emptyBody}</p>
            <Link
              href={contactHref}
              className="tkad-neon-cta mt-6 inline-flex h-12 items-center rounded-[18px] px-8 text-sm font-bold"
            >
              {cta}
            </Link>
          </div>
        ) : (
          <ul className="mt-8 space-y-3">
            {media.map((m, i) => (
              <li key={m.id}>
                <MediaCatalogListCard
                  media={m}
                  isKo={isKo}
                  rank={i + 1}
                  imagePreparingLabel={isKo ? "이미지 준비 중" : "Image preparing"}
                />
              </li>
            ))}
          </ul>
        )}

        {usedFallback && media.length > 0 ? (
          <p className="mt-4 text-xs text-muted-foreground">
            {isKo
              ? "* 조건에 맞는 매체가 적어 유사 매체를 함께 표시합니다."
              : "* Showing similar media where exact matches are limited."}
          </p>
        ) : null}
      </div>
    </section>
  );
}

export function PackageBottomCta({
  slug,
  packageName,
  isKo,
}: {
  slug: string;
  packageName: string;
  isKo: boolean;
}) {
  const href = buildPackageContactHref(slug, packageName);
  return (
    <section className="border-t border-border/80 bg-muted/30 py-14 sm:py-16">
      <div className="ui-container text-center">
        <h2 className="text-2xl font-black tracking-tight sm:text-3xl">
          {isKo ? "패키지 견적이 필요하신가요?" : "Need a quote for this package?"}
        </h2>
        <p className="mx-auto mt-3 max-w-xl text-muted-foreground">
          {isKo
            ? `${packageName} 패키지 기준으로 맞춤 견적을 드립니다.`
            : `We will tailor a quote for the ${packageName} package.`}
        </p>
        <Link
          href={href}
          className="tkad-neon-cta mt-8 inline-flex h-14 items-center gap-2 rounded-[20px] px-10 text-base font-bold"
        >
          {isKo ? "이 패키지로 견적 받기" : "Get a quote for this package"}
          <ArrowRight className="h-4 w-4" aria-hidden />
        </Link>
      </div>
    </section>
  );
}
