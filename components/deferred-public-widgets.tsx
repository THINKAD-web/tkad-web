"use client";

/**
 * Floating widgets use `ssr: false` so the server HTML omits them; they mount only
 * on the client (localStorage, window, exit intent). That avoids hydration
 * mismatches for markup that depends on browser-only state.
 */
import dynamic from "next/dynamic";

const QuickInquiryButton = dynamic(
  () => import("@/components/quick-inquiry-button"),
  { ssr: false },
);
const KakaoChannelButton = dynamic(
  () => import("@/components/kakao-channel-button"),
  { ssr: false },
);
const AiChatbot = dynamic(() => import("@/components/ai-chatbot"), {
  ssr: false,
});
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
      <AiChatbot />
    </>
  );
}
