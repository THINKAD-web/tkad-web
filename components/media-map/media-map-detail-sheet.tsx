"use client";

import { useEffect, useMemo, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import { BunnyFallbackImage } from "@/components/bunny-fallback-image";
import { Link } from "@/i18n/navigation";
import { cn } from "@/lib/utils";
import type { MapMapItem } from "./media-map-types";
import { formatMediaPriceWithPeriodSuffix } from "@/lib/media-price-format";
import { buildMapItemMetrics, formatMapCpm } from "@/lib/media-map/map-item-metrics";
import { DiscoveryMediaCard } from "@/components/discovery/media-card";
import { mapMapItemToHomeCatalog, catalogThumbnailImageProps } from "@/lib/media-catalog-map";
import { mediaCardStaticHandlers } from "@/lib/media-card-static-handlers";
import { DiscoveryMediaCardActions } from "@/components/discovery/discovery-media-card-actions";
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
      <dt className="tkad-type-label truncate text-tkad-muted">{label}</dt>
      <dd className="tkad-type-meta mt-0.5 truncate font-bold tabular-nums text-foreground">
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
  onViewInList?: () => void;
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
      <X className="h-4 w-4" />
    </button>
  );
}

function mapItemPlanCart(item: MapMapItem) {
  return planCartItemFromCatalog(
    {
      id: item.id,
      name: item.name,
      type: item.type,
      region: item.region,
      price: item.price,
      thumbnailUrl: item.image ?? undefined,
    },
    "map",
  );
}

/** @deprecated Use `DiscoveryMediaCardActions` */
export function MapDetailQuickActions({
  item,
  inCompare,
  onToggleCompare,
  size = "compact",
  className,
  isKo = true,
}: {
  item: MapMapItem;
  inCompare?: boolean;
  onToggleCompare?: () => void;
  size?: "compact" | "comfortable";
  className?: string;
  isKo?: boolean;
}) {
  return (
    <DiscoveryMediaCardActions
      mediaId={item.id}
      planItem={mapItemPlanCart(item)}
      detailHref={`/media/${item.id}`}
      isKo={isKo}
      inCompare={inCompare}
      onToggleCompare={onToggleCompare}
      addedFrom="map"
      size={size}
      className={className}
      stopPropagation
    />
  );
}

