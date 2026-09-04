"use client";

import {
  useCallback,
  useEffect,
  useState,
  type CSSProperties,
  type RefObject,
} from "react";
import { createPortal } from "react-dom";
import { cn } from "@/lib/utils";

export type AnchoredOverlayPlacement = {
  top: number;
  left?: number;
  right?: number;
  width?: number;
  minWidth?: number;
  maxHeight?: number;
};

type UseAnchoredOverlayPortalOptions = {
  open: boolean;
  onClose: () => void;
  anchorRef: RefObject<HTMLElement | null>;
  panelRef?: RefObject<HTMLElement | null>;
  /** trigger getBoundingClientRect → panel fixed placement */
  getPlacement: (anchor: HTMLElement) => AnchoredOverlayPlacement;
  /** body scroll lock while open (filter panel) */
  lockBodyScroll?: boolean;
};

export function useAnchoredOverlayPortal({
  open,
  onClose,
  anchorRef,
  panelRef,
  getPlacement,
  lockBodyScroll = false,
}: UseAnchoredOverlayPortalOptions) {
  const [portalMounted, setPortalMounted] = useState(false);
  const [placement, setPlacement] = useState<AnchoredOverlayPlacement | null>(
    null,
  );

  useEffect(() => {
    queueMicrotask(() => setPortalMounted(true));
  }, []);

  const updatePlacement = useCallback(() => {
    const anchor = anchorRef.current;
    if (!anchor) return;
    setPlacement(getPlacement(anchor));
  }, [anchorRef, getPlacement]);

  useEffect(() => {
    if (!open) {
      setPlacement(null);
      return;
    }
    updatePlacement();
    window.addEventListener("resize", updatePlacement);
    window.addEventListener("scroll", updatePlacement, true);
    return () => {
      window.removeEventListener("resize", updatePlacement);
      window.removeEventListener("scroll", updatePlacement, true);
    };
  }, [open, updatePlacement]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      const target = e.target as Node;
      if (anchorRef.current?.contains(target)) return;
      if (panelRef?.current?.contains(target)) return;
      onClose();
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open, onClose, anchorRef, panelRef]);

  useEffect(() => {
    if (!open || !lockBodyScroll) return;
    // html 에 건다 — body 에 걸면 스크롤된 상태에서 sticky/fixed 헤더가 화면
    // 밖으로 튕겨나가는 브라우저 버그가 있다 (desktop-global-nav.tsx 참고).
    const html = document.documentElement;
    const prev = html.style.overflow;
    html.style.overflow = "hidden";
    return () => {
      html.style.overflow = prev;
    };
  }, [open, lockBodyScroll]);

  return { portalMounted, placement };
}

function placementToStyle(placement: AnchoredOverlayPlacement): CSSProperties {
  return {
    top: placement.top,
    left: placement.left,
    right: placement.right,
    width: placement.width,
    minWidth: placement.minWidth,
    maxHeight: placement.maxHeight,
  };
}

type AnchoredOverlayPortalProps = {
  open: boolean;
  onClose: () => void;
  anchorRef: RefObject<HTMLElement | null>;
  panelRef?: RefObject<HTMLDivElement | null>;
  getPlacement: (anchor: HTMLElement) => AnchoredOverlayPlacement;
  lockBodyScroll?: boolean;
  /** e.g. z-[60] wrapper */
  overlayClassName?: string;
  backdropClassName?: string;
  panelClassName?: string;
  closeAriaLabel?: string;
  dialogAriaLabel?: string;
  /** hide on small screens — map filter desktop-only */
  desktopOnly?: boolean;
  children: React.ReactNode;
};

/**
 * Map toolbar popover/dropdown — portal to document.body with fixed anchor.
 * Prevents z-index/stacking bugs when overlay extends over the map canvas.
 */
export function AnchoredOverlayPortal({
  open,
  onClose,
  anchorRef,
  panelRef,
  getPlacement,
  lockBodyScroll = false,
  overlayClassName,
  backdropClassName = "absolute inset-0 bg-black/50",
  panelClassName,
  closeAriaLabel,
  dialogAriaLabel,
  desktopOnly = false,
  children,
}: AnchoredOverlayPortalProps) {
  const { portalMounted, placement } = useAnchoredOverlayPortal({
    open,
    onClose,
    anchorRef,
    panelRef,
    getPlacement,
    lockBodyScroll,
  });

  if (!open || !portalMounted || !placement) return null;

  return createPortal(
    <div
      className={cn(
        "fixed inset-0 z-[60]",
        desktopOnly && "hidden md:block",
        overlayClassName,
      )}
      role="dialog"
      aria-modal="true"
      aria-label={dialogAriaLabel}
    >
      <button
        type="button"
        aria-label={closeAriaLabel}
        onClick={onClose}
        className={backdropClassName}
      />
      <div
        ref={panelRef}
        className={cn("absolute", panelClassName)}
        style={placementToStyle(placement)}
      >
        {children}
      </div>
    </div>,
    document.body,
  );
}

/** Filter panel — align panel right edge to trigger right */
export function anchoredPlacementBelowTriggerRight(
  anchor: HTMLElement,
  width = Math.min(448, window.innerWidth - 32),
): AnchoredOverlayPlacement {
  const rect = anchor.getBoundingClientRect();
  return {
    top: rect.bottom + 6,
    right: Math.max(16, window.innerWidth - rect.right),
    width,
  };
}

/** Dropdown — align panel left edge to trigger left */
export function anchoredPlacementBelowTriggerLeft(
  anchor: HTMLElement,
  minWidth = 176,
): AnchoredOverlayPlacement {
  const rect = anchor.getBoundingClientRect();
  return {
    top: rect.bottom + 6,
    left: rect.left,
    minWidth: Math.max(minWidth, rect.width),
    maxHeight: Math.min(256, window.innerHeight - rect.bottom - 16),
  };
}
