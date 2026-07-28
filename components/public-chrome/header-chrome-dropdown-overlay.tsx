"use client";

import {
  useEffect,
  useState,
  type ReactNode,
  type RefObject,
} from "react";
import { createPortal } from "react-dom";
import {
  headerChromeDropdownBackdropMobileClass,
  headerChromeDropdownPanelDesktopClass,
  headerChromeDropdownPanelMobileClass,
} from "@/components/public-chrome/header-chrome-buttons";
import { useMobileChromeOverlayOptional } from "@/components/mobile/mobile-chrome-overlay-context";

function useIsMobileHeaderChrome() {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia("(max-width: 767px)");
    const update = () => setIsMobile(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);

  return isMobile;
}

type Props = {
  open: boolean;
  onClose: () => void;
  anchorRef: RefObject<HTMLElement | null>;
  panelRef: RefObject<HTMLDivElement | null>;
  overlayKey: string;
  closeAriaLabel: string;
  children: ReactNode;
  panelRole?: string;
};

/**
 * Guest/profile chrome dropdown — mobile panel+backdrop portal to body
 * (header backdrop-filter breaks fixed positioning inside sticky header).
 */
export function HeaderChromeDropdownOverlay({
  open,
  onClose,
  anchorRef,
  panelRef,
  overlayKey,
  closeAriaLabel,
  children,
  panelRole,
}: Props) {
  const [mounted, setMounted] = useState(false);
  const isMobile = useIsMobileHeaderChrome();
  const chromeOverlay = useMobileChromeOverlayOptional();

  useEffect(() => {
    queueMicrotask(() => setMounted(true));
  }, []);

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
      if (panelRef.current?.contains(target)) return;
      onClose();
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open, onClose, anchorRef, panelRef]);

  useEffect(() => {
    if (!open || !isMobile) return;
    const prevBodyOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prevBodyOverflow;
    };
  }, [open, isMobile]);

  useEffect(() => {
    if (!isMobile || !chromeOverlay) return;
    if (open) chromeOverlay.setOpen(overlayKey, true);
    return () => chromeOverlay.setOpen(overlayKey, false);
  }, [open, isMobile, chromeOverlay, overlayKey]);

  if (!open || !mounted) return null;

  const panel = (
    <div
      ref={panelRef}
      role={panelRole}
      className={
        isMobile
          ? headerChromeDropdownPanelMobileClass
          : headerChromeDropdownPanelDesktopClass
      }
    >
      {children}
    </div>
  );

  if (isMobile) {
    return createPortal(
      <>
        <button
          type="button"
          aria-label={closeAriaLabel}
          className={headerChromeDropdownBackdropMobileClass}
          onClick={onClose}
        />
        {panel}
      </>,
      document.body,
    );
  }

  return panel;
}
