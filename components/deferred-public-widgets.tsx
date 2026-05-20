"use client";

/**
 * Floating widgets use `ssr: false` so the server HTML omits them; they mount only
 * on the client (localStorage, window, exit intent). That avoids hydration
 * mismatches for markup that depends on browser-only state.
 */
import dynamic from "next/dynamic";

const ExitIntentPopup = dynamic(
  () => import("@/components/exit-intent-popup"),
  { ssr: false },
);
const FloatingSupportDock = dynamic(
  () => import("@/components/floating-support-dock"),
  { ssr: false },
);
const RecentlyViewedSync = dynamic(
  () => import("@/components/recently-viewed-sync"),
  { ssr: false },
);
const PwaCatalogSync = dynamic(
  () => import("@/components/pwa-catalog-sync").then((m) => ({ default: m.PwaCatalogSync })),
  { ssr: false },
);
const PwaPushOptIn = dynamic(
  () => import("@/components/pwa-push-opt-in").then((m) => ({ default: m.PwaPushOptIn })),
  { ssr: false },
);

export default function DeferredPublicWidgets() {
  return (
    <>
      <PwaCatalogSync />
      <RecentlyViewedSync />
      <PwaPushOptIn />
      <ExitIntentPopup />
      <FloatingSupportDock />
    </>
  );
}
