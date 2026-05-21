"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type FormEvent,
} from "react";
import { useLocale, useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import {
  Building2,
  BookOpen,
  GraduationCap,
  Loader2,
  Package,
  Search,
  Trophy,
} from "lucide-react";
import Modal from "@/components/ui/modal";
import { Link } from "@/i18n/navigation";
import type { UnifiedSearchHit, UnifiedSearchResults } from "@/lib/unified-search";
import {
  POPULAR_SEARCHES_EN,
  POPULAR_SEARCHES_KO,
  pushRecentSearch,
  readRecentSearches,
} from "@/lib/search-storage";
import { cn } from "@/lib/utils";

type Props = {
  open: boolean;
  onClose: () => void;
};

const SECTION_META: Record<
  keyof Pick<
    UnifiedSearchResults,
    "media" | "packages" | "cases" | "reports" | "academy"
  >,
  { icon: typeof Building2; emoji: string; labelKey: string }
> = {
  media: { icon: Building2, emoji: "🏢", labelKey: "sectionMedia" },
  packages: { icon: Package, emoji: "📦", labelKey: "sectionPackages" },
  cases: { icon: Trophy, emoji: "📋", labelKey: "sectionCases" },
  reports: { icon: BookOpen, emoji: "📝", labelKey: "sectionReports" },
  academy: { icon: GraduationCap, emoji: "🎓", labelKey: "sectionAcademy" },
};

function HitRow({
  hit,
  onPick,
}: {
  hit: UnifiedSearchHit;
  onPick: () => void;
}) {
  return (
    <Link
      href={hit.href}
      onClick={onPick}
      className="flex min-w-0 flex-col gap-0.5 rounded-lg px-3 py-2 transition-colors hover:bg-accent/10 dark:hover:dark:bg-white/8 bg-gray-100"
    >
      <span className="truncate text-sm font-semibold text-foreground dark:text-white text-gray-900">
        {hit.title}
      </span>
      {hit.subtitle ? (
        <span className="truncate font-mono text-[11px] text-muted-foreground dark:text-white text-gray-400">
          {hit.subtitle}
        </span>
      ) : null}
    </Link>
  );
}

export function UnifiedSearchModal({ open, onClose }: Props) {
  const t = useTranslations("search");
  const locale = useLocale();
  const isKo = locale === "ko";
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<UnifiedSearchResults | null>(null);
  const [suggestions, setSuggestions] = useState<UnifiedSearchHit[]>([]);
  const [recent, setRecent] = useState<string[]>([]);

  const popular = isKo ? POPULAR_SEARCHES_KO : POPULAR_SEARCHES_EN;

  useEffect(() => {
    if (open) {
      setRecent(readRecentSearches());
      queueMicrotask(() => inputRef.current?.focus());
    } else {
      setQuery("");
      setResults(null);
      setSuggestions([]);
    }
  }, [open]);

  const fetchResults = useCallback(
    async (q: string) => {
      const trimmed = q.trim();
      if (!trimmed) {
        setResults(null);
        setSuggestions([]);
        return;
      }
      setLoading(true);
      try {
        const [searchRes, suggestRes] = await Promise.all([
          fetch(
            `/api/search?q=${encodeURIComponent(trimmed)}&locale=${encodeURIComponent(locale)}&perSection=3`,
          ),
          fetch(
            `/api/search/suggest?q=${encodeURIComponent(trimmed)}&locale=${encodeURIComponent(locale)}&limit=5`,
          ),
        ]);
        const searchJson = await searchRes.json();
        const suggestJson = await suggestRes.json();
        if (searchJson.ok) setResults(searchJson.data as UnifiedSearchResults);
        if (suggestJson.ok) setSuggestions(suggestJson.data.items ?? []);
      } finally {
        setLoading(false);
      }
    },
    [locale],
  );

  useEffect(() => {
    if (!open) return;
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => void fetchResults(query), 280);
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [query, open, fetchResults]);

  const goFullSearch = useCallback(
    (q: string) => {
      const trimmed = q.trim();
      if (!trimmed) return;
      pushRecentSearch(trimmed);
      onClose();
      router.push(`/search?q=${encodeURIComponent(trimmed)}`);
    },
    [onClose, router],
  );

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    goFullSearch(query);
  };

  const pickHit = () => {
    if (query.trim()) pushRecentSearch(query.trim());
    onClose();
  };

  const hasQuery = query.trim().length > 0;
  const showEmpty =
    hasQuery && !loading && results && results.totalCount === 0;

  return (
    <Modal
      open={open}
      onClose={onClose}
      ariaLabel={t("modalTitle")}
      className="w-full max-w-xl overflow-hidden rounded-2xl border-2 border-border bg-card p-0 shadow-2xl dark:border-white/12 border-gray-200 dark:bg-[#0c0c12]"
    >
      <form onSubmit={onSubmit} className="border-b border-border dark:border-white/10 border-gray-200">
        <div className="flex items-center gap-2 px-4 py-3">
          <Search className="h-5 w-5 shrink-0 text-muted-foreground" aria-hidden />
          <input
            ref={inputRef}
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t("modalPlaceholder")}
            autoComplete="off"
            className="min-w-0 flex-1 bg-transparent text-base text-foreground outline-none placeholder:text-muted-foreground dark:text-white text-gray-900 dark:placeholder:dark:text-white text-gray-400"
          />
          {loading ? (
            <Loader2 className="h-4 w-4 shrink-0 animate-spin text-muted-foreground" />
          ) : null}
        </div>
      </form>

      <div className="max-h-[min(60vh,28rem)] overflow-y-auto p-2">
        {!hasQuery ? (
          <div className="space-y-4 px-2 py-2">
            {recent.length > 0 ? (
              <div>
                <p className="mb-2 font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground">
                  {t("recent")}
                </p>
                <div className="flex flex-wrap gap-2">
                  {recent.map((r) => (
                    <button
                      key={r}
                      type="button"
                      onClick={() => goFullSearch(r)}
                      className="rounded-full border border-border px-3 py-1 font-mono text-[11px] hover:bg-muted dark:border-white/12 border-gray-200 dark:hover:dark:bg-white/8 bg-gray-100"
                    >
                      {r}
                    </button>
                  ))}
                </div>
              </div>
            ) : null}
            <div>
              <p className="mb-2 font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground">
                {t("popular")}
              </p>
              <div className="flex flex-wrap gap-2">
                {popular.map((p) => (
                  <button
                    key={p}
                    type="button"
                    onClick={() => goFullSearch(p)}
                    className="rounded-full border border-accent/30 bg-accent/8 px-3 py-1 font-mono text-[11px] text-accent dark:border-cyan-400/30 dark:bg-cyan-400/10 dark:text-cyan-200"
                  >
                    {p}
                  </button>
                ))}
              </div>
            </div>
            {suggestions.length > 0 ? (
              <div>
                <p className="mb-1 font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground">
                  {t("mediaSuggest")}
                </p>
                {suggestions.map((h) => (
                  <HitRow key={h.id} hit={h} onPick={pickHit} />
                ))}
              </div>
            ) : null}
          </div>
        ) : null}

        {hasQuery && results ? (
          <div className="space-y-3 px-1 py-1">
            {(
              ["media", "packages", "cases", "reports", "academy"] as const
            ).map((key) => {
              const items = results[key];
              if (!items.length) return null;
              const meta = SECTION_META[key];
              return (
                <section key={key}>
                  <p className="mb-1 flex items-center gap-2 px-2 font-mono text-[10px] font-bold uppercase tracking-[0.18em] text-muted-foreground">
                    <span aria-hidden>{meta.emoji}</span>
                    {t(meta.labelKey)}
                  </p>
                  <div className="space-y-0.5">
                    {items.map((hit) => (
                      <HitRow key={`${hit.kind}-${hit.id}`} hit={hit} onPick={pickHit} />
                    ))}
                  </div>
                </section>
              );
            })}
            {results.totalCount > 0 ? (
              <button
                type="button"
                onClick={() => goFullSearch(query)}
                className="mt-2 w-full rounded-xl border border-border py-2.5 text-center text-sm font-semibold text-accent hover:bg-accent/10 dark:border-white/12 border-gray-200"
              >
                {t("viewAll", { count: results.totalCount })}
              </button>
            ) : null}
          </div>
        ) : null}

        {showEmpty ? (
          <p className="px-4 py-8 text-center text-sm text-muted-foreground">
            {t("noResultsShort")}
          </p>
        ) : null}
      </div>
    </Modal>
  );
}