/** 지도 마커 미리보기(dock·bottom-sheet) — 좌 썸네일 + 우 정보·축약 버튼 */
function MapMarkerPreviewBody({
  item,
  catalogItem,
  href,
  isKo,
  onClose,
  showClose = true,
  inCompare,
  onToggleCompare,
  onViewInList,
}: {
  item: MapMapItem;
  catalogItem: ReturnType<typeof mapMapItemToHomeCatalog>;
  href: string;
  isKo: boolean;
  onClose: () => void;
  showClose?: boolean;
  inCompare?: boolean;
  onToggleCompare?: () => void;
  onViewInList?: () => void;
}) {
  const thumb = catalogThumbnailImageProps(catalogItem.thumbnailUrl);
  const priceLabel = formatPrice(item.price, item.pricePeriod, isKo ? "ko" : "en");
  const regionLine =
    [item.region, item.district].filter(Boolean).join(" · ") || item.location;
  const locale = isKo ? "ko-KR" : "en-US";
  const cpmLabel = formatMapCpm(item, locale);

  return (
    <div className={cn("relative p-3", showClose && "pr-11")}>
      {showClose ? (
        <CloseButton
          onClose={onClose}
          isKo={isKo}
          className="absolute right-2 top-2 z-10 h-9 w-9"
        />
      ) : null}
      <div className="flex min-w-0 gap-3">
        <Link
          href={href}
          className="relative h-[4.75rem] w-[5.75rem] shrink-0 overflow-hidden rounded-lg border border-gray-200 bg-gray-100 dark:border-white/10 dark:bg-gray-800"
        >
          {thumb && catalogItem.thumbnailUrl ? (
            <BunnyFallbackImage
              rawSrc={catalogItem.thumbnailUrl}
              alt={item.name}
              fill
              className="object-cover"
              sizes="92px"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-[10px] text-tkad-muted">
              —
            </div>
          )}
        </Link>
        <div className="flex min-w-0 flex-1 flex-col justify-between gap-2">
          <Link
            href={href}
            className="min-w-0 rounded-md transition-colors active:bg-gray-50 dark:active:bg-white/5"
          >
            <p className="tkad-type-title line-clamp-2 leading-snug text-foreground">
              {item.name}
            </p>
            <p className="tkad-type-meta mt-0.5 truncate text-tkad-secondary">
              {regionLine}
            </p>
            <div className="mt-0.5 flex flex-wrap items-baseline gap-x-1.5 gap-y-0">
              <p className="tkad-type-price-accent tkad-home-accent-text tabular-nums">
                {priceLabel}
              </p>
              {cpmLabel ? (
                <span className="tkad-type-note tabular-nums text-tkad-muted">
                  CPM {cpmLabel}
                </span>
              ) : null}
              <MediaPriceExclNote isKo={isKo} className="tkad-type-note" />
            </div>
          </Link>
          <DiscoveryMediaCardActions
            mediaId={item.id}
            planItem={mapItemPlanCart(item)}
            detailHref={href}
            isKo={isKo}
            inCompare={inCompare}
            onToggleCompare={onToggleCompare}
            addedFrom="map"
            layout="map-tile"
            className="!mt-0"
            stopPropagation
          />
          {onViewInList ? (
            <button
              type="button"
              onClick={onViewInList}
              className="tkad-type-meta mt-1 w-full rounded-lg border border-[color:var(--qp-accent)]/35 bg-[color:var(--qp-accent-soft)] px-2.5 py-1.5 font-semibold text-[color:var(--qp-accent)] transition-colors hover:bg-[color:var(--qp-accent)]/12 active:bg-[color:var(--qp-accent)]/18 dark:border-[color:var(--qp-accent)]/30 dark:bg-[color:var(--qp-accent)]/10"
            >
              {isKo ? "목록에서 보기" : "View in list"}
            </button>
          ) : null}
        </div>
      </div>
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
  onViewInList,
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

  const mapActions =
    variant === "sheet" || variant === "inline" ? (
      <DiscoveryMediaCardActions
        mediaId={item.id}
        planItem={mapItemPlanCart(item)}
        detailHref={href}
        isKo={isKo}
        inCompare={inCompare}
        onToggleCompare={onToggleCompare}
        addedFrom="map"
        size={variant === "sheet" ? "comfortable" : "compact"}
        layout="full"
        className={variant === "inline" ? "mt-2" : undefined}
        stopPropagation={variant === "inline"}
      />
    ) : null;

  if (variant === "bottom-sheet") {
    return (
      <MapMarkerPreviewBody
        item={item}
        catalogItem={catalogItem}
        href={href}
        isKo={isKo}
        onClose={onClose}
        showClose={false}
        inCompare={inCompare}
        onToggleCompare={onToggleCompare}
        onViewInList={onViewInList}
      />
    );
  }

  if (variant === "dock") {
    return (
      <MapMarkerPreviewBody
        item={item}
        catalogItem={catalogItem}
        href={href}
        isKo={isKo}
        onClose={onClose}
        inCompare={inCompare}
        onToggleCompare={onToggleCompare}
        onViewInList={onViewInList}
      />
    );
  }

  if (variant === "inline") {
    return (
      <div className="px-4 py-3">
        <div className="mb-2 flex items-center justify-between gap-2">
          <p className="tkad-type-label text-tkad-muted">
            {isKo ? "선택한 매체" : "Selected"}
          </p>
          <CloseButton onClose={onClose} isKo={isKo} className="h-8 w-8" />
        </div>
        <DiscoveryMediaCard
          variant="compact"
          compactLayout="row"
          item={catalogItem}
          href={href}
          metaLine={metaLine}
          isKo={isKo}
          showPlanButton={false}
          {...mediaCardStaticHandlers}
        />
        {mapActions}
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
          <p className="tkad-type-title min-w-0 flex-1 line-clamp-2 leading-snug text-foreground">
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
              {thumb && catalogItem.thumbnailUrl ? (
                <BunnyFallbackImage
                  rawSrc={catalogItem.thumbnailUrl}
                  alt=""
                  fill
                  className="object-cover"
                  sizes="80px"
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
                    <span
                      className="rounded bg-[color:var(--qp-accent-soft)] px-1.5 py-0.5 text-[10px] font-semibold text-[color:var(--qp-accent)]"
                      title={
                        isKo
                          ? "운영자가 즉시 예약 경로를 켠 매체입니다. 날짜별 재고는 캘린더·영업 확인이 필요합니다."
                          : "Instant-book path is enabled by ops. Check the calendar — dates are not live inventory."
                      }
                    >
                      {isKo ? "즉시예약(안내)" : "Instant (info)"}
                    </span>
                  ) : null}
                  {item.isVerified ? (
                    <span className="rounded bg-emerald-100 px-1.5 py-0.5 text-[10px] font-semibold text-emerald-800 dark:bg-emerald-500/20 dark:text-emerald-200">
                      {isKo ? "검증" : "Verified"}
                    </span>
                  ) : null}
                </div>
              )}
              <p className="tkad-type-meta truncate text-tkad-secondary">
                {[catalogItem.type, regionLine].filter(Boolean).join(" · ")}
              </p>
              <div className="mt-1 flex flex-wrap items-baseline gap-x-1.5">
                <p className="tkad-type-price-accent tkad-home-accent-text tabular-nums">
                  {priceLabel}
                </p>
                <MediaPriceExclNote isKo={isKo} className="tkad-type-note" />
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
            <span className="tkad-type-meta font-medium text-tkad-muted">
              {isKo ? "가용" : "Avail."}
            </span>{" "}
            {availability.label}
          </p>

          {mapActions}
        </div>
      </>
    );
  }

  return null;
}

