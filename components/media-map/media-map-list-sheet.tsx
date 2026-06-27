"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { cn } from "@/lib/utils";

export type MediaMapSheetSnap = "peek" | "half" | "full";

/** half/full 은 컨테이너 높이 대비 보이는 비율. peek 은 핸들+헤더만 보이도록 고정 px */
const SNAP_VISIBLE_FRACTION: Record<Exclude<MediaMapSheetSnap, "peek">, number> = {
  half: 0.5,
  full: 0.94,
};
const PEEK_VISIBLE_PX = 96;
/** 스냅 결정 시 관성 보정 — 이 속도(px/ms) 이상이면 진행 방향으로 한 단계 더 */
const FLING_VELOCITY = 0.5;

const SNAP_ORDER: MediaMapSheetSnap[] = ["peek", "half", "full"];

/**
 * 모바일 매체 리스트 바텀시트 — 지도 위에 올라오는 3단 스냅(peek/half/full).
 * vaul 미사용(의존성 없음) transform 기반 직접 구현. 시트 내부 리스트는 자체 스크롤.
 * 부모(`position: relative`) 높이를 채우고 translateY 로 노출 높이를 조절한다.
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

  // 컨테이너(부모) 높이 측정 — 스냅 translate 계산 기준
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

  const translateForSnap = useCallback(
    (s: MediaMapSheetSnap, h: number) => {
      if (h <= 0) return 0;
      if (s === "peek") return Math.max(0, h - PEEK_VISIBLE_PX);
      return Math.max(0, h * (1 - SNAP_VISIBLE_FRACTION[s]));
    },
    [],
  );

  const minTranslate = translateForSnap("full", height); // 가장 위(가장 펼침)
  const maxTranslate = translateForSnap("peek", height); // 가장 아래(가장 접힘)
  const baseTranslate = translateForSnap(snap, height);
  const translate = dragPx ?? baseTranslate;

  const handlePointerDown = (e: React.PointerEvent) => {
    if (height <= 0) return;
    (e.currentTarget as Element).setPointerCapture?.(e.pointerId);
    const now = performance.now();
    dragState.current = {
      startY: e.clientY,
      baseTranslate,
      lastY: e.clientY,
      lastT: now,
      velocity: 0,
    };
    setDragPx(baseTranslate);
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

    // 탭(이동 거의 없음) — 포인터 캡처가 버튼 click 을 가로채므로 여기서 한 단계 순환 처리
    if (Math.abs(st.lastY - st.startY) < 6) {
      const idx = SNAP_ORDER.indexOf(snap);
      const tapped =
        snap === "full"
          ? "peek"
          : SNAP_ORDER[Math.min(SNAP_ORDER.length - 1, idx + 1)];
      if (tapped && tapped !== snap) onSnapChange(tapped);
      return;
    }

    // 관성: 빠르게 내리면(+) 한 단계 접고, 빠르게 올리면(−) 한 단계 펼침
    let best: MediaMapSheetSnap = "peek";
    let bestDist = Infinity;
    for (const s of SNAP_ORDER) {
      const d = Math.abs(translateForSnap(s, height) - current);
      if (d < bestDist) {
        bestDist = d;
        best = s;
      }
    }
    if (Math.abs(st.velocity) >= FLING_VELOCITY) {
      const idx = SNAP_ORDER.indexOf(best);
      const dir = st.velocity > 0 ? -1 : 1; // 아래로 빠름 → 더 접힘(작은 idx)
      const flung = SNAP_ORDER[Math.min(SNAP_ORDER.length - 1, Math.max(0, idx + dir))];
      if (flung) best = flung;
    }
    if (best !== snap) onSnapChange(best);
  };

  const dragging = dragPx != null;

  return (
    <div
      ref={sheetRef}
      role="dialog"
      aria-label={isKo ? "매체 목록" : "Media list"}
      className={cn(
        "absolute inset-x-0 bottom-0 z-[40] flex flex-col rounded-t-2xl border-t border-gray-200 bg-white shadow-[0_-8px_32px_rgba(0,0,0,0.16)] dark:border-white/10 dark:bg-[#0a0a12]",
        !dragging && "transition-transform duration-300 ease-out",
        className,
      )}
      style={{
        height: height > 0 ? height : undefined,
        transform: `translateY(${translate}px)`,
      }}
    >
      {/* 드래그 핸들 + (선택) 헤더 — touch-none 으로 브라우저 스크롤/새로고침 차단 */}
      <div
        className="flex shrink-0 cursor-grab touch-none select-none flex-col items-stretch active:cursor-grabbing"
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
                ? "목록 접기"
                : "Collapse list"
              : isKo
                ? "목록 펼치기"
                : "Expand list"
          }
          onClick={() => {
            // 드래그가 아니라 탭이면 한 단계 펼침/접힘
            const idx = SNAP_ORDER.indexOf(snap);
            const next =
              snap === "full"
                ? "peek"
                : SNAP_ORDER[Math.min(SNAP_ORDER.length - 1, idx + 1)];
            if (next) onSnapChange(next);
          }}
          className="flex items-center justify-center pt-2.5 pb-1.5"
        >
          <span
            aria-hidden
            className="h-1.5 w-10 rounded-full bg-gray-300 dark:bg-white/25"
          />
        </button>
        {header ? <div className="px-3 pb-2">{header}</div> : null}
      </div>

      {/* 내부 스크롤 영역 — overscroll-contain 으로 지도로 스크롤 전파 차단 */}
      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
        {children}
      </div>
    </div>
  );
}
