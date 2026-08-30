"use client";

import Image from "next/image";
import { useEffect, useId, useMemo, useRef, useState } from "react";
import {
  ChevronDown,
  Filter,
  Inbox,
  Lightbulb,
  RotateCcw,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import { MediaKeywordSearchHero } from "@/components/media-keyword-search-hero";
import type {
  KeywordFilterFacetKey,
  KeywordFilterMediaItem,
  KeywordFilterSelection,
} from "@/lib/media-keyword-filter-types";
import {
  KEYWORD_FILTER_FACET_KEYS,
  KEYWORD_FILTER_FACET_LABELS_KO,
  emptyKeywordFilterSelection,
} from "@/lib/media-keyword-filter-types";
import {
  KEYWORD_FILTER_DEFAULT_SORT,
  KEYWORD_FILTER_POPULAR_KEYWORD_SUGGESTIONS,
  KEYWORD_FILTER_SEARCH_DEBOUNCE_MS,
  collectFacetOptions,
  countActiveFilters,
  filterKeywordMediaItems,
  previewTags,
  removeChip,
  selectionToChips,
  sortKeywordMediaItems,
  toggleSelectionValue,
  truncateText,
} from "@/lib/media-keyword-filter-logic";
import type { KeywordFilterSortMode } from "@/lib/media-keyword-filter-logic";

export type MediaKeywordFilterClientProps = {
  items: KeywordFilterMediaItem[];
  className?: string;
};

const SORT_OPTIONS: { value: KeywordFilterSortMode; label: string }[] = [
  { value: "recommended", label: "추천순" },
  { value: "priceAsc", label: "가격 낮은 순" },
  { value: "priceDesc", label: "가격 높은 순" },
  { value: "titleAsc", label: "매체 이름순" },
];

/** 빈 상태 인기 키워드 노출 개수 */
const EMPTY_STATE_POPULAR_COUNT = 5;

/** 임시 페이지네이션 — 나중에 virtualizer·무한 스크롤로 교체 */
const INITIAL_VISIBLE_COUNT = 9;
const LOAD_MORE_STEP = 9;

function FilterSidebarBody({
  options,
  selection,
  onToggle,
  idPrefix,
}: {
  options: ReturnType<typeof collectFacetOptions>;
  selection: KeywordFilterSelection;
  onToggle: (facet: KeywordFilterFacetKey, value: string, checked: boolean) => void;
  idPrefix: string;
}) {
  return (
    <div className="flex flex-col gap-6">
      {KEYWORD_FILTER_FACET_KEYS.map((facet) => {
        const vals = options[facet];
        if (vals.length === 0) return null;
        const label = KEYWORD_FILTER_FACET_LABELS_KO[facet];
        return (
          <fieldset key={facet} className="min-w-0">
            <legend className="mb-2 text-xs font-bold uppercase tracking-wide text-navy/70">
              {label}
            </legend>
            <ul className="max-h-48 space-y-1.5 overflow-y-auto pr-1 text-sm">
              {vals.map((value) => {
                const id = `${idPrefix}-${facet}-${encodeURIComponent(value)}`;
                const checked = selection[facet].includes(value);
                return (
                  <li key={value} className="flex min-w-0 items-start gap-2">
                    <input
                      id={id}
                      type="checkbox"
                      checked={checked}
                      onChange={(e) =>
                        onToggle(facet, value, e.target.checked)
                      }
                      className="mt-1 size-4 shrink-0 rounded border-border text-primary focus:ring-primary"
                    />
                    <label
                      htmlFor={id}
                      className="cursor-pointer leading-snug break-words text-foreground"
                    >
                      {value}
                    </label>
                  </li>
                );
              })}
            </ul>
          </fieldset>
        );
      })}
    </div>
  );
}

/** 검색어 전용 칩 — 라벨은 검색어 본문만, 앰버 톤으로 필터 칩과 구분 */
function SearchQueryChip({
  queryText,
  onRemove,
}: {
  queryText: string;
  onRemove: () => void;
}) {
  const display = truncateText(queryText, 48);
  return (
    <button
      type="button"
      onClick={onRemove}
      aria-label={`검색어 지우기: ${queryText}`}
      className={cn(
        "inline-flex max-w-full min-w-0 items-center gap-1 rounded-full pl-3.5 pr-1.5 py-1 text-xs font-medium shadow-sm transition-colors",
        "bg-amber-100 text-amber-950 ring-1 ring-amber-200 hover:bg-amber-200/85 hover:ring-amber-300",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 focus-visible:ring-offset-2",
      )}
    >
      <span className="min-w-0 truncate text-left">{display}</span>
      <span
        className="flex size-6 shrink-0 items-center justify-center rounded-full hover:bg-amber-300/50"
        aria-hidden
      >
        <X className="size-3.5" strokeWidth={2.5} />
      </span>
    </button>
  );
}

function KeywordFilterEmptyState({
  onPickPopularKeyword,
  onResetAll,
}: {
  /** 검색어 반영 + 필터·정렬 초기화 */
  onPickPopularKeyword: (text: string) => void;
  onResetAll: () => void;
}) {
  const popularSlice = KEYWORD_FILTER_POPULAR_KEYWORD_SUGGESTIONS.slice(
    0,
    EMPTY_STATE_POPULAR_COUNT,
  );

  return (
    <div
      className={cn(
        "rounded-2xl border border-dashed border-navy/20 bg-gradient-to-b from-card via-card to-navy/[0.04] px-6 py-14 text-center shadow-sm",
        "sm:px-10",
      )}
      role="status"
      aria-live="polite"
    >
      <div className="mx-auto mb-4 flex size-14 items-center justify-center rounded-full bg-navy/[0.06] text-navy/70 ring-1 ring-navy/10">
        <Inbox className="size-7" strokeWidth={1.75} aria-hidden />
      </div>
      <h2 className="text-balance text-lg font-bold text-navy sm:text-xl">
        아직 조건에 맞는 매체가 없어요
      </h2>
      <p className="mx-auto mt-3 max-w-lg text-pretty text-sm leading-relaxed text-muted-foreground">
        검색어가 너무 구체적이거나, 필터가 겹쳐서 결과가 비었을 수 있어요.
        왼쪽(또는 상단)에서 필터를 하나씩 해제해 보시거나, 아래 인기 키워드를
        눌러 보세요. 키워드만 넣은 깨끗한 상태에서 다시 찾아드립니다.
      </p>
      <div className="mx-auto mt-10 max-w-md rounded-xl border border-navy/10 bg-navy/[0.03] px-4 py-5">
        <div className="mb-3 flex items-center justify-center gap-2 text-xs font-bold uppercase tracking-wide text-navy/60">
          <Lightbulb className="size-3.5 text-gold" aria-hidden />
          이런 키워드는 어떠세요?
        </div>
        <div className="flex flex-wrap justify-center gap-2">
          {popularSlice.map((phrase) => (
            <button
              key={phrase}
              type="button"
              onClick={() => onPickPopularKeyword(phrase)}
              className={cn(
                "rounded-full border border-navy/12 bg-card px-4 py-2 text-xs font-semibold text-navy shadow-sm",
                "transition-ui hover:border-gold/45 hover:bg-gold/10 hover:shadow-md",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold focus-visible:ring-offset-2",
              )}
            >
              {phrase}
            </button>
          ))}
        </div>
        <p className="mt-3 text-center text-[11px] leading-snug text-muted-foreground">
          선택 시 검색창에 반영되고, 적용 중이던 필터와 정렬은 초기화돼요.
        </p>
      </div>
      <Button
        type="button"
        variant="outline"
        className="mt-8 border-2 border-navy/25 font-bold text-navy hover:bg-navy/[0.04]"
        onClick={onResetAll}
      >
        <RotateCcw className="size-3.5" />
        검색·필터·정렬 모두 초기화
      </Button>
    </div>
  );
}

export function MediaKeywordFilterClient({
  items,
  className,
}: MediaKeywordFilterClientProps) {
  const reactId = useId();
  const idPrefix = `kwf-${reactId.replace(/:/g, "")}`;
  const sortSelectId = `${idPrefix}-sort`;

  const [searchInput, setSearchInput] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [selection, setSelection] = useState<KeywordFilterSelection>(() =>
    emptyKeywordFilterSelection(),
  );
  const [mobileSheetOpen, setMobileSheetOpen] = useState(false);
  const [sortMode, setSortMode] = useState<KeywordFilterSortMode>(
    KEYWORD_FILTER_DEFAULT_SORT,
  );

  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    debounceTimerRef.current = setTimeout(() => {
      setDebouncedQuery(searchInput);
      debounceTimerRef.current = null;
    }, KEYWORD_FILTER_SEARCH_DEBOUNCE_MS);
    return () => {
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    };
  }, [searchInput]);

  const facetOptions = useMemo(() => collectFacetOptions(items), [items]);

  const filtered = useMemo(
    () => filterKeywordMediaItems(items, debouncedQuery, selection),
    [items, debouncedQuery, selection],
  );

  const sorted = useMemo(
    () => sortKeywordMediaItems(filtered, sortMode, items),
    [filtered, sortMode, items],
  );

  const selectionFingerprint = useMemo(
    () => JSON.stringify(selection),
    [selection],
  );
  const visibleStateKey = `${debouncedQuery}::${selectionFingerprint}`;
  const [visibleState, setVisibleState] = useState(() => ({
    key: visibleStateKey,
    count: INITIAL_VISIBLE_COUNT,
  }));
  const visibleCount =
    visibleState.key === visibleStateKey
      ? visibleState.count
      : Math.min(INITIAL_VISIBLE_COUNT, sorted.length);

  /**
   * --------------------------------------------------------------------------
   * 무한 스크롤 / 대량 목록 대비
   *
   * - 현재는 `visibleCount` + 아래「더 보기」버튼으로 임시 페이지네이션만 둡니다.
   * - 이후 `@tanstack/react-virtual` 등으로 교체 시: `sorted` 전체를 가상화하고
   *   이 버튼·`visibleCount` 상태는 제거하거나 IO sentinel 기반 무한 스크롤로
   *   바꾸면 됩니다. 리스트 맨 아래 `<li ref={sentinelRef} />` + IntersectionObserver
   *   패턴도 동일 지점에서 적용 가능합니다.
   * --------------------------------------------------------------------------
   */
  const displayed = useMemo(
    () => sorted.slice(0, visibleCount),
    [sorted, visibleCount],
  );
  const canLoadMore = visibleCount < sorted.length;
  const remainingCount = sorted.length - visibleCount;

  const facetChips = useMemo(() => selectionToChips(selection), [selection]);
  const activeFilterCount = countActiveFilters(selection);

  const hasSearchInput = searchInput.trim().length > 0;
  const hasActiveState =
    hasSearchInput || facetChips.length > 0 || debouncedQuery.trim().length > 0;

  const onToggle = (facet: KeywordFilterFacetKey, value: string, checked: boolean) => {
    setSelection((prev) => toggleSelectionValue(prev, facet, value, checked));
  };

  const onRemoveFacetChip = (facet: KeywordFilterFacetKey, value: string) => {
    setSelection((prev) => removeChip(prev, facet, value));
  };

  const clearSearch = () => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
      debounceTimerRef.current = null;
    }
    setSearchInput("");
    setDebouncedQuery("");
  };

  const onResetAll = () => {
    clearSearch();
    setSelection(emptyKeywordFilterSelection());
    setSortMode(KEYWORD_FILTER_DEFAULT_SORT);
  };

  /** 빈 상태 인기 키워드: 검색어 반영 + 필터·정렬 초기화 */
  const applyPopularKeyword = (text: string) => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
      debounceTimerRef.current = null;
    }
    setSearchInput(text);
    setDebouncedQuery(text);
    setSelection(emptyKeywordFilterSelection());
    setSortMode(KEYWORD_FILTER_DEFAULT_SORT);
  };

  return (
    <div className={cn("min-h-screen bg-page pb-32", className)}>
      <MediaKeywordSearchHero
        variant="gradient"
        value={searchInput}
        onChange={setSearchInput}
      />

      {/* 활성 칩 + 정렬 + 전체 초기화 */}
      <div className="sticky top-0 z-20 border-b border-border/60 bg-page/95 px-4 py-3 backdrop-blur-md">
        <div className="mx-auto flex max-w-7xl flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
          <div className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-2">
            <span className="shrink-0 text-xs font-semibold tabular-nums text-navy/70">
              {sorted.length}
              <span className="font-normal text-muted-foreground">
                {" "}
                / {items.length}건
              </span>
            </span>

            {hasActiveState && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                className={cn(
                  "h-9 shrink-0 gap-1.5 rounded-lg border-2 border-navy/35 bg-card px-3.5 text-xs font-bold text-navy shadow-sm",
                  "hover:border-navy/55 hover:bg-navy/[0.06] hover:text-navy",
                  "focus-visible:ring-2 focus-visible:ring-navy/30",
                )}
                onClick={onResetAll}
              >
                <RotateCcw className="size-3.5" />
                전체 초기화
              </Button>
            )}

            {hasSearchInput && (
              <SearchQueryChip
                queryText={searchInput.trim()}
                onRemove={clearSearch}
              />
            )}

            {facetChips.map(({ facet, value }) => (
              <button
                key={`${facet}-${value}`}
                type="button"
                onClick={() => onRemoveFacetChip(facet, value)}
                aria-label={`필터 제거: ${KEYWORD_FILTER_FACET_LABELS_KO[facet]} ${value}`}
                className={cn(
                  "inline-flex max-w-full items-center gap-1 rounded-full pl-3.5 pr-1.5 py-1 text-xs font-medium shadow-sm transition-colors",
                  "bg-indigo-50 text-indigo-950 ring-1 ring-indigo-200/70 hover:bg-indigo-100",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400 focus-visible:ring-offset-2",
                )}
              >
                <span className="min-w-0 truncate">
                  {KEYWORD_FILTER_FACET_LABELS_KO[facet]} · {value}
                </span>
                <span
                  className="flex size-6 shrink-0 items-center justify-center rounded-full hover:bg-indigo-200/70"
                  aria-hidden
                >
                  <X className="size-3.5" strokeWidth={2.5} />
                </span>
              </button>
            ))}
          </div>

          <div className="flex shrink-0 flex-col gap-1 sm:items-end">
            <span
              id={`${sortSelectId}-caption`}
              className="whitespace-nowrap text-[10px] font-bold uppercase tracking-[0.12em] text-navy/45 sm:text-right"
            >
              정렬 기준
            </span>
            <div className="relative">
              <label htmlFor={sortSelectId} className="sr-only">
                결과 정렬 방식
              </label>
              <select
                id={sortSelectId}
                aria-describedby={`${sortSelectId}-caption`}
                value={sortMode}
                onChange={(e) =>
                  setSortMode(e.target.value as KeywordFilterSortMode)
                }
                className={cn(
                  "h-10 min-w-[11.5rem] cursor-pointer appearance-none rounded-xl border border-navy/12 bg-card py-0 pl-3.5 pr-10",
                  "text-sm font-medium text-navy shadow-sm ring-offset-background",
                  "transition-[border-color,box-shadow] hover:border-navy/22 hover:shadow-md",
                  "focus-visible:border-navy/35 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-navy/15 focus-visible:ring-offset-2",
                )}
              >
                {SORT_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
              <ChevronDown
                className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-navy/35"
                aria-hidden
                strokeWidth={2.25}
              />
            </div>
          </div>
        </div>
      </div>

      <div className="mx-auto flex max-w-7xl flex-col gap-6 px-4 py-6 lg:flex-row lg:gap-8">
        <aside className="hidden w-[260px] shrink-0 lg:block">
          <div className="sticky top-24 max-h-[calc(100vh-7rem)] overflow-y-auto rounded-xl border border-border/70 bg-card p-4 shadow-sm">
            <h2 className="mb-4 text-sm font-bold text-navy">필터</h2>
            <FilterSidebarBody
              options={facetOptions}
              selection={selection}
              onToggle={onToggle}
              idPrefix={idPrefix}
            />
          </div>
        </aside>

        <div className="flex items-center gap-2 lg:hidden">
          <Sheet open={mobileSheetOpen} onOpenChange={setMobileSheetOpen}>
            <SheetTrigger asChild>
              <Button
                type="button"
                variant="outline"
                className="w-full border-navy/20"
              >
                <Filter className="size-4" />
                필터
                {activeFilterCount > 0 && (
                  <Badge
                    variant="secondary"
                    className="ml-1 rounded-full px-1.5 text-[10px]"
                  >
                    {activeFilterCount}
                  </Badge>
                )}
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-[min(100vw-2rem,20rem)]">
              <SheetHeader>
                <SheetTitle>필터</SheetTitle>
              </SheetHeader>
              <div className="mt-4 overflow-y-auto pb-8">
                <FilterSidebarBody
                  options={facetOptions}
                  selection={selection}
                  onToggle={onToggle}
                  idPrefix={`${idPrefix}-m`}
                />
              </div>
            </SheetContent>
          </Sheet>
        </div>

        <main className="min-w-0 flex-1">
          {sorted.length === 0 ? (
            <KeywordFilterEmptyState
              onPickPopularKeyword={applyPopularKeyword}
              onResetAll={onResetAll}
            />
          ) : (
            <div className="flex flex-col">
              <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
                {displayed.map((m) => (
                  <li key={m.id}>
                    <Card className="flex h-full flex-col gap-0 overflow-hidden border-border/80 py-0 transition-shadow hover:translate-y-0 hover:shadow-lg motion-reduce:hover:translate-y-0">
                      <div className="relative aspect-[16/10] w-full bg-muted">
                        <Image
                          src={m.thumbnail}
                          alt={m.title}
                          fill
                          className="object-cover"
                          sizes="(max-width:640px) 100vw, (max-width:1280px) 50vw, 33vw"
                        />
                        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-navy/90 to-transparent px-3 pt-10 pb-2">
                          <p className="text-xs font-medium dark:text-white text-gray-800">
                            {m.priceText}
                          </p>
                        </div>
                      </div>
                      <CardHeader className="px-4 pb-2 pt-4">
                        <CardTitle className="line-clamp-2 text-base font-bold leading-snug text-navy">
                          {m.title}
                        </CardTitle>
                        <div className="flex flex-wrap gap-1.5 pt-1">
                          {previewTags(m).map((t) => (
                            <Badge
                              key={`${m.id}-${t}`}
                              variant="secondary"
                              className="font-normal text-[11px] text-muted-foreground"
                            >
                              {t}
                            </Badge>
                          ))}
                        </div>
                      </CardHeader>
                      <CardContent className="flex-1 px-4 pb-2 pt-0">
                        <CardDescription className="line-clamp-3 text-sm leading-relaxed">
                          {truncateText(m.description, 140)}
                        </CardDescription>
                      </CardContent>
                      <CardFooter className="mt-auto flex flex-col gap-2 border-t border-border/50 px-4 py-4 sm:flex-row sm:flex-wrap">
                        <a
                          href="#"
                          className={cn(
                            "inline-flex w-full min-w-0 flex-1 items-center justify-center rounded-lg border border-navy/20 bg-card px-3 py-2.5 text-center text-xs font-semibold text-navy transition-colors sm:min-w-[6.5rem]",
                            "hover:border-navy/40 hover:bg-navy/[0.04]",
                            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-navy/25",
                          )}
                        >
                          자세히 보기
                        </a>
                        <button
                          type="button"
                          onClick={() => {
                            window.alert(`${m.title} 견적 문의`);
                          }}
                          className={cn(
                            "inline-flex w-full min-w-0 flex-1 items-center justify-center rounded-lg bg-navy px-3 py-2.5 text-center text-xs font-semibold dark:text-white text-gray-900 shadow-sm transition-colors sm:min-w-[6.5rem]",
                            "hover:bg-navy-light",
                            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold focus-visible:ring-offset-2",
                          )}
                        >
                          견적 문의하기
                        </button>
                      </CardFooter>
                    </Card>
                  </li>
                ))}
              </ul>
              {canLoadMore ? (
                <div className="mt-10 flex flex-col items-center gap-1 border-t border-border/50 pt-8">
                  {/*
                    임시 UI — virtualizer·무한 스크롤 도입 시 제거하고
                    rowVirtualizer 또는 IO sentinel으로 대체
                  */}
                  <Button
                    type="button"
                    variant="outline"
                    size="lg"
                    className="min-w-[12rem] rounded-xl border-2 border-navy/20 font-bold text-navy hover:bg-navy/[0.04]"
                    onClick={() => {
                      setVisibleState({
                        key: visibleStateKey,
                        count: Math.min(visibleCount + LOAD_MORE_STEP, sorted.length),
                      });
                    }}
                  >
                    더 보기
                    <span className="ml-1.5 tabular-nums text-xs font-semibold text-muted-foreground">
                      ({remainingCount}건 남음)
                    </span>
                  </Button>
                </div>
              ) : null}
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
