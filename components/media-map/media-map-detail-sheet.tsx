"use client";

import { useEffect, useMemo, useState } from "react";
import { X, ExternalLink, MessageCircle } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { cn } from "@/lib/utils";
import type { MapMapItem } from "./media-map-types";
import { formatMediaPriceWithPeriodSuffix } from "@/lib/media-price-format";
import { MediaCard } from "@/components/media/media-card";
import { mapMapItemToHomeCatalog } from "@/lib/media-catalog-map";
import { mediaCardStaticHandlers } from "@/lib/media-card-static-handlers";

function formatPrice(v: number, period: string, locale: string): string {
  return formatMediaPriceWithPeriodSuffix(v, period, locale);
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

type AvailabilitySummary = {
  status: "loading" | "available" | "partial" | "busy" | "unknown";
  label: string;
};

type DetailProps = {
  item: MapMapItem;
  onClose: () => void;
  isKo?: boolean;
  variant: "sheet" | "inline" | "dock";
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

function MediaMapDetailBody({ item, onClose, isKo = true, variant }: DetailProps) {
  const dark = variant === "sheet" || variant === "dock";
  const catalogItem = useMemo(() => mapMapItemToHomeCatalog(item), [item]);
  const href = `/media/${item.id}`;
  const priceLabel = formatPrice(item.price, item.pricePeriod, isKo ? "ko" : "en");
  const regionLine = [item.region, item.district].filter(Boolean).join(" · ") || item.location;
  const metaLine = [regionLine, priceLabel].filter(Boolean).join(" · ");

  const [availability, setAvailability] = useState<AvailabilitySummary>({
    status: "loading",
    label: isKo ? "이번 달 예약 현황 확인 중…" : "Checking this month…",
  });

  useEffect(() => {
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
  }, [item.id, isKo]);

  const calendarDots = useMemo(() => {
    const daysInMonth = new Date(
      new Date().getFullYear(),
      new Date().getMonth() + 1,
      0,
    ).getDate();
    const today = new Date().getDate();
    return Array.from({ length: Math.min(14, daysInMonth - today + 1) }, (_, i) => {
      const day = today + i;
      const tone =
        availability.status === "available"
          ? "bg-emerald-500"
          : availability.status === "partial"
            ? i % 3 === 0
              ? "bg-amber-500"
              : "bg-emerald-400"
            : availability.status === "busy"
              ? "bg-rose-500"
              : "bg-muted-foreground/40";
      return { day, tone };
    });
  }, [availability.status]);

  const ctaPrimary = cn(
    "inline-flex w-full items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-bold transition-colors",
    dark
      ? "border dark:border-white/14 border-gray-200 dark:bg-white/8 bg-gray-100 dark:text-white text-gray-900 hover:bg-white/12"
      : "border border-border bg-card text-foreground hover:bg-muted",
  );

  const ctaAccent =
    "tkad-neon-cta-clean inline-flex w-full items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-bold text-white transition-transform hover:-translate-y-0.5";

  if (variant === "dock") {
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
        <div className="mt-2 grid grid-cols-2 gap-1.5">
          <Link
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center justify-center gap-1 rounded-lg border border-gray-200 bg-white px-2.5 py-2 text-[11px] font-semibold text-gray-800 transition-colors hover:bg-gray-50 dark:border-white/14 dark:bg-white/8 dark:text-white dark:hover:bg-white/12"
          >
            {isKo ? "상세 보기" : "Details"}
            <ExternalLink className="h-3 w-3" aria-hidden />
          </Link>
          <Link href={`/contact?media=${encodeURIComponent(item.id)}`} className={cn(ctaAccent, "px-2.5 py-2 text-[11px]")}>
            <MessageCircle className="h-3 w-3" aria-hidden />
            {isKo ? "문의" : "Contact"}
          </Link>
        </div>
      </div>
    );
  }

  if (variant === "inline") {
    return (
      <div className="px-3 py-4 sm:px-4">
        <div className="mb-2.5 flex items-center justify-between gap-2">
          <p className="font-display text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">
            {isKo ? "선택한 매체" : "Selected"}
          </p>
          <CloseButton onClose={onClose} isKo={isKo} className="h-8 w-8" />
        </div>
        <MediaCard
          mode="feed"
          item={catalogItem}
          href={href}
          locationLine={regionLine}
          isKo={isKo}
          showPlanButton={false}
          {...mediaCardStaticHandlers}
        />

        <div className="mt-3 rounded-xl border border-border/70 bg-muted/40 p-3">
          <p className="font-display text-xs font-medium uppercase tracking-[0.14em] text-muted-foreground">
            {isKo ? "가용 캘린더 (이번 달)" : "Availability (this month)"}
          </p>
          <p className="mt-1.5 text-sm text-foreground">{availability.label}</p>
          <div className="mt-3 flex flex-wrap gap-1">
            {calendarDots.map((d) => (
              <span
                key={d.day}
                title={`${d.day}${isKo ? "일" : ""}`}
                className={cn("h-2 w-2 rounded-full", d.tone)}
              />
            ))}
          </div>
        </div>

        <div className="mt-3 grid grid-cols-2 gap-2">
          <Link href={href} target="_blank" rel="noopener noreferrer" className={ctaPrimary}>
            {isKo ? "전체 상세 보기 →" : "Full details →"}
            <ExternalLink className="h-3.5 w-3.5" aria-hidden />
          </Link>
          <Link href={`/contact?media=${encodeURIComponent(item.id)}`} className={ctaAccent}>
            <MessageCircle className="h-3.5 w-3.5" aria-hidden />
            {isKo ? "문의하기" : "Contact"}
          </Link>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="flex justify-center pt-2 md:hidden">
        <span className="h-1 w-10 rounded-full bg-white/25" aria-hidden />
      </div>
      <div className="flex items-center justify-end gap-3 border-b dark:border-white/10 border-gray-200 px-4 py-3">
        <CloseButton onClose={onClose} isKo={isKo} className="h-9 w-9" />
      </div>
      <div className="flex-1 overflow-y-auto px-4 py-4">
        <MediaCard
          mode="feed"
          item={catalogItem}
          href={href}
          locationLine={regionLine}
          isKo={isKo}
          showPlanButton={false}
          {...mediaCardStaticHandlers}
        />

        <div className="mt-4 rounded-xl border dark:border-white/10 border-gray-200 dark:bg-white/5 bg-gray-50 p-3">
          <p className="font-display text-xs font-medium uppercase tracking-[0.14em] dark:text-white">
            {isKo ? "가용 캘린더 (이번 달)" : "Availability (this month)"}
          </p>
          <p className="mt-1.5 text-sm dark:text-white text-gray-700">{availability.label}</p>
          <div className="mt-3 flex flex-wrap gap-1.5">
            {calendarDots.map((d) => (
              <span
                key={d.day}
                title={`${d.day}${isKo ? "일" : ""}`}
                className={cn(
                  "h-2 w-2 rounded-full",
                  d.tone.replace("emerald-500", "emerald-400/80").replace("amber-500", "amber-400/80").replace("rose-500", "rose-400/70"),
                )}
              />
            ))}
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-2 border-t dark:border-white/10 border-gray-200 p-4 sm:flex-row">
        <Link
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          className={cn(ctaPrimary, "sm:flex-1")}
        >
          {isKo ? "전체 상세 보기 →" : "Full details →"}
          <ExternalLink className="h-4 w-4" aria-hidden />
        </Link>
        <Link
          href={`/contact?media=${encodeURIComponent(item.id)}`}
          className={cn(ctaAccent, "sm:flex-1")}
        >
          <MessageCircle className="h-4 w-4" aria-hidden />
          {isKo ? "문의하기" : "Contact"}
        </Link>
      </div>
    </>
  );
}

export function MediaMapDetailSheet({
  item,
  onClose,
  isKo = true,
  variant = "dock",
}: {
  item: MapMapItem;
  onClose: () => void;
  isKo?: boolean;
  variant?: "sheet" | "inline" | "dock";
}) {
  if (variant === "inline") {
    return (
      <section
        id="media-map-mobile-preview"
        className="order-2 w-full border-y border-border/80 bg-card shadow-[0_-8px_24px_rgba(0,0,0,0.06)] md:hidden"
        aria-label={item.name}
      >
        <MediaMapDetailBody item={item} onClose={onClose} isKo={isKo} variant="inline" />
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
          "mx-2 mb-2 max-h-[min(28dvh,168px)] overflow-hidden rounded-xl sm:mx-3 sm:mb-3",
          "border border-gray-200 bg-white/95 shadow-[0_-6px_20px_rgba(15,23,42,0.1)] backdrop-blur-md",
          "dark:border-white/12 dark:bg-[#0a0a12]/95 dark:shadow-[0_-16px_48px_rgba(0,0,0,0.55)]",
        )}
      >
        <div className="flex justify-center pt-1.5">
          <span className="h-0.5 w-8 rounded-full bg-gray-300 dark:bg-white/25" aria-hidden />
        </div>
        <MediaMapDetailBody item={item} onClose={onClose} isKo={isKo} variant="dock" />
      </div>
    );
  }

  return (
    <div
      role="dialog"
      aria-modal
      aria-label={item.name}
      className={cn(
        "pointer-events-auto fixed z-[100004] flex flex-col overflow-hidden",
        "border dark:border-white/10 border-gray-200 dark:bg-black bg-white/90 shadow-[0_24px_80px_rgba(0,0,0,0.65)] backdrop-blur-xl",
        "inset-x-auto bottom-4 right-4 top-4 w-[min(420px,calc(100%-2rem))] rounded-2xl",
      )}
    >
      <MediaMapDetailBody item={item} onClose={onClose} isKo={isKo} variant="sheet" />
    </div>
  );
}
