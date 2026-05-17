"use client";

import { useEffect, useMemo, useState } from "react";
import { X, ExternalLink, MessageCircle } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { cn } from "@/lib/utils";
import type { MapMapItem } from "./media-map-types";

function formatPrice(v: number, period: string): string {
  const krw = new Intl.NumberFormat("ko-KR").format(v);
  const p =
    period === "month"
      ? "/월"
      : period === "week"
        ? "/주"
        : period === "biweekly"
          ? "/격주"
          : period === "day"
            ? "/일"
            : "";
  return `₩${krw}${p}`;
}

function formatCompact(n: number): string {
  if (n >= 100_000_000) return `${(n / 100_000_000).toFixed(1).replace(/\.0$/, "")}억`;
  if (n >= 10_000) return `${Math.round(n / 10_000).toLocaleString()}만`;
  return n.toLocaleString("ko-KR");
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

function MediaMapDetailSheetSpecBlock({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/5 px-3 py-2.5">
      <dt className="font-mono text-[9px] font-bold uppercase tracking-[0.14em] text-white/45">
        {label}
      </dt>
      <dd className="mt-1 font-semibold tabular-nums text-white">{value}</dd>
    </div>
  );
}

export function MediaMapDetailSheet({
  item,
  onClose,
  isKo = true,
}: {
  item: MapMapItem;
  onClose: () => void;
  isKo?: boolean;
}) {
  const [availability, setAvailability] = useState<AvailabilitySummary>({
    status: "loading",
    label: isKo ? "이번 달 예약 현황 확인 중…" : "Checking this month…",
  });

  const impressions =
    item.impressions != null && item.impressions > 0
      ? item.impressions
      : item.dailyFootTraffic != null && item.dailyFootTraffic > 0
        ? item.dailyFootTraffic * 30
        : null;

  const cpm =
    item.cpm != null && item.cpm > 0
      ? item.cpm
      : impressions != null && impressions > 0 && item.price > 0
        ? Math.round(item.price / (impressions / 1000))
        : null;

  const visibilityLabel =
    item.visibilityScore > 0 ? `${item.visibilityScore} / 4` : "—";

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
          ? "bg-emerald-400/80"
          : availability.status === "partial"
            ? i % 3 === 0
              ? "bg-amber-400/80"
              : "bg-emerald-400/50"
            : availability.status === "busy"
              ? "bg-rose-400/70"
              : "bg-white/20";
      return { day, tone };
    });
  }, [availability.status]);

  const regionLine = [item.region, item.district].filter(Boolean).join(" · ") || item.location;

  return (
    <>
      <button
        type="button"
        aria-label={isKo ? "패널 닫기" : "Close panel"}
        className="fixed inset-0 z-[100001] bg-black/40 backdrop-blur-[2px]"
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal
        aria-label={item.name}
        className={cn(
          "pointer-events-auto fixed z-[100004] flex flex-col overflow-hidden",
          "border border-white/10 bg-black/90 shadow-[0_24px_80px_rgba(0,0,0,0.65)] backdrop-blur-xl",
          "inset-x-0 bottom-0 max-h-[min(92dvh,680px)] rounded-t-2xl",
          "md:inset-x-auto md:bottom-4 md:right-4 md:top-4 md:w-[min(420px,calc(100%-2rem))] md:max-h-none md:rounded-2xl",
        )}
      >
        <div className="flex justify-center pt-2 md:hidden">
          <span className="h-1 w-10 rounded-full bg-white/25" aria-hidden />
        </div>
        <div className="flex items-start justify-between gap-3 border-b border-white/10 px-4 py-3">
          <div className="min-w-0">
            <p className="font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-cyan-400/70">
              {item.type}
              {item.subCategory ? ` · ${item.subCategory}` : ""}
            </p>
            <h2 className="mt-1 truncate text-lg font-bold text-white">{item.name}</h2>
            <p className="mt-0.5 text-xs text-white/55">{regionLine}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-white/12 bg-white/5 text-white/80 transition-colors hover:bg-white/10 hover:text-white"
            aria-label={isKo ? "닫기" : "Close"}
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto px-4 py-4">
          {item.image ? (
            <div className="overflow-hidden rounded-xl border border-white/10">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={item.image} alt="" className="aspect-[16/10] w-full object-cover" />
            </div>
          ) : null}

          <dl className="mt-4 grid grid-cols-2 gap-2 text-xs">
            <MediaMapDetailSheetSpecBlock label={isKo ? "월 단가" : "Monthly"} value={formatPrice(item.price, item.pricePeriod)} />
            <MediaMapDetailSheetSpecBlock
              label={isKo ? "예상 노출" : "Est. impressions"}
              value={impressions != null ? `${formatCompact(impressions)}${isKo ? "회/월" : "/mo"}` : "—"}
            />
            <MediaMapDetailSheetSpecBlock label="CPM" value={cpm != null ? `₩${cpm.toLocaleString("ko-KR")}` : "—"} />
            <MediaMapDetailSheetSpecBlock label={isKo ? "가시성" : "Visibility"} value={visibilityLabel} />
          </dl>

          <div className="mt-4 rounded-xl border border-white/10 bg-white/5 p-3">
            <p className="font-mono text-[9px] font-bold uppercase tracking-[0.14em] text-white/45">
              {isKo ? "가용 캘린더 (이번 달)" : "Availability (this month)"}
            </p>
            <p className="mt-1.5 text-sm text-white/80">{availability.label}</p>
            <div className="mt-3 flex flex-wrap gap-1.5">
              {calendarDots.map((d) => (
                <span
                  key={d.day}
                  title={`${d.day}${isKo ? "일" : ""}`}
                  className={cn("h-2 w-2 rounded-full", d.tone)}
                />
              ))}
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-2 border-t border-white/10 p-4 sm:flex-row">
          <Link
            href={`/media/${item.id}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl border border-white/14 bg-white/8 px-4 py-3 text-sm font-bold text-white transition-colors hover:bg-white/12"
          >
            {isKo ? "전체 상세 보기 →" : "Full details →"}
            <ExternalLink className="h-4 w-4" aria-hidden />
          </Link>
          <Link
            href={`/contact?media=${encodeURIComponent(item.id)}`}
            className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-violet-500 to-cyan-400 px-4 py-3 text-sm font-bold text-white shadow-[0_12px_40px_rgba(139,92,246,0.35)] transition-transform hover:-translate-y-0.5"
          >
            <MessageCircle className="h-4 w-4" aria-hidden />
            {isKo ? "문의하기" : "Contact"}
          </Link>
        </div>
      </div>
    </>
  );
}
