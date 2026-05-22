"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { Loader2, Search, Sparkles } from "lucide-react";
import { BtnBlock } from "@/components/brutalist";
import { HomeLandingDayNight } from "@/components/home-landing-day-night";
import {
  CategoryExploreHero,
  CategoryHeroCtaRow,
  categoryHeroCtaPrimaryClass,
} from "@/components/category-explore-hero";
import { MediaCatalogGridCard } from "@/components/media-catalog-grid-card";
import { MEDIA_CATALOG_GRID_CLASS } from "@/components/media-catalog-shared";
import type { UnifiedSearchResults } from "@/lib/unified-search";
import { fetchPublicMediaCatalog } from "@/lib/public-media-catalog";
import type { MediaItem } from "@/lib/media-data";
import { POPULAR_SEARCHES_EN, POPULAR_SEARCHES_KO, pushRecentSearch } from "@/lib/search-storage";
import { cn } from "@/lib/utils";

type Tab = "all" | "media" | "packages" | "content";

function SearchResultsInner() {
  const t = useTranslations("search");
  const tMedia = useTranslations("media");
  const locale = useLocale();
  const isKo = locale === "ko";
  const searchParams = useSearchParams();
  const q = searchParams.get("q")?.trim() ?? "";

  const [tab, setTab] = useState<Tab>("all");
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<UnifiedSearchResults | null>(null);
  const [catalog, setCatalog] = useState<MediaItem[]>([]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const res = await fetch("/api/public/media-catalog");
      if (!res.ok || cancelled) return;
      setCatalog((await res.json()) as MediaItem[]);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!q) {
      setResults(null);
      return;
    }
    let cancelled = false;
    setLoading(true);
    pushRecentSearch(q);
    (async () => {
      try {
        const res = await fetch(
          `/api/search?q=${encodeURIComponent(q)}&locale=${encodeURIComponent(locale)}&perSection=24&mediaLimit=48`,
        );
        const json = await res.json();
        if (!cancelled && json.ok) setResults(json.data as UnifiedSearchResults);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [q, locale]);

  const mediaItems = useMemo(() => {
    if (!results?.media.length) return [];
    const ids = new Set(results.media.map((m) => m.id));
    return catalog.filter((m) => ids.has(m.id));
  }, [results, catalog]);

  const contentHits = useMemo(() => {
    if (!results) return [];
    return [
      ...results.packages.map((h) => ({ ...h, group: "package" as const })),
      ...results.cases.map((h) => ({ ...h, group: "case" as const })),
      ...results.reports.map((h) => ({ ...h, group: "report" as const })),
      ...results.academy.map((h) => ({ ...h, group: "academy" as const })),
    ];
  }, [results]);

  const popular = isKo ? POPULAR_SEARCHES_KO : POPULAR_SEARCHES_EN;
  const similar = popular.filter((p) => p.toLowerCase() !== q.toLowerCase()).slice(0, 6);

  const tabs: { key: Tab; label: string; count: number }[] = [
    {
      key: "all",
      label: t("tabAll"),
      count: results?.totalCount ?? 0,
    },
    {
      key: "media",
      label: t("tabMedia"),
      count: results?.media.length ?? 0,
    },
    {
      key: "packages",
      label: t("tabPackages"),
      count: results?.packages.length ?? 0,
    },
    {
      key: "content",
      label: t("tabContent"),
      count:
        (results?.cases.length ?? 0) +
        (results?.reports.length ?? 0) +
        (results?.academy.length ?? 0),
    },
  ];

  const showMedia =
    tab === "all" || tab === "media" ? results?.media ?? [] : [];
  const showPackages = tab === "all" || tab === "packages" ? results?.packages ?? [] : [];
  const showContent =
    tab === "all" || tab === "content" ? contentHits : [];

  const empty = q && !loading && results && results.totalCount === 0;

  return (
    <HomeLandingDayNight>
      <div className="tkad-landing-neon tkad-planner-neon min-h-[calc(100vh-72px)]">
        <CategoryExploreHero
          code="// SEARCH"
          headlineBefore={isKo ? "통합 " : "Unified "}
          headlineGradient={isKo ? "검색" : "search"}
          subtitle={
            q
              ? isKo
                ? `「${q}」 검색 결과`
                : `Results for “${q}”`
              : t("pageSubtitleEmpty")
          }
        >
          <form
            role="search"
            className="mx-auto mt-4 flex w-full max-w-xl gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              const fd = new FormData(e.currentTarget);
              const next = String(fd.get("q") ?? "").trim();
              if (next) {
                window.location.href = `/${locale}/search?q=${encodeURIComponent(next)}`;
              }
            }}
          >
            <input
              name="q"
              defaultValue={q}
              placeholder={t("modalPlaceholder")}
              className="h-11 min-w-0 flex-1 rounded-xl border dark:border-white/12 border-gray-200 dark:bg-black bg-white/30 px-4 font-mono text-sm dark:text-white text-gray-900 outline-none focus:border-white/25"
            />
            <button
              type="submit"
              className="inline-flex h-11 items-center gap-2 rounded-xl border dark:border-white/15 border-gray-200 dark:bg-white/10 bg-gray-100 px-4 text-sm font-semibold dark:text-white text-gray-900 hover:bg-white/15"
            >
              <Search className="h-4 w-4" />
              {t("submit")}
            </button>
          </form>
        </CategoryExploreHero>

        <section className="border-t border-border/60 bg-card py-10 dark:border-white/10 border-gray-200">
          <div className="mx-auto max-w-6xl px-4 sm:px-6">
            {q ? (
              <div className="mb-6 flex flex-wrap gap-2">
                {tabs.map((item) => (
                  <button
                    key={item.key}
                    type="button"
                    onClick={() => setTab(item.key)}
                    className={cn(
                      "rounded-full border px-4 py-1.5 font-mono text-[11px] font-bold uppercase tracking-wide transition-colors",
                      tab === item.key
                        ? "border-accent bg-accent/15 text-accent"
                        : "border-border text-muted-foreground hover:border-accent/40",
                    )}
                  >
                    {item.label}
                    <span className="ml-1.5 tabular-nums opacity-70">
                      {item.count}
                    </span>
                  </button>
                ))}
              </div>
            ) : null}

            {loading ? (
              <div className="flex justify-center py-16">
                <Loader2 className="h-8 w-8 animate-spin text-accent" />
              </div>
            ) : null}

            {empty ? (
              <div className="rounded-2xl border-2 border-dashed border-border bg-muted/30 p-8 text-center dark:border-white/12 border-gray-200">
                <p className="text-lg font-bold text-foreground">
                  {t("noResults")}
                </p>
                <p className="mt-2 text-sm text-muted-foreground">
                  {t("noResultsHint")}
                </p>
                {similar.length > 0 ? (
                  <div className="mt-6">
                    <p className="font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground">
                      {t("similarQueries")}
                    </p>
                    <div className="mt-3 flex flex-wrap justify-center gap-2">
                      {similar.map((s) => (
                        <Link
                          key={s}
                          href={`/search?q=${encodeURIComponent(s)}`}
                          className="rounded-full border border-border px-3 py-1 text-sm hover:bg-muted"
                        >
                          {s}
                        </Link>
                      ))}
                    </div>
                  </div>
                ) : null}
                <CategoryHeroCtaRow className="mt-8 justify-center">
                  <BtnBlock
                    href="/planner"
                    className={categoryHeroCtaPrimaryClass}
                  >
                    <Sparkles className="h-4 w-4" />
                    {t("plannerCta")}
                  </BtnBlock>
                  <BtnBlock href="/media" variant="secondary">
                    {t("browseMedia")}
                  </BtnBlock>
                </CategoryHeroCtaRow>
              </div>
            ) : null}

            {!loading && results && !empty ? (
              <div className="space-y-10">
                {showMedia.length > 0 && mediaItems.length > 0 ? (
                  <section>
                    <h2 className="mb-4 font-mono text-xs font-bold uppercase tracking-[0.2em] text-muted-foreground">
                      🏢 {t("sectionMedia")}
                    </h2>
                    <div className={MEDIA_CATALOG_GRID_CLASS}>
                      {mediaItems.map((media) => (
                        <MediaCatalogGridCard
                          key={media.id}
                          variant="link"
                          media={media}
                          isKo={isKo}
                          imagePreparingLabel={tMedia("imagePreparing")}
                        />
                      ))}
                    </div>
                  </section>
                ) : null}

                {showPackages.length > 0 ? (
                  <section>
                    <h2 className="mb-4 font-mono text-xs font-bold uppercase tracking-[0.2em] text-muted-foreground">
                      📦 {t("sectionPackages")}
                    </h2>
                    <ul className="space-y-2">
                      {showPackages.map((h) => (
                        <li key={h.id}>
                          <Link
                            href={h.href}
                            className="block rounded-xl border border-border bg-card p-4 transition-colors hover:border-accent/40 hover:bg-muted/50"
                          >
                            <p className="font-semibold text-foreground">{h.title}</p>
                            <p className="mt-1 text-sm text-muted-foreground">{h.subtitle}</p>
                          </Link>
                        </li>
                      ))}
                    </ul>
                  </section>
                ) : null}

                {showContent.length > 0 ? (
                  <section>
                    <h2 className="mb-4 font-mono text-xs font-bold uppercase tracking-[0.2em] text-muted-foreground">
                      {t("tabContent")}
                    </h2>
                    <ul className="divide-y divide-border rounded-2xl border border-border bg-card">
                      {showContent.map((h) => (
                        <li key={`${h.kind}-${h.id}`}>
                          <Link
                            href={h.href}
                            className="flex flex-col gap-1 px-4 py-4 transition-colors hover:bg-muted/50 sm:flex-row sm:items-center sm:justify-between"
                          >
                            <div className="min-w-0">
                              <p className="font-semibold text-foreground">{h.title}</p>
                              <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">
                                {h.subtitle}
                              </p>
                            </div>
                            <span className="shrink-0 font-mono text-[10px] uppercase tracking-wider text-accent">
                              {h.kind}
                            </span>
                          </Link>
                        </li>
                      ))}
                    </ul>
                  </section>
                ) : null}
              </div>
            ) : null}
          </div>
        </section>
      </div>
    </HomeLandingDayNight>
  );
}

export function SearchResultsClient() {
  return (
    <Suspense fallback={null}>
      <SearchResultsInner />
    </Suspense>
  );
}
