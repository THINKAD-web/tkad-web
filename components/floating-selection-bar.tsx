"use client";

import { type ReactNode } from "react";
import {
  FLOATING_SELECTION_BAR_BOTTOM_SPACER_CLASS,
  FLOATING_SELECTION_BAR_COMPACT_BOTTOM_CLASS,
  FLOATING_SELECTION_BAR_COMPACT_SPACER_CLASS,
  StickyActionBar,
  StickyActionBarSpacer,
  type StickyActionBarVariant,
} from "@/components/sticky-action-bar";

export {
  FLOATING_SELECTION_BAR_BOTTOM_SPACER_CLASS,
  FLOATING_SELECTION_BAR_COMPACT_BOTTOM_CLASS,
  FLOATING_SELECTION_BAR_COMPACT_SPACER_CLASS,
};

type Props = {
  open: boolean;
  ariaLabel: string;
  children: ReactNode;
  className?: string;
  variant?: StickyActionBarVariant;
  compact?: boolean;
  aboveMobileChrome?: boolean;
  hideSpacer?: boolean;
  spacerClassName?: string;
  respectFooter?: boolean;
};

/** @deprecated Prefer `StickyActionBar` — thin wrapper for 기존 import 경로 */
export function FloatingSelectionBar({
  open,
  ariaLabel,
  children,
  className,
  variant = "default",
  compact = false,
  aboveMobileChrome = false,
  hideSpacer = false,
  spacerClassName,
  respectFooter = false,
}: Props) {
  return (
    <>
      {hideSpacer ? null : (
        <StickyActionBarSpacer
          open={open}
          compact={compact}
          className={spacerClassName}
        />
      )}
      <StickyActionBar
        open={open}
        ariaLabel={ariaLabel}
        layout="dock"
        variant={variant}
        compact={compact}
        aboveMobileChrome={aboveMobileChrome}
        respectFooter={respectFooter}
        className={className}
      >
        {children}
      </StickyActionBar>
    </>
  );
}
