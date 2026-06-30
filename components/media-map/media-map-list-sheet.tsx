"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { cn } from "@/lib/utils";

/** 모바일 지도 목록 시트 — peek(지도 풀) / full(목록 풀) 2단만 */
export type MediaMapSheetSnap = "peek" | "full";

const FULL_VISIBLE_FRACTION = 0.96;
/** peek — 화면 하단 ~12–15% (핸들 + 헤더) */
const PEEK_VISIBLE_MIN_PX = 88;
const PEEK_VISIBLE_MAX_PX = 132;
const PEEK_VISIBLE_FRACTION = 0.135;
/** 스냅 결정 시 관성 보정 — 이 속도(px/ms) 이상이면 진행 방향으로 peek↔full */
const FLING_VELOCITY = 0.45;

function peekVisiblePx(containerHeight: number): number {
  if (containerHeight <= 0) return PEEK_VISIBLE_MIN_PX;
  return Math.round(
    Math.min(
      PEEK_VISIBLE_MAX_PX,
      Math.max(PEEK_VISIBLE_MIN_PX, containerHeight * PEEK_VISIBLE_FRACTION),
    ),
  );
}

/**
 * 모바일 매체 리스트 바텀시트 — 지도 모드 peek / 목록 모드 full.
 * peek 은 고정 크롬(핸들+헤더)만, full 에서만 카드 그리드 노출.
 */
export function MediaMapListSheet({
  snap,
  onSnapChange,
  header,
  children,
  isKo = true,
  className,
}: {
  snap: MediaMapSheetSnap;
  onSnapChange: (next: MediaMapSheetSnap) => void;
  header?: ReactNode;
  children: ReactNode;
  isKo?: boolean;
  className?: string;
}) {
  const sheetRef = useRef<HTMLDivElement>(null);
  const [height, setHeight] = useState(0);
  const [dragPx, setDragPx] = useState<number | null>(null);
  const dragState = useRef<{
    startY: number;
    baseTranslate: number;
    lastY: number;
    lastT: number;
    velocity: number;
  } | null>(null);

  useEffect(() => {
    const parent = sheetRef.current?.parentElement;
    if (!parent) return;
    const update = () => setHeight(parent.clientHeight);
    update();
    const ro =
      typeof ResizeObserver !== "undefined"
        ? new ResizeObserver(update)
        : null;
    ro?.observe(parent);
    window.addEventListener("resize", update);
    return () => {
      ro?.disconnect();
      window.removeEventListener("resize", update);
    };
  }, []);

  const translateForSnap = useCallback((s: MediaMapSheetSnap, h: number) => {
    if (h <= 0) return 0;
    if (s === "peek") return Math.max(0, h - peekVisiblePx(h));
    return Math.max(0, h * (1 - FULL_VISIBLE_FRACTION));
  }, []);

  const ready = height > 0;
  const peekPx = peekVisiblePx(height);
  const minTranslate = translateForSnap("full", height);
  const maxTranslate = translateForSnap("peek", height);
  const baseTranslate = translateForSnap(snap, height);
  const effectiveTranslate = dragPx ?? baseTranslate;
  const dragging = dragPx != null;
  const peekSettled = snap === "peek" && !dragging;
  const midTranslate = ready ? (minTranslate + maxTranslate) / 2 : 0;
  const showListBody =
    ready &&
    (snap === "full" || (dragging && effectiveTranslate < midTranslate));

  const sheetHeight = !ready ? peekPx : peekSettled ? peekPx : height;
  const translateY = !ready ? 0 : peekSettled ? 0 : effectiveTranslate;

  const handlePointerDown = (e: React.PointerEvent) => {
    if (height <= 0) return;
    (e.currentTarget as Element).setPointerCapture?.(e.pointerId);
    const now = performance.now();
    dragState.current = {
      startY: e.clientY,
      baseTranslate: peekSettled ? maxTranslate : baseTranslate,
      lastY: e.clientY,
      lastT: now,
      velocity: 0,
    };
    setDragPx(peekSettled ? maxTranslate : baseTranslate);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    const st = dragState.current;
    if (!st) return;
    const now = performance.now();
    const dt = now - st.lastT;
    if (dt > 0) {
      st.velocity = (e.clientY - st.lastY) / dt;
      st.lastY = e.clientY;
      st.lastT = now;
    }
    const next = Math.min(
      Math.max(st.baseTranslate + (e.clientY - st.startY), minTranslate),
      maxTranslate,
    );
    setDragPx(next);
  };

  const settleToNearest = () => {
    const st = dragState.current;
    dragState.current = null;
    const current = dragPx;
    setDragPx(null);
    if (current == null || st == null) return;

    if (Math.abs(st.lastY - st.startY) < 6) {
      onSnapChange(snap === "full" ? "peek" : "full");
      return;
    }

    const mid = (minTranslate + maxTranslate) / 2;
    let best: MediaMapSheetSnap = current < mid ? "full" : "peek";

    if (Math.abs(st.velocity) >= FLING_VELOCITY) {
      best = st.velocity > 0 ? "peek" : "full";
    }

    if (best !== snap) onSnapChange(best);
  };

  return (
    <div
      ref={sheetRef}
      role="dialog"
      aria-label={isKo ? "매체 목록" : "Media list"}
      aria-expanded={snap === "full"}
      className={cn(
        "absolute inset-x-0 bottom-0 z-[40] flex flex-col overflow-hidden",
        "rounded-t-[1.25rem] border-t border-gray-200/90 bg-white",
        "shadow-[0_-12px_40px_rgba(15,23,42,0.16)] ring-1 ring-black/[0.04]",
        "dark:border-white/12 dark:bg-[#0a0a12] dark:shadow-[0_-18px_52px_rgba(0,0,0,0.55)] dark:ring-white/[0.06]",
        !dragging && ready && "transition-[transform,height] duration-300 ease-out",
        className,
      )}
      style={{
        height: sheetHeight,
        transform: peekSettled ? undefined : `translateY(${translateY}px)`,
        visibility: ready ? "visible" : "hidden",
      }}
    >
      <div
        className="flex shrink-0 cursor-grab touch-none select-none flex-col items-stretch bg-white active:cursor-grabbing dark:bg-[#0a0a12]"
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={settleToNearest}
        onPointerCancel={settleToNearest}
      >
        <button
          type="button"
          aria-label={
            snap === "full"
              ? isKo
                ? "지도로 돌아가기"
                : "Back to map"
              : isKo
                ? "목록 펼치기"
                : "Expand list"
          }
          onClick={() => onSnapChange(snap === "full" ? "peek" : "full")}
          className="flex items-center justify-center pt-1 pb-0"
        >
          <span
            aria-hidden
            className="h-1 w-10 rounded-full bg-gray-300 dark:bg-white/25"
          />
        </button>
        {header ? (
          <div
            className={cn(
              "px-3 py-0.5",
              showListBody && "border-b border-gray-100 dark:border-white/8",
            )}
          >
            {header}
          </div>
        ) : null}
      </div>

      <div
        className={cn(
          "min-h-0 flex-1 overflow-y-auto overscroll-contain px-0 pb-[max(0.75rem,env(safe-area-inset-bottom))]",
          !showListBody && "hidden",
        )}
        aria-hidden={!showListBody}
      >
        {children}
      </div>
    </div>
  );
}
