/** Shared lazy-chunk prefetch helpers — idempotent, safe to call repeatedly. */

let supportAiChatModalPromise: Promise<unknown> | null = null;
let mapChunksPromise: Promise<unknown> | null = null;

export function prefetchSupportAiChatModal() {
  if (!supportAiChatModalPromise) {
    supportAiChatModalPromise = import("@/components/support/support-ai-chat-modal");
  }
  return supportAiChatModalPromise;
}

export function prefetchMapChunks() {
  if (!mapChunksPromise) {
    mapChunksPromise = Promise.all([
      import("@/components/public-map/dark-map-view"),
      import("@/components/media-map/media-map-page-client"),
    ]);
  }
  return mapChunksPromise;
}

/** Idle-time prefetch — no-op on SSR. */
export function prefetchOnIdle(fn: () => void, timeoutMs = 2500) {
  if (typeof window === "undefined") return () => {};
  const run = () => {
    try {
      fn();
    } catch {
      /* ignore */
    }
  };
  if (typeof window.requestIdleCallback === "function") {
    const id = window.requestIdleCallback(run, { timeout: timeoutMs });
    return () => window.cancelIdleCallback(id);
  }
  const id = globalThis.setTimeout(run, Math.min(timeoutMs, 1200));
  return () => globalThis.clearTimeout(id);
}
