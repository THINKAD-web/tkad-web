"use client";

import { useCallback, useRef } from "react";
import { cn } from "@/lib/utils";

/** 광고판 영역 좌표 (%). 기본값은 매체 중앙 상단에 로고 28% 너비. */
export type CompositeLogoPlacement = {
  xPct: number;
  yPct: number;
  widthPct: number;
  rotationDeg?: number;
};

export const DEFAULT_LOGO_PLACEMENT: CompositeLogoPlacement = {
  xPct: 50,
  yPct: 34,
  widthPct: 28,
};

const MIN_WIDTH_PCT = 8;
const MAX_WIDTH_PCT = 90;

function clamp(v: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, v));
}

type Props = {
  mediaImageUrl: string | null;
  mediaName: string;
  logoUrl: string | null;
  placement?: CompositeLogoPlacement;
  className?: string;
  /** 모바일 썸네일용 컴팩트 모드 */
  compact?: boolean;
  missingLabel?: string;
  badgeLabel?: string;
  /** 편집 가능 여부. true 시 로고 드래그 + 리사이즈 핸들 표시. */
  editable?: boolean;
  onPlacementChange?: (next: CompositeLogoPlacement) => void;
};

export function CompositePreview({
  mediaImageUrl,
  mediaName,
  logoUrl,
  placement = DEFAULT_LOGO_PLACEMENT,
  className,
  compact = false,
  missingLabel,
  badgeLabel,
  editable = false,
  onPlacementChange,
}: Props) {
  const frameRef = useRef<HTMLDivElement | null>(null);

  const handleDragStart = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      if (!editable || !onPlacementChange) return;
      const frame = frameRef.current;
      if (!frame) return;
      e.preventDefault();
      const rect = frame.getBoundingClientRect();
      const startX = e.clientX;
      const startY = e.clientY;
      const startPlacement = placement;

      const move = (ev: PointerEvent) => {
        const dx = ((ev.clientX - startX) / rect.width) * 100;
        const dy = ((ev.clientY - startY) / rect.height) * 100;
        onPlacementChange({
          ...startPlacement,
          xPct: clamp(startPlacement.xPct + dx, 0, 100),
          yPct: clamp(startPlacement.yPct + dy, 0, 100),
        });
      };
      const up = () => {
        window.removeEventListener("pointermove", move);
        window.removeEventListener("pointerup", up);
      };
      window.addEventListener("pointermove", move);
      window.addEventListener("pointerup", up);
    },
    [editable, onPlacementChange, placement],
  );

  const handleResizeStart = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      if (!editable || !onPlacementChange) return;
      const frame = frameRef.current;
      if (!frame) return;
      e.preventDefault();
      e.stopPropagation();
      const rect = frame.getBoundingClientRect();
      const startX = e.clientX;
      const startWidth = placement.widthPct;

      const move = (ev: PointerEvent) => {
        const dx = ((ev.clientX - startX) / rect.width) * 100;
        onPlacementChange({
          ...placement,
          widthPct: clamp(startWidth + dx * 2, MIN_WIDTH_PCT, MAX_WIDTH_PCT),
        });
      };
      const up = () => {
        window.removeEventListener("pointermove", move);
        window.removeEventListener("pointerup", up);
      };
      window.addEventListener("pointermove", move);
      window.addEventListener("pointerup", up);
    },
    [editable, onPlacementChange, placement],
  );
  return (
    <div
      ref={frameRef}
      className={cn(
        "relative aspect-video w-full overflow-hidden border-2 border-border bg-muted",
        editable && "cursor-move select-none",
        className,
      )}
      role="img"
      aria-label={mediaName}
    >
      {mediaImageUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={mediaImageUrl}
          alt=""
          className="absolute inset-0 h-full w-full object-cover"
          draggable={false}
        />
      ) : (
        <div className="absolute inset-0 flex items-center justify-center tkad-type-label text-muted-foreground">
          {`// `}{missingLabel}
        </div>
      )}

      {logoUrl ? (
        <div
          className={cn(
            "absolute flex items-start justify-center",
            editable
              ? "cursor-grab touch-none border-2 border-primary"
              : "pointer-events-none",
          )}
          style={{
            left: `${placement.xPct}%`,
            top: `${placement.yPct}%`,
            width: `${placement.widthPct}%`,
            transform: `translate(-50%, -50%) rotate(${placement.rotationDeg ?? 0}deg)`,
          }}
          onPointerDown={editable ? handleDragStart : undefined}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={logoUrl}
            alt=""
            className="max-h-full w-full object-contain drop-shadow-[0_4px_14px_rgba(0,0,0,0.45)]"
            draggable={false}
          />
          {editable ? (
            <div
              className="absolute -right-2 -bottom-2 h-4 w-4 cursor-nwse-resize touch-none border-2 border-border bg-primary"
              role="button"
              aria-label="resize logo"
              tabIndex={-1}
              onPointerDown={handleResizeStart}
            />
          ) : null}
        </div>
      ) : null}

      {badgeLabel ? (
        <div className="pointer-events-none absolute left-0 top-0 border-b-2 border-r-2 border-border bg-primary px-2.5 py-1 tkad-type-label text-primary-foreground">
          {badgeLabel}
        </div>
      ) : null}

      {!compact ? (
        <div className="pointer-events-none absolute inset-x-0 bottom-0 border-t-2 border-border bg-hero-void px-3 py-2">
          <p className="line-clamp-2 font-sans text-xs font-medium uppercase tracking-[0.18em] text-hero-fg sm:text-xs">
            {mediaName}
          </p>
        </div>
      ) : null}
    </div>
  );
}
