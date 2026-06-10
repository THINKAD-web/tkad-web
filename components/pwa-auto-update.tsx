"use client";

import { useEffect } from "react";

/**
 * PWA 자동 갱신 — 새 서비스워커가 활성화되면(새 배포) 1회 자동 새로고침해
 * 사용자가 캐시된 옛 번들에 머무르지 않도록 한다.
 * next-pwa 의 sw.js 는 self.skipWaiting() 을 호출하므로 새 SW 가 즉시 활성화되고
 * controllerchange 가 발생한다.
 */
export function PwaAutoUpdate() {
  useEffect(() => {
    if (typeof navigator === "undefined" || !("serviceWorker" in navigator)) {
      return;
    }
    let reloaded = false;
    const onControllerChange = () => {
      if (reloaded) return;
      reloaded = true;
      window.location.reload();
    };
    navigator.serviceWorker.addEventListener("controllerchange", onControllerChange);

    // 진입 시 즉시 업데이트 확인 + 대기 중인 SW 활성화 유도
    navigator.serviceWorker
      .getRegistration()
      .then((reg) => {
        if (!reg) return;
        reg.update().catch(() => {});
        if (reg.waiting) reg.waiting.postMessage({ type: "SKIP_WAITING" });
        reg.addEventListener("updatefound", () => {
          const nw = reg.installing;
          if (!nw) return;
          nw.addEventListener("statechange", () => {
            if (nw.state === "installed" && navigator.serviceWorker.controller) {
              nw.postMessage({ type: "SKIP_WAITING" });
            }
          });
        });
      })
      .catch(() => {});

    return () => {
      navigator.serviceWorker.removeEventListener(
        "controllerchange",
        onControllerChange,
      );
    };
  }, []);

  return null;
}
