"use client";

import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { X, ExternalLink, MessageCircle } from "lucide-react";
import Image from "next/image";
import { Link } from "@/i18n/navigation";
import { cn } from "@/lib/utils";
import type { MapMapItem } from "./media-map-types";
import { formatMediaPriceWithPeriodSuffix } from "@/lib/media-price-format";
import { buildMapItemMetrics } from "@/lib/media-map/map-item-metrics";
import { MediaCard } from "@/components/media/media-card";
import { mapMapItemToHomeCatalog, catalogThumbnailImageProps } from "@/lib/media-catalog-map";
import { mediaCardStaticHandlers } from "@/lib/media-card-static-handlers";
import { MediaCompareSelectButton } from "@/components/media/media-compare-select-button";
import { MediaCartAddButton } from "@/components/media/media-cart-add-button";
import { PlanCartAddButton } from "@/components/plan/plan-cart-add-button";
import { planCartItemFromCatalog } from "@/lib/plan-cart-item-builders";
import { MediaPriceExclNote } from "@/components/media/media-price-excl-note";
import { FLOATING_SELECTION_BAR_COMPACT_BOTTOM_CLASS } from "@/components/floating-selection-bar";

type AvailabilitySummary = {
  status: "loading" | "available" | "partial" | "busy" | "unknown";
  label: string;
};

function formatPrice(v: number, period: string, locale: string): string {
  return formatMediaPriceWithPeriodSuffix(v, period, locale);
}

function MapDetailMetric({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="min-w-0 rounded-md border border-gray-100 bg-gray-50/80 px-2 py-1.5 text-center dark:border-white/8 dark:bg-white/[0.04]">
      <dt className="truncate text-[10px] text-gray-500 dark:text-white/45">{label}</dt>
      <dd className="mt-0.5 truncate text-xs font-bold tabular-nums text-gray-900 dark:text-white">
        {value}
      </dd>
    </div>
  );
}

function availabilityTone(status: AvailabilitySummary["status"]): string {
  switch (status) {
    case "available":
      return "text-emerald-700 dark:text-emerald-400";
    case "partial":
      return "text-amber-700 dark:text-amber-400";
    case "busy":
      return "text-rose-700 dark:text-rose-400";
    default:
      return "text-gray-600 dark:text-white/70";
  }
}

function monthRangeYmd(): { from: string; to: string } {
  const now = new Date();
  const y = now.getFullYear();
  const m = now.getMonth();
  const from = `${y}-${String(m + 1).padStart(2, "0")}-01`;
  const last = new Date(y, m + 1, 0);
  const to = `${y}-${String(m + 1).padStart(2, "0")}-${String(last.getDate()).padStart(2, "0")}`;
  return { from, to };
}

type DetailProps = {
  item: MapMapItem;
  onClose: () => void;
  isKo?: boolean;
  variant: "sheet" | "inline" | "dock" | "bottom-sheet";
  inCompare?: boolean;
  inCart?: boolean;
  onToggleCompare?: () => void;
  onToggleCart?: () => void;
};

function CloseButton({
  onClose,
  isKo,
  className,
}: {
  onClose: () => void;
  isKo: boolean;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClose}
      className={cn(
        "inline-flex shrink-0 items-center justify-center rounded-full border border-gray-200 bg-gray-50 text-gray-600 transition-colors hover:bg-gray-100 dark:border-white/12 dark:bg-white/5 dark:text-white dark:hover:bg-white/10",
        className,
      )}
      aria-label={isKo ? "닫기" : "Close"}
    >
      <X className="h-3.5 w-3.5" />
    </button>
  );
}

