"use client";

import { useEffect, useRef } from "react";

declare global {
  interface Window {
    turnstile?: {
      render: (
        container: HTMLElement,
        options: Record<string, unknown>,
      ) => string;
      reset: (widgetId: string) => void;
      remove: (widgetId: string) => void;
    };
  }
}

const SCRIPT_ID = "cf-turnstile-script";

function loadScript(): Promise<void> {
  return new Promise((resolve) => {
    if (window.turnstile) {
      resolve();
      return;
    }
    const existing = document.getElementById(SCRIPT_ID);
    if (existing) {
      existing.addEventListener("load", () => resolve());
      return;
    }
    const script = document.createElement("script");
    script.id = SCRIPT_ID;
    script.src = "https://challenges.cloudflare.com/turnstile/v0/api.js";
    script.async = true;
    script.onload = () => resolve();
    document.head.appendChild(script);
  });
}

export function TurnstileWidget({
  onVerify,
  className,
}: {
  onVerify: (token: string) => void;
  className?: string;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const widgetIdRef = useRef<string | null>(null);
  const onVerifyRef = useRef(onVerify);
  onVerifyRef.current = onVerify;

  const siteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;

  useEffect(() => {
    if (!siteKey) return;
    let cancelled = false;

    void loadScript()
      .then(() => {
        if (cancelled || !containerRef.current || !window.turnstile) return;
        if (widgetIdRef.current !== null) return;
        try {
          widgetIdRef.current = window.turnstile.render(containerRef.current, {
            sitekey: siteKey,
            callback: (token: string) => onVerifyRef.current(token),
            "expired-callback": () => onVerifyRef.current(""),
            theme: "light",
          });
        } catch (e) {
          // 잘못된 site key / 도메인 미허가 등 — Turnstile JS 가
          // "string did not match the expected pattern" 같은 에러를 throw 할 수 있음.
          // 위젯 비활성화 (= form 그대로 사용 가능).
          console.warn("[turnstile] render failed:", e);
        }
      })
      .catch((e) => {
        console.warn("[turnstile] script load failed:", e);
      });

    return () => {
      cancelled = true;
      if (widgetIdRef.current !== null && window.turnstile) {
        window.turnstile.remove(widgetIdRef.current);
        widgetIdRef.current = null;
      }
    };
  }, [siteKey]);

  if (!siteKey) return null;

  return <div ref={containerRef} className={className} />;
}
