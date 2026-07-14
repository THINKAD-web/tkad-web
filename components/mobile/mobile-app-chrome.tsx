"use client";

import type { ReactNode } from "react";
import { MobileAppProviders } from "@/components/mobile/mobile-app-providers";
import { MobileAppOverlays } from "@/components/mobile/mobile-app-overlays";

type Props = {
  children: ReactNode;
};

/**
 * @deprecated Prefer MobileAppProviders + direct main children + MobileAppOverlays.
 * Kept for any legacy imports — no longer wraps children in extra streaming divs.
 */
export function MobileAppChrome({ children }: Props) {
  return (
    <MobileAppProviders>
      {children}
      <MobileAppOverlays />
    </MobileAppProviders>
  );
}