export function MapDetailQuickActions({
  item,
  inCompare,
  inCart,
  onToggleCompare,
  onToggleCart,
  size = "compact",
  className,
}: {
  item: MapMapItem;
  inCompare?: boolean;
  inCart?: boolean;
  onToggleCompare?: () => void;
  onToggleCart?: () => void;
  size?: "compact" | "comfortable";
  className?: string;
}) {
  const btnClass =
    size === "comfortable"
      ? "min-w-0 flex-1 !h-9 !rounded-lg !px-2 !text-xs"
      : "min-w-0 flex-1 !h-8 !px-1 !text-[10px]";

  return (
    <div
      className={cn(
        "flex items-stretch gap-1.5",
        size === "comfortable" ? "mt-3" : "mt-2",
        className,
      )}
    >
      <PlanCartAddButton
        item={planCartItemFromCatalog(
          {
            id: item.id,
            name: item.name,
            type: item.type,
            region: item.region,
            price: item.price,
            thumbnailUrl: item.image ?? undefined,
          },
          "search",
        )}
        addedFrom="search"
        compact
        gridInline
        className={btnClass}
      />
      {onToggleCompare ? (
        <MediaCompareSelectButton
          selected={inCompare ?? false}
          onToggle={onToggleCompare}
          gridInline
          className={cn(btnClass, size === "comfortable" && "!rounded-lg")}
        />
      ) : null}
      {onToggleCart ? (
        <MediaCartAddButton
          inCart={inCart ?? false}
          onToggle={onToggleCart}
          gridInline
          className={cn(btnClass, size === "comfortable" && "!rounded-lg")}
        />
      ) : null}
    </div>
  );
}