/** bottom-sheet dismiss · dock swipe-up — 동일 threshold */
export const MAP_SHEET_DRAG_THRESHOLD_PX = 72;

const BOTTOM_SHEET_DISMISS_DRAG_PX = MAP_SHEET_DRAG_THRESHOLD_PX;

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
            className="absolute right-2 top-1 h-9 w-9"
          />
        </div>
        {children}
      </div>
    </>
  );
}

function MediaMapDockShell({
  item,
  isKo,
  className,
  style,
  onSwipeUp,
  children,
}: {
  item: MapMapItem;
  isKo: boolean;
  className?: string;
  style?: CSSProperties;
  onSwipeUp?: () => void;
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
    if (!onSwipeUp) return;
    dragStartY.current = clientY;
    setDragging(true);
  };

  const handleTouchMove = (clientY: number) => {
    if (dragStartY.current == null) return;
    const delta = Math.max(0, dragStartY.current - clientY);
    setDragOffset(Math.min(delta, 48));
  };

  const handleTouchEnd = () => {
    if (dragOffset >= MAP_SHEET_DRAG_THRESHOLD_PX) {
      onSwipeUp?.();
    }
    resetDrag();
  };

  return (
    <div
      id="media-map-preview-dock"
      role="dialog"
      aria-label={item.name}
      className={cn(
        "pointer-events-auto absolute inset-x-0 z-[25]",
        "mx-2 max-h-[min(36dvh,240px)] overflow-y-auto rounded-xl sm:mx-3",
        "border border-gray-200 bg-white/95 shadow-lg backdrop-blur-md",
        "dark:border-white/12 dark:bg-[#0a0a12]/95",
        !dragging && "transition-transform duration-300 ease-out",
        className,
      )}
      style={{
        ...style,
        transform:
          dragOffset > 0 ? `translateY(-${dragOffset}px)` : style?.transform,
      }}
    >
      {onSwipeUp ? (
        <div
          className="flex h-6 shrink-0 cursor-grab touch-none select-none items-center justify-center active:cursor-grabbing"
          aria-label={
            isKo ? "위로 스와이프해 목록에서 보기" : "Swipe up to view in list"
          }
          onTouchStart={(e) => handleTouchStart(e.touches[0]?.clientY ?? 0)}
          onTouchMove={(e) => handleTouchMove(e.touches[0]?.clientY ?? 0)}
          onTouchEnd={handleTouchEnd}
          onTouchCancel={resetDrag}
        >
          <span
            aria-hidden
            className="h-1 w-10 rounded-full bg-gray-300 dark:bg-white/25"
          />
        </div>
      ) : null}
      {children}
    </div>
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
  onViewInList,
  style,
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
  /** 모바일 dock — full 리스트로 전환 */
  onViewInList?: () => void;
  style?: CSSProperties;
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
    onViewInList,
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
      <MediaMapDockShell
        item={item}
        isKo={isKo}
        className={className}
        style={style}
        onSwipeUp={onViewInList}
      >
        <MediaMapDetailBody {...bodyProps} variant="dock" />
      </MediaMapDockShell>
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
