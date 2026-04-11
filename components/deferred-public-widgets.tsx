"use client";

/**
 * Floating widgets use `ssr: false` so the server HTML omits them; they mount only
 * on the client (localStorage, window, exit intent). That avoids hydration
 * mismatches for markup that depends on browser-only state.
 */
import dynamic from "next/dynamic";

const AiChatbot = dynamic(() => import("@/components/ai-chatbot"), {
  ssr: false,
});
const FloatingScrollNav = dynamic(
  () => import("@/components/floating-scroll-nav"),
  { ssr: false },
);
const ExitIntentPopup = dynamic(
  () => import("@/components/exit-intent-popup"),
  { ssr: false },
);

export default function DeferredPublicWidgets() {
  return (
    <>
      <FloatingScrollNav />
      <ExitIntentPopup />
      <AiChatbot />
    </>
  );
}
