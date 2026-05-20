"use client";

import { useEffect, useRef } from "react";
import { AB_COOKIE_NAME, AB_TEST_KEY, isAbVariant } from "@/lib/ab-testing";

function readVariantFromCookie(): string | null {
  if (typeof document === "undefined") return null;
  const match = document.cookie
    .split("; ")
    .find((row) => row.startsWith(`${AB_COOKIE_NAME}=`));
  if (!match) return null;
  return decodeURIComponent(match.split("=")[1] ?? "");
}

export function trackAbEvent(
  event: "cta_click" | "hero_impression",
  page: string,
) {
  const variant = readVariantFromCookie();
  if (!isAbVariant(variant)) return;

  void fetch("/api/ab/track", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      variant,
      event,
      page,
      testKey: AB_TEST_KEY,
    }),
    keepalive: true,
  }).catch(() => {});
}

/** 홈 히어로 노출 1회 (세션당) */
export function AbHeroImpression({ page = "/" }: { page?: string }) {
  const sent = useRef(false);

  useEffect(() => {
    if (sent.current) return;
    if (typeof sessionStorage === "undefined") return;
    const key = `tkad_ab_hero_imp:${page}`;
    if (sessionStorage.getItem(key)) return;
    sessionStorage.setItem(key, "1");
    sent.current = true;
    trackAbEvent("hero_impression", page);
  }, [page]);

  return null;
}
