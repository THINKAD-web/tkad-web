"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { useTranslations } from "next-intl";
import { Search, X } from "lucide-react";
import {
  matchesMediaTextQuery,
  typeLabels,
  type MediaItem,
} from "@/lib/media-data";
import { formatMediaLocationShort } from "@/lib/media-location-format";
import {
  formatMediaPriceWonWithSymbol,
  mediaPricePeriodTranslationKey,
} from "@/lib/media-price-format";

interface Props {
  /** 서버 `fetchPublicMediaCatalog()` 등에서 내려준 공개 매체 목록(필수). */
  catalog: MediaItem[];
  locale: string;
  onSelect: (media: MediaItem) => void;
  /** Fired when the user clicks Search or presses Enter (without picking a dropdown row). */
  onSearchSubmit?: (query: string) => void;
  /** Fired on every input change so the parent can clear text filters when the field is emptied. */
  onQueryChange?: (query: string) => void;
  searchButtonLabel?: string;
  placeholder?: string;
}

export default function MediaSearchAutocomplete({
  catalog,
  locale,
  onSelect,
  onSearchSubmit,
  onQueryChange,
  searchButtonLabel,
  placeholder,
}: Props) {
  const isKo = locale === "ko";
  const tMedia = useTranslations("media");
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<MediaItem[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  const search = useCallback(
    (q: string) => {
      if (!q.trim()) {
        setResults([]);
        setIsOpen(false);
        return;
      }
      const lower = q.toLowerCase();
      const matched = catalog
        .filter((m) => matchesMediaTextQuery(m, lower))
        .slice(0, 5);
      setResults(matched);
      setIsOpen(matched.length > 0);
      setActiveIndex(-1);
    },
    [catalog]
  );

  const handleChange = (value: string) => {
    setQuery(value);
    onQueryChange?.(value);
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => search(value), 300);
  };

  const submitTextSearch = () => {
    const q = query.trim();
    onSearchSubmit?.(q);
    setIsOpen(false);
  };

  const handleSelect = (media: MediaItem) => {
    setQuery(isKo ? media.name : media.nameEn);
    setIsOpen(false);
    onSelect(media);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown" && isOpen && results.length > 0) {
      e.preventDefault();
      setActiveIndex((prev) => (prev < results.length - 1 ? prev + 1 : 0));
      return;
    }
    if (e.key === "ArrowUp" && isOpen && results.length > 0) {
      e.preventDefault();
      setActiveIndex((prev) => (prev > 0 ? prev - 1 : results.length - 1));
      return;
    }
    if (e.key === "Enter") {
      if (isOpen && activeIndex >= 0 && results[activeIndex]) {
        e.preventDefault();
        handleSelect(results[activeIndex]);
        return;
      }
      if (onSearchSubmit) {
        e.preventDefault();
        submitTextSearch();
      }
      return;
    }
    if (e.key === "Escape") {
      setIsOpen(false);
    }
  };

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node) &&
        !inputRef.current?.contains(e.target as Node)
      ) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  const btnLabel = searchButtonLabel ?? (isKo ? "검색" : "Search");

  return (
    <div className="relative">
      <div className="flex gap-2">
        <div className="relative min-w-0 flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => handleChange(e.target.value)}
            onKeyDown={handleKeyDown}
            onFocus={() => query.trim() && results.length > 0 && setIsOpen(true)}
            placeholder={
              placeholder ??
              (isKo ? "매체명, 지역, 유형 검색..." : "Search name, location, type...")
            }
            className="w-full rounded-lg border bg-white py-2.5 pl-10 pr-9 text-sm outline-none transition-colors focus:border-gold focus:ring-1 focus:ring-gold/30"
          />
          {query && (
            <button
              type="button"
              onClick={() => {
                setQuery("");
                onQueryChange?.("");
                setResults([]);
                setIsOpen(false);
                inputRef.current?.focus();
              }}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-navy"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
        {onSearchSubmit && (
          <button
            type="button"
            onClick={submitTextSearch}
            className="shrink-0 rounded-lg bg-navy px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-navy/90"
          >
            {btnLabel}
          </button>
        )}
      </div>

      {isOpen && (
        <div
          ref={dropdownRef}
          className="absolute z-50 mt-1 w-full rounded-lg border bg-white shadow-lg"
        >
          {results.map((media, idx) => (
            <button
              key={media.id}
              onClick={() => handleSelect(media)}
              className={`flex w-full items-center gap-3 px-4 py-3 text-left text-sm transition-colors first:rounded-t-lg last:rounded-b-lg ${
                idx === activeIndex
                  ? "bg-gold/10 text-navy"
                  : "hover:bg-slate-50"
              }`}
            >
              <div className="flex-1 min-w-0">
                <div className="font-medium text-navy truncate">
                  {isKo ? media.name : media.nameEn}
                </div>
                <div className="text-xs text-muted-foreground truncate">
                  {formatMediaLocationShort(media, isKo)} ·{" "}
                  {isKo ? typeLabels[media.type]?.ko : typeLabels[media.type]?.en}
                </div>
              </div>
              <span className="shrink-0 text-right text-[11px] font-semibold leading-tight text-gold-dark">
                {formatMediaPriceWonWithSymbol(media.price)}
                <span className="ml-0.5 text-[10px] font-medium text-muted-foreground">
                  · {tMedia(mediaPricePeriodTranslationKey(media.pricePeriod))}
                </span>
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
