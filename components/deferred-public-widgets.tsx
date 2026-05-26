"use client";

/**
 * Floating widgets use `ssr: false` so the server HTML omits them; they mount only
 * on the client (localStorage, window). That avoids hydration mismatches for
 * markup that depends on browser-only state.
 */
import dynamic from "next/dynamic";
import { ContactChannelProvider } from "@/components/contact/contact-channel-provider";

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
const HomeOnboardingTour = dynamic(
  () => import("@/components/home/home-onboarding-tour"),
  { ssr: false },
);
export default function DeferredPublicWidgets() {
  return (
    <ContactChannelProvider>
      <PwaCatalogSync />
      <RecentlyViewedSync />
      <HomeOnboardingTour />
      <FloatingSupportDock />
    </ContactChannelProvider>
  );
}
