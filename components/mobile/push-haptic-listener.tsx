"use client";

import { useEffect } from "react";
import { hapticNotification } from "@/lib/haptic";

/** Listens for SW push messages and triggers haptic when a notification arrives in foreground. */
export function PushHapticListener() {
  useEffect(() => {
    if (typeof navigator === "undefined" || !("serviceWorker" in navigator)) return;

    const onMessage = (event: MessageEvent) => {
      const data = event.data as { type?: string } | null;
      if (data?.type === "PUSH_RECEIVED") hapticNotification();
    };

    navigator.serviceWorker.addEventListener("message", onMessage);
    return () => navigator.serviceWorker.removeEventListener("message", onMessage);
  }, []);

  return null;
}
