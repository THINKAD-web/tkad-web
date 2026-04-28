"use client";

import { useEffect } from "react";

/**
 * PWA Service Worker 등록.
 *
 * 정책:
 *   - 운영 환경(production)에서만 등록 (dev 환경에서 SW 가 HMR 방해함)
 *   - admin / 인증 경로 진입 시 등록 안 함 (SW 자체가 이미 admin/api 우회하지만 이중 안전)
 *   - 등록 실패해도 페이지는 정상 동작 (silently catch)
 */
export default function PwaRegister() {
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!("serviceWorker" in navigator)) return;
    if (process.env.NODE_ENV !== "production") return;

    const path = window.location.pathname;
    if (
      path.startsWith("/admin") ||
      path.startsWith("/login") ||
      path.startsWith("/register")
    ) {
      return;
    }

    const onLoad = () => {
      navigator.serviceWorker
        .register("/sw.js", { scope: "/" })
        .catch((err) => {
          // 운영 모니터링에 noise 만 남기지 않도록 console.warn 만
          console.warn("[pwa] SW registration failed:", err);
        });
    };

    if (document.readyState === "complete") {
      onLoad();
    } else {
      window.addEventListener("load", onLoad);
      return () => window.removeEventListener("load", onLoad);
    }
  }, []);

  return null;
}