function MediaMapDetailBody({
  item,
  onClose,
  isKo = true,
  variant,
  inCompare,
  inCart,
  onToggleCompare,
  onToggleCart,
}: DetailProps) {
  const catalogItem = useMemo(() => mapMapItemToHomeCatalog(item), [item]);
  const href = `/media/${item.id}`;
  const priceLabel = formatPrice(item.price, item.pricePeriod, isKo ? "ko" : "en");
  const regionLine = [item.region, item.district].filter(Boolean).join(" · ") || item.location;
  const metaLine = [regionLine, priceLabel].filter(Boolean).join(" · ");

  const [availability, setAvailability] = useState<AvailabilitySummary>({
    status: "loading",
    label: isKo ? "이번 달 예약 현황 확인 중…" : "Checking this month…",
  });

  const showAvailability = variant === "sheet";

  useEffect(() => {
    if (!showAvailability) return;
    const { from, to } = monthRangeYmd();
    let cancelled = false;
    setAvailability({
      status: "loading",
      label: isKo ? "이번 달 예약 현황 확인 중…" : "Checking this month…",
    });
    void (async () => {
      try {
        const res = await fetch(
          `/api/public/media/${encodeURIComponent(item.id)}/availability?from=${from}&to=${to}`,
          { cache: "no-store" },
        );
        if (!res.ok) throw new Error("availability");
        const data = (await res.json()) as {
          blockedRanges?: { start: string; end: string }[];
        };
        const blocked = data.blockedRanges?.length ?? 0;
        if (cancelled) return;
        if (blocked === 0) {
          setAvailability({
            status: "available",
            label: isKo ? "이번 달: 가용 일정 있음" : "This month: slots available",
          });
        } else if (blocked <= 4) {
          setAvailability({
            status: "partial",
            label: isKo
              ? `이번 달: 일부 예약됨 (${blocked}구간)`
              : `This month: partially booked (${blocked})`,
          });
        } else {
          setAvailability({
            status: "busy",
            label: isKo ? "이번 달: 예약이 많음 · 문의 권장" : "This month: busy · contact us",
          });
        }
      } catch {
        if (!cancelled) {
          setAvailability({
            status: "unknown",
            label: isKo ? "이번 달: 문의 후 확인" : "This month: contact to confirm",
          });
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [item.id, isKo, showAvailability]);

  const linkRow = (comfortable = false) => (
    <div className={cn("grid grid-cols-2 gap-2", comfortable ? "mt-4" : "mt-3")}>
      <Link
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className={cn(
          "inline-flex items-center justify-center gap-1.5 rounded-xl border border-gray-200 bg-white text-sm font-semibold text-gray-800 transition-colors hover:bg-gray-50 dark:border-white/14 dark:bg-white/8 dark:text-white dark:hover:bg-white/12",
          comfortable ? "min-h-10 px-3 py-2" : "px-3 py-2.5",
        )}
      >
        {isKo ? "상세 보기" : "Details"}
        <ExternalLink className="h-3.5 w-3.5 shrink-0" aria-hidden />
      </Link>
      <Link
        href={`/contact?media=${encodeURIComponent(item.id)}`}
        className={cn(
          "tkad-media-map-sheet-cta inline-flex items-center justify-center gap-1.5 rounded-xl border border-violet-700/30 bg-violet-700 text-sm font-semibold text-white shadow-sm shadow-violet-900/25 transition-colors hover:bg-violet-800",
          comfortable ? "min-h-10 px-3 py-2" : "min-h-11 px-3 py-2.5 font-bold",
        )}
      >
        <MessageCircle className="h-3.5 w-3.5 shrink-0" aria-hidden />
        {isKo ? "문의하기" : "Contact"}
      </Link>
    </div>
  );

  if (variant === "bottom-sheet") {
    const thumb = catalogThumbnailImageProps(catalogItem.thumbnailUrl);
    return (
      <div className="px-3 pb-3 pt-0">
        <Link
          href={href}
          className="flex items-center gap-2.5 rounded-lg transition-colors active:bg-gray-50 dark:active:bg-white/5"
        >
          <div className="relative h-11 w-14 shrink-0 overflow-hidden rounded-md bg-gray-100 dark:bg-gray-800">
            {thumb ? (
              <Image
                src={thumb.src}
                alt=""
                fill
                className="object-cover"
                sizes="56px"
                unoptimized={thumb.unoptimized}
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center text-[10px] text-gray-300 dark:text-white/20">
                —
              </div>
            )}
          </div>
          <div className="min-w-0 flex-1">
            <p className="line-clamp-2 text-[13px] font-semibold leading-snug text-gray-900 dark:text-white">
              {item.name}
            </p>
            <p className="mt-0.5 truncate text-[11px] text-gray-500 dark:text-white/50">
              {regionLine}
            </p>
            <div className="mt-0.5 flex flex-wrap items-baseline gap-x-1.5">
              <p className="text-xs font-bold tabular-nums text-gray-900 dark:text-white">
                {priceLabel}
              </p>
              <MediaPriceExclNote isKo={isKo} className="text-[10px]" />
            </div>
          </div>
        </Link>
        <MapDetailQuickActions
          item={item}
          inCompare={inCompare}
          inCart={inCart}
          onToggleCompare={onToggleCompare}
          onToggleCart={onToggleCart}
          size="compact"
        />
        <div className="mt-2 grid grid-cols-2 gap-1.5">
          <Link
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex h-9 items-center justify-center gap-1 rounded-lg border border-gray-200 bg-white text-xs font-semibold text-gray-800 transition-colors hover:bg-gray-50 dark:border-white/14 dark:bg-white/8 dark:text-white dark:hover:bg-white/12"
          >
            {isKo ? "상세 보기" : "Details"}
            <ExternalLink className="h-3 w-3 shrink-0" aria-hidden />
          </Link>
          <Link
            href={`/contact?media=${encodeURIComponent(item.id)}`}
            className="tkad-media-map-sheet-cta inline-flex h-9 items-center justify-center gap-1 rounded-lg border border-violet-700/30 bg-violet-700 text-xs font-semibold text-white shadow-sm shadow-violet-900/20 transition-colors hover:bg-violet-800"
          >
            <MessageCircle className="h-3 w-3 shrink-0" aria-hidden />
            {isKo ? "문의하기" : "Contact"}
          </Link>
        </div>
      </div>
    );
  }

  if (variant === "inline") {
    return (
      <div className="px-4 py-3">
        <div className="mb-2 flex items-center justify-between gap-2">
          <p className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-white/50">
            {isKo ? "선택한 매체" : "Selected"}
          </p>
          <CloseButton onClose={onClose} isKo={isKo} className="h-8 w-8" />
        </div>
        <MediaCard
          mode="compact"
          item={catalogItem}
          href={href}
          metaLine={metaLine}
          isKo={isKo}
          showPlanButton={false}
          {...mediaCardStaticHandlers}
        />
        <MapDetailQuickActions
          item={item}
          inCompare={inCompare}
          inCart={inCart}
          onToggleCompare={onToggleCompare}
          onToggleCart={onToggleCart}
        />
        {linkRow()}
      </div>
    );
  }

  if (variant === "sheet") {
    const thumb = catalogThumbnailImageProps(catalogItem.thumbnailUrl);
    const locale = isKo ? "ko" : "en";
    const metrics = buildMapItemMetrics(item, isKo, locale);

    return (
      <>
        <div className="flex items-start gap-2 border-b border-gray-200 px-3 py-2.5 dark:border-white/10">
          <p className="min-w-0 flex-1 line-clamp-2 text-sm font-semibold leading-snug text-gray-900 dark:text-white">
            {item.name}
          </p>
          <CloseButton onClose={onClose} isKo={isKo} className="h-8 w-8 shrink-0" />
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-3 py-3">
          <Link
            href={href}
            className="flex gap-3 rounded-lg transition-colors hover:bg-gray-50 dark:hover:bg-white/[0.04]"
          >
            <div className="relative h-16 w-20 shrink-0 overflow-hidden rounded-lg bg-gray-100 dark:bg-gray-800">
              {thumb ? (
                <Image
                  src={thumb.src}
                  alt=""
                  fill
                  className="object-cover"
                  sizes="80px"
                  unoptimized={thumb.unoptimized}
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center text-[10px] text-gray-300 dark:text-white/20">
                  —
                </div>
              )}
            </div>
            <div className="min-w-0 flex-1">
              {(item.isInstantBooking || item.isVerified) && (
                <div className="mb-1 flex flex-wrap gap-1">
                  {item.isInstantBooking ? (
                    <span className="rounded bg-violet-100 px-1.5 py-0.5 text-[10px] font-semibold text-violet-800 dark:bg-violet-500/20 dark:text-violet-200">
                      {isKo ? "즉시예약" : "Instant"}
                    </span>
                  ) : null}
                  {item.isVerified ? (
                    <span className="rounded bg-emerald-100 px-1.5 py-0.5 text-[10px] font-semibold text-emerald-800 dark:bg-emerald-500/20 dark:text-emerald-200">
                      {isKo ? "검증" : "Verified"}
                    </span>
                  ) : null}
                </div>
              )}
              <p className="truncate text-xs text-gray-500 dark:text-white/50">
                {[catalogItem.type, regionLine].filter(Boolean).join(" · ")}
              </p>
              <div className="mt-1 flex flex-wrap items-baseline gap-x-1.5">
                <p className="text-sm font-bold tabular-nums text-gray-900 dark:text-white">
                  {priceLabel}
                </p>
                <MediaPriceExclNote isKo={isKo} className="text-[10px]" />
              </div>
            </div>
          </Link>

          {metrics.length > 0 ? (
            <dl
              className={cn(
                "mt-3 grid gap-2",
                metrics.length === 3 ? "grid-cols-3" : "grid-cols-2",
              )}
            >
              {metrics.map((m) => (
                <MapDetailMetric key={m.label} label={m.label} value={m.value} />
              ))}
            </dl>
          ) : null}

          <p
            className={cn(
              "mt-2.5 text-xs leading-snug",
              availabilityTone(availability.status),
            )}
          >
            <span className="font-medium text-gray-500 dark:text-white/45">
              {isKo ? "가용" : "Avail."}
            </span>{" "}
            {availability.label}
          </p>

          <MapDetailQuickActions
            item={item}
            inCompare={inCompare}
            inCart={inCart}
            onToggleCompare={onToggleCompare}
            onToggleCart={onToggleCart}
            size="compact"
          />
        </div>
        <div className="shrink-0 border-t border-gray-200 px-3 py-2.5 dark:border-white/10">
          <div className="grid grid-cols-2 gap-2">
            <Link
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex h-9 items-center justify-center gap-1 rounded-lg border border-gray-200 bg-white text-xs font-semibold text-gray-800 transition-colors hover:bg-gray-50 dark:border-white/14 dark:bg-white/8 dark:text-white dark:hover:bg-white/12"
            >
              {isKo ? "상세 보기" : "Details"}
              <ExternalLink className="h-3 w-3 shrink-0" aria-hidden />
            </Link>
            <Link
              href={`/contact?media=${encodeURIComponent(item.id)}`}
              className="tkad-media-map-sheet-cta inline-flex h-9 items-center justify-center gap-1 rounded-lg border border-violet-700/30 bg-violet-700 text-xs font-semibold text-white shadow-sm shadow-violet-900/20 transition-colors hover:bg-violet-800"
            >
              <MessageCircle className="h-3 w-3 shrink-0" aria-hidden />
              {isKo ? "문의하기" : "Contact"}
            </Link>
          </div>
        </div>
      </>
    );
  }

  return (
    <div className="relative px-3 py-2">
      <CloseButton
        onClose={onClose}
        isKo={isKo}
        className="absolute right-2 top-2 z-10 h-7 w-7"
      />
      <MediaCard
        mode="compact"
        item={catalogItem}
        href={href}
        metaLine={metaLine}
        isKo={isKo}
        showPlanButton={false}
        {...mediaCardStaticHandlers}
      />
      <MapDetailQuickActions
        item={item}
        inCompare={inCompare}
        inCart={inCart}
        onToggleCompare={onToggleCompare}
        onToggleCart={onToggleCart}
      />
      {linkRow()}
    </div>
  );
}

const BOTTOM_SHEET_DISMISS_DRAG_PX = 72;

function MediaMapBottomSheetShell({
  item,
  onClose,
  isKo,
  className,
  children,
}: {
  item: MapMapItem;
  onClose: () => void;
  isKo: boolean;
  className?: string;
  children: ReactNode;
}) {
  const dragStartY = useRef<number | null>(null);
  const [dragOffset, setDragOffset] = useState(0);
  const [dragging, setDragging] = useState(false);

  const resetDrag = () => {
    dragStartY.current = null;
    setDragging(false);
    setDragOffset(0);
  };

  const handleTouchStart = (clientY: number) => {
    dragStartY.current = clientY;
    setDragging(true);
  };

  const handleTouchMove = (clientY: number) => {
    if (dragStartY.current == null) return;
    const delta = Math.max(0, clientY - dragStartY.current);
    setDragOffset(delta);
  };

  const handleTouchEnd = () => {
    if (dragOffset >= BOTTOM_SHEET_DISMISS_DRAG_PX) {
      onClose();
    }
    resetDrag();
  };

  return (
    <>
      <div
        className="pointer-events-none fixed inset-0 z-[85] bg-black/10 md:hidden"
        aria-hidden
      />
      <div
        id="media-map-mobile-bottom-sheet"
        role="dialog"
        aria-label={item.name}
        className={cn(
          "fixed inset-x-0 bottom-0 z-[90] md:hidden",
          "rounded-t-xl border-t border-gray-200 bg-white shadow-[0_-8px_32px_rgba(0,0,0,0.14)]",
          "dark:border-white/10 dark:bg-[#0a0a12]",
          !dragging && "transition-transform duration-300 ease-out",
          className,
        )}
        style={dragOffset > 0 ? { transform: `translateY(${dragOffset}px)` } : undefined}
      >
        <div
          className="relative flex shrink-0 cursor-grab items-center justify-center px-3 pb-1 pt-1.5 active:cursor-grabbing"
          onTouchStart={(e) => handleTouchStart(e.touches[0]?.clientY ?? 0)}
          onTouchMove={(e) => handleTouchMove(e.touches[0]?.clientY ?? 0)}
          onTouchEnd={handleTouchEnd}
          onTouchCancel={resetDrag}
        >
          <div
            aria-hidden
            className="h-1 w-9 rounded-full bg-gray-300 dark:bg-white/25"
          />
          <CloseButton
            onClose={onClose}
            isKo={isKo}
            className="absolute right-2 top-1 h-7 w-7"
          />
        </div>
        {children}
      </div>
    </>
  );
}

export function MediaMapDetailSheet({
  item,
  onClose,
  isKo = true,
  variant = "dock",
  className,
  inCompare,
  inCart,
  onToggleCompare,
  onToggleCart,
  floatingBarOffset = false,
}: {
  item: MapMapItem;
  onClose: () => void;
  isKo?: boolean;
  variant?: "sheet" | "inline" | "dock" | "bottom-sheet";
  className?: string;
  inCompare?: boolean;
  inCart?: boolean;
  onToggleCompare?: () => void;
  onToggleCart?: () => void;
  /** 하단 CompareBar·내 플랜 바가 열려 있을 때 겹침 방지 */
  floatingBarOffset?: boolean;
}) {
  const [portalMounted, setPortalMounted] = useState(false);

  useEffect(() => {
    queueMicrotask(() => setPortalMounted(true));
  }, []);

  const bodyProps = {
    item,
    onClose,
    isKo,
    inCompare,
    inCart,
    onToggleCompare,
    onToggleCart,
  };

  if (variant === "bottom-sheet") {
    return (
      <MediaMapBottomSheetShell
        item={item}
        onClose={onClose}
        isKo={isKo}
        className={className}
      >
        <MediaMapDetailBody {...bodyProps} variant="bottom-sheet" />
      </MediaMapBottomSheetShell>
    );
  }

  if (variant === "inline") {
    return (
      <section
        id="media-map-mobile-preview"
        className={cn(
          "order-2 w-full border-y border-gray-200 bg-white dark:border-white/10 dark:bg-[#0a0a12]",
          className,
        )}
        aria-label={item.name}
      >
        <MediaMapDetailBody {...bodyProps} variant="inline" />
      </section>
    );
  }

  if (variant === "dock") {
    return (
      <div
        id="media-map-preview-dock"
        role="dialog"
        aria-label={item.name}
        className={cn(
          "pointer-events-auto absolute inset-x-0 bottom-0 z-[25]",
          "mx-2 mb-2 max-h-[min(36dvh,220px)] overflow-y-auto rounded-xl sm:mx-3 sm:mb-3",
          "border border-gray-200 bg-white/95 shadow-lg backdrop-blur-md",
          "dark:border-white/12 dark:bg-[#0a0a12]/95",
          className,
        )}
      >
        <MediaMapDetailBody {...bodyProps} variant="dock" />
      </div>
    );
  }

  const sheetEl = (
    <div
      role="dialog"
      aria-modal
      aria-label={item.name}
      className={cn(
        "pointer-events-auto fixed z-[80] hidden flex-col overflow-hidden md:flex",
        "border border-gray-200 bg-white shadow-xl",
        "right-4 w-[min(336px,calc(100%-2rem))] max-h-[min(68vh,440px)] rounded-xl",
        floatingBarOffset
          ? FLOATING_SELECTION_BAR_COMPACT_BOTTOM_CLASS
          : "bottom-4",
        "dark:border-white/10 dark:bg-[#0a0a12]",
        className,
      )}
    >
      <MediaMapDetailBody {...bodyProps} variant="sheet" />
    </div>
  );

  if (!portalMounted) return null;
  return createPortal(sheetEl, document.body);
}
