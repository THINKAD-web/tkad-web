"use client";

import dynamic from "next/dynamic";

const QuickInquiryButton = dynamic(
  () => import("@/components/quick-inquiry-button"),
  { ssr: false },
);
const KakaoChannelButton = dynamic(
  () => import("@/components/kakao-channel-button"),
  { ssr: false },
);
const FloatingCta = dynamic(() => import("@/components/floating-cta"), {
  ssr: false,
});
const ExitIntentPopup = dynamic(
  () => import("@/components/exit-intent-popup"),
  { ssr: false },
);

export default function DeferredPublicWidgets() {
  return (
    <>
      <QuickInquiryButton />
      <FloatingCta />
      <ExitIntentPopup />
      <KakaoChannelButton />
    </>
  );
}
