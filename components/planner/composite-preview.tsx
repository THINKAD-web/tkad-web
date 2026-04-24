"use client";

import { cn } from "@/lib/utils";

/** 광고판 영역 좌표 (%). 기본값은 매체 중앙 상단에 로고 25% 너비. */
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
}: Props) {
  return (
    <div
      className={cn(
        "relative aspect-video w-full overflow-hidden rounded-xl bg-slate-200",
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
        <div className="absolute inset-0 flex items-center justify-center text-xs text-muted-foreground">
          {missingLabel}
        </div>
      )}

      {logoUrl ? (
        <div
          className="pointer-events-none absolute flex items-start justify-center"
          style={{
            left: `${placement.xPct}%`,
            top: `${placement.yPct}%`,
            width: `${placement.widthPct}%`,
            transform: `translate(-50%, -50%) rotate(${placement.rotationDeg ?? 0}deg)`,
          }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={logoUrl}
            alt=""
            className="max-h-full w-full object-contain drop-shadow-[0_4px_14px_rgba(0,0,0,0.45)]"
            draggable={false}
          />
        </div>
      ) : null}

      <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/40 via-black/0 to-black/0" />

      {badgeLabel ? (
        <div className="pointer-events-none absolute left-2 top-2 rounded-full border border-white/25 bg-black/35 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-white/90 backdrop-blur-sm">
          {badgeLabel}
        </div>
      ) : null}

      {!compact ? (
        <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent px-3 pb-3 pt-8">
          <p className="line-clamp-2 text-xs font-bold text-white drop-shadow sm:text-sm">
            {mediaName}
          </p>
        </div>
      ) : null}
    </div>
  );
}
