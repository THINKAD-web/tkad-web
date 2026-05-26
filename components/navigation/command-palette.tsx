"use client";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useLocale } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { ArrowRight, Clock, Loader2, Search, Zap } from "lucide-react";
import Modal from "@/components/ui/modal";
import { Link } from "@/i18n/navigation";
import { cn } from "@/lib/utils";
import {
  COMMAND_QUICK_LINKS,
  type TopNavLink,
} from "@/lib/navigation/desktop-top-nav";
import { readRecentPages } from "@/lib/navigation/recent-pages";
import { readRecentSearches, pushRecentSearch } from "@/lib/search-storage";
import type {
  UnifiedSearchHit,
  UnifiedSearchResults,
} from "@/lib/unified-search";
type Props = { open: boolean; onClose: () => void };
type PaletteRow = {
  id: string;
  label: string;
  subtitle?: string;
  href?: string;
  action?: () => void;
  group: string;
};
export function CommandPalette({ open, onClose }: Props) {
  const locale = useLocale();
  const isKo = locale === "ko";
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState("");
  const [activeIdx, setActiveIdx] = useState(0);
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<UnifiedSearchResults | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout>>(undefined);
  useEffect(() => {
    if (open) {
      setQuery("");
      setResults(null);
      setActiveIdx(0);
      queueMicrotask(() => inputRef.current?.focus());
    }
  }, [open]);
  const staticRows = useMemo((): PaletteRow[] => {
    const recent = readRecentPages().slice(0, 5);
    const cmds = COMMAND_QUICK_LINKS.map((link: TopNavLink) => ({
      id: link.id,
      label: isKo ? link.labelKo : link.labelEn,
      href: link.href,
      group: isKo ? "빠른 이동" : "Quick nav",
    }));
    const recentRows = recent.map((p) => ({
      id: p.href,
      label: isKo ? p.labelKo : p.labelEn,
      subtitle: p.href,
      href: p.href,
      group: isKo ? "최근 페이지" : "Recent",
    }));
    return [...recentRows, ...cmds];
  }, [isKo, open]);
  const searchRows = useMemo((): PaletteRow[] => {
    if (!results) return [];
    const rows: PaletteRow[] = [];
    const sections: (keyof Pick<
      UnifiedSearchResults,
      "media" | "packages" | "cases" | "reports" | "academy"
    >)[] = ["media", "packages", "cases", "reports", "academy"];
    for (const key of sections) {
      for (const hit of results[key] ?? []) {
        rows.push({
          id: `${key}-${hit.id}`,
          label: hit.title,
          subtitle: hit.subtitle ?? undefined,
          href: hit.href,
          group: isKo ? "검색 결과" : "Search",
        });
      }
    }
    return rows;
  }, [results, isKo]);
  const filteredStatic = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return staticRows;
    return staticRows.filter(
      (r) =>
        r.label.toLowerCase().includes(q) ||
        r.subtitle?.toLowerCase().includes(q),
    );
  }, [query, staticRows]);
  const allRows = query.trim()
    ? [...searchRows, ...filteredStatic]
    : filteredStatic;
  useEffect(() => {
    setActiveIdx(0);
  }, [query, allRows.length]);
  useEffect(() => {
    if (!open) return;
    const q = query.trim();
    if (!q) {
      setResults(null);
      return;
    }
    clearTimeout(timerRef.current);
    timerRef.current = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await fetch(
          `/api/search?q=${encodeURIComponent(q)}&locale=${encodeURIComponent(locale)}&perSection=4`,
        );
        const data = (await res.json()) as {
          ok?: boolean;
          data?: UnifiedSearchResults;
        };
        setResults(data?.ok ? (data.data ?? null) : null);
        pushRecentSearch(q);
      } catch {
        setResults(null);
      } finally {
        setLoading(false);
      }
    }, 220);
    return () => clearTimeout(timerRef.current);
  }, [query, locale, open]);
  const pick = useCallback(
    (row: PaletteRow) => {
      onClose();
      if (row.action) {
        row.action();
        return;
      }
      if (row.href) router.push(row.href);
    },
    [onClose, router],
  );
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setActiveIdx((i) => Math.min(i + 1, allRows.length - 1));
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setActiveIdx((i) => Math.max(i - 1, 0));
      } else if (e.key === "Enter" && allRows[activeIdx]) {
        e.preventDefault();
        pick(allRows[activeIdx]!);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, allRows, activeIdx, pick]);
  let lastGroup = "";
  return (
    <Modal
      open={open}
      onClose={onClose}
      className="max-w-2xl overflow-hidden rounded-2xl border border-gray-200 bg-white p-0 shadow-2xl dark:border-white/10 dark:bg-[#0a0a12]"
      ariaLabel={isKo ? "명령 팔레트" : "Command palette"}
    >
      {" "}
      <div className="flex items-center gap-3 border-b border-gray-200 px-4 py-3 dark:border-white/10">
        {" "}
        <Search className="h-5 w-5 shrink-0 text-gray-400" aria-hidden />{" "}
        <input
          ref={inputRef}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={
            isKo
              ? "매체 검색 · 페이지 이동 · 명령..."
              : "Search media, pages, commands..."
          }
          className="min-w-0 flex-1 bg-transparent text-base text-gray-900 outline-none placeholder:text-gray-400 dark:text-white"
        />{" "}
        {loading ? (
          <Loader2 className="h-4 w-4 animate-spin text-gray-400" />
        ) : null}{" "}
        <kbd className="hidden rounded border border-gray-200 px-1.5 py-0.5 text-[10px] text-gray-400 sm:inline dark:border-white/15">
          {" "}
          ESC{" "}
        </kbd>{" "}
      </div>{" "}
      <div className="max-h-[min(60vh,28rem)] overflow-y-auto overscroll-contain p-2">
        {" "}
        {allRows.length === 0 ? (
          <p className="px-3 py-8 text-center text-sm text-gray-500 dark:text-white/50">
            {" "}
            {query.trim()
              ? isKo
                ? "결과가 없습니다"
                : "No results"
              : isKo
                ? "명령어 또는 검색어를 입력하세요"
                : "Type to search or navigate"}{" "}
          </p>
        ) : (
          allRows.map((row, idx) => {
            const showGroup = row.group !== lastGroup;
            lastGroup = row.group;
            return (
              <div key={row.id}>
                {" "}
                {showGroup ? (
                  <p className="px-3 pb-1 pt-3 text-[10px] font-bold uppercase tracking-wider text-gray-400 dark:text-white/40">
                    {" "}
                    {row.group}{" "}
                  </p>
                ) : null}{" "}
                <button
                  type="button"
                  onClick={() => pick(row)}
                  className={cn(
                    "flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left transition-colors",
                    idx === activeIdx
                      ? "bg-cyan-400/10 dark:bg-white/8"
                      : "hover:bg-gray-100 dark:hover:bg-white/5",
                  )}
                >
                  {" "}
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-gray-100 dark:bg-white/8">
                    {" "}
                    {row.group.includes("Recent") ||
                    row.group.includes("최근") ? (
                      <Clock className="h-4 w-4 text-gray-500" />
                    ) : row.group.includes("Search") ||
                      row.group.includes("검색") ? (
                      <Search className="h-4 w-4 text-gray-500" />
                    ) : (
                      <Zap className="h-4 w-4 tkad-home-accent-text" />
                    )}{" "}
                  </span>{" "}
                  <span className="min-w-0 flex-1">
                    {" "}
                    <span className="block truncate text-sm font-semibold text-gray-900 dark:text-white">
                      {" "}
                      {row.label}{" "}
                    </span>{" "}
                    {row.subtitle ? (
                      <span className="block truncate text-xs text-gray-500 dark:text-white/50">
                        {" "}
                        {row.subtitle}{" "}
                      </span>
                    ) : null}{" "}
                  </span>{" "}
                  <ArrowRight
                    className="h-4 w-4 shrink-0 text-gray-300"
                    aria-hidden
                  />{" "}
                </button>{" "}
              </div>
            );
          })
        )}{" "}
      </div>{" "}
      <div className="border-t border-gray-200 px-4 py-2 dark:border-white/10">
        {" "}
        <p className="text-[10px] text-gray-400 dark:text-white/40">
          {" "}
          ↑↓ {isKo ? "탐색" : "navigate"} · Enter {isKo ? "이동" : "go"} · ⌘K{" "}
          {isKo ? "열기" : "open"}{" "}
        </p>{" "}
      </div>{" "}
    </Modal>
  );
}
