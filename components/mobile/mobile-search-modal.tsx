"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "@/i18n/navigation";
import { useLocale } from "next-intl";
import { ArrowLeft, Clock, Search, TrendingUp, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { useCompositionControlledInput } from "@/hooks/use-composition-controlled-input";
import { useMobileSearch } from "@/components/mobile/mobile-search-context";

const RECENT_KEY = "tkad-mobile-recent-searches";
const MAX_RECENT = 5;

const POPULAR_KO = [
  "강남 전광판",
  "홍대 DOOH",
  "팬덤 광고",
  "지하철 광고",
  "성수 팝업",
  "부산 해운대",
];

const POPULAR_EN = [
  "Gangnam LED",
  "Hongdae billboard",
  "Subway ads",
  "Bus shelter",
  "Seongsu popup",
  "Busan Haeundae",
];

function readRecent(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(RECENT_KEY);
    const parsed = raw ? (JSON.parse(raw) as string[]) : [];
    return Array.isArray(parsed) ? parsed.slice(0, MAX_RECENT) : [];
  } catch {
    return [];
  }
}

function writeRecent(items: string[]) {
  localStorage.setItem(RECENT_KEY, JSON.stringify(items.slice(0, MAX_RECENT)));
}

type Props = {
  /** Optional catalog names for autocomplete */
  suggestions?: string[];
};

export function MobileSearchModal({ suggestions = [] }: Props) {
  const { isOpen, closeSearch } = useMobileSearch();
  const router = useRouter();
  const locale = useLocale();
  const isKo = locale === "ko";
  const inputRef = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState("");
  const queryInput = useCompositionControlledInput(query, setQuery);
  const [recent, setRecent] = useState<string[]>([]);

  useEffect(() => {
    if (isOpen) {
      setRecent(readRecent());
      const t = setTimeout(() => inputRef.current?.focus(), 80);
      return () => clearTimeout(t);
    }
    setQuery("");
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [isOpen]);

  const popular = isKo ? POPULAR_KO : POPULAR_EN;

  const autocomplete = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (q.length < 2) return [];
    const pool = [...suggestions, ...popular];
    const seen = new Set<string>();
    const out: string[] = [];
    for (const s of pool) {
      const key = s.toLowerCase();
      if (seen.has(key)) continue;
      if (key.includes(q)) {
        seen.add(key);
        out.push(s);
        if (out.length >= 8) break;
      }
    }
    return out;
  }, [query, suggestions, popular]);

  const submit = useCallback(
    (term: string) => {
      const trimmed = term.trim();
      if (!trimmed) return;
      const next = [trimmed, ...recent.filter((r) => r !== trimmed)].slice(
        0,
        MAX_RECENT,
      );
      writeRecent(next);
      setRecent(next);
      closeSearch();
      router.push(`/media?q=${encodeURIComponent(trimmed)}`);
    },
    [recent, closeSearch, router],
  );

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[60] flex flex-col bg-white dark:bg-gray-950 md:hidden">
      <div className="flex h-14 shrink-0 items-center gap-2 border-b border-gray-200 px-3 dark:border-white/10">
        <button
          type="button"
          onClick={closeSearch}
          className="inline-flex h-9 w-9 items-center justify-center rounded-full transition-transform duration-150 active:scale-95 dark:active:bg-white/10 active:bg-gray-100"
          aria-label={isKo ? "닫기" : "Close"}
        >
          <ArrowLeft className="h-5 w-5 text-gray-900 dark:text-white" />
        </button>
        <div className="relative min-w-0 flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input
            ref={inputRef}
            type="search"
            value={queryInput.value}
            onChange={queryInput.onChange}
            onCompositionStart={queryInput.onCompositionStart}
            onCompositionEnd={queryInput.onCompositionEnd}
            onKeyDown={(e) => {
              if (e.key === "Enter") submit(queryInput.value);
            }}
            placeholder={isKo ? "매체, 지역, 유형 검색" : "Search media, area, type"}
            className="h-10 w-full rounded-full border border-gray-200 bg-gray-50 pl-9 pr-9 text-sm text-gray-900 outline-none focus:border-violet-500 dark:border-white/10 dark:bg-white/5 dark:text-white"
            autoComplete="off"
          />
          {queryInput.value ? (
            <button
              type="button"
              onClick={() => setQuery("")}
              className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full p-1"
              aria-label={isKo ? "지우기" : "Clear"}
            >
              <X className="h-4 w-4 text-gray-400" />
            </button>
          ) : null}
        </div>
      </div>

      <div
        className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-4 [-webkit-overflow-scrolling:touch]"
        style={{ overscrollBehavior: "contain" }}
      >
        {query.trim().length >= 2 && autocomplete.length > 0 ? (
          <section>
            <h2 className="mb-2 tkad-type-title uppercase tracking-wider text-gray-400">
              {isKo ? "자동완성" : "Suggestions"}
            </h2>
            <ul className="divide-y divide-gray-200 dark:divide-white/10">
              {autocomplete.map((item) => (
                <li key={item}>
                  <button
                    type="button"
                    onClick={() => submit(item)}
                    className="flex w-full items-center gap-3 py-3 text-left text-sm text-gray-900 transition-colors active:bg-gray-100 dark:text-white dark:active:bg-white/5"
                  >
                    <Search className="h-4 w-4 shrink-0 text-violet-500" />
                    {item}
                  </button>
                </li>
              ))}
            </ul>
          </section>
        ) : (
          <>
            {recent.length > 0 ? (
              <section className="mb-6">
                <h2 className="mb-2 flex items-center gap-1.5 tkad-type-title uppercase tracking-wider text-gray-400">
                  <Clock className="h-3.5 w-3.5" />
                  {isKo ? "최근 검색" : "Recent"}
                </h2>
                <ul className="flex flex-wrap gap-2">
                  {recent.map((item) => (
                    <li key={item}>
                      <button
                        type="button"
                        onClick={() => submit(item)}
                        className={cn(
                          "rounded-full border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-700 transition-transform duration-150 active:scale-95 dark:border-white/10 dark:text-white/80",
                          "active:bg-gray-100 dark:active:bg-white/5",
                        )}
                      >
                        {item}
                      </button>
                    </li>
                  ))}
                </ul>
              </section>
            ) : null}

            <section>
              <h2 className="mb-2 flex items-center gap-1.5 tkad-type-title uppercase tracking-wider text-gray-400">
                <TrendingUp className="h-3.5 w-3.5" />
                {isKo ? "인기 검색" : "Popular"}
              </h2>
              <ul className="divide-y divide-gray-200 dark:divide-white/10">
                {popular.map((item) => (
                  <li key={item}>
                    <button
                      type="button"
                      onClick={() => submit(item)}
                      className="flex w-full items-center gap-3 py-3.5 text-left text-sm text-gray-900 transition-colors active:bg-gray-100 dark:text-white dark:active:bg-white/5"
                    >
                      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-violet-500/10 text-xs font-bold text-violet-500">
                        #
                      </span>
                      {item}
                    </button>
                  </li>
                ))}
              </ul>
            </section>
          </>
        )}
      </div>
    </div>
  );
}
