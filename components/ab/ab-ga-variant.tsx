"use client";

import { useEffect } from "react";
import { AB_COOKIE_NAME, isAbVariant } from "@/lib/ab-testing";

declare global {
  interface Window {
    gtag?: (...args: unknown[]) => void;
    dataLayer?: unknown[];
  }
}

function readVariantFromCookie(): string | null {
  if (typeof document === "undefined") return null;
  const match = document.cookie
    .split("; ")
    .find((row) => row.startsWith(`${AB_COOKIE_NAME}=`));
  if (!match) return null;
  return decodeURIComponent(match.split("=")[1] ?? "");
}

/** GA4 user property + 이벤트로 variant 전송 */
export function AbGaVariantSync() {
  useEffect(() => {
    const variant = readVariantFromCookie();
    if (!isAbVariant(variant)) return;

    const send = () => {
      if (typeof window.gtag !== "function") return;
      window.gtag("set", "user_properties", { ab_variant: variant });
      window.gtag("event", "ab_variant_assigned", {
        ab_variant: variant,
        test_key: "hero_cta",
      });
    };

    send();
    const id = window.setInterval(() => {
      if (typeof window.gtag === "function") {
        send();
        window.clearInterval(id);
      }
    }, 500);
    return () => window.clearInterval(id);
  }, []);

  return null;
}
