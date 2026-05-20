"use client";

const PROMPT_DISMISS_KEY = "tkad-push-prompt-dismissed";
const ONBOARDING_FLAG = "tkad-onboarding-completed-push";

function urlBase64ToUint8Array(base64: string): Uint8Array {
  const padding = "=".repeat((4 - (base64.length % 4)) % 4);
  const b64 = (base64 + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(b64);
  const out = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
  return out;
}

export function shouldShowPushPrompt(): boolean {
  if (typeof window === "undefined") return false;
  if (!("Notification" in window) || !("serviceWorker" in navigator)) {
    return false;
  }
  if (Notification.permission !== "default") return false;
  if (localStorage.getItem(PROMPT_DISMISS_KEY)) return false;
  try {
    return (
      localStorage.getItem(ONBOARDING_FLAG) === "1" ||
      sessionStorage.getItem(ONBOARDING_FLAG) === "1"
    );
  } catch {
    return sessionStorage.getItem(ONBOARDING_FLAG) === "1";
  }
}

export function markOnboardingCompletedForPush(): void {
  if (typeof window === "undefined") return;
  sessionStorage.setItem(ONBOARDING_FLAG, "1");
  try {
    localStorage.setItem(ONBOARDING_FLAG, "1");
  } catch {
    /* ignore */
  }
}

export function dismissPushPrompt(): void {
  localStorage.setItem(PROMPT_DISMISS_KEY, "1");
}

export async function subscribeToWebPush(): Promise<boolean> {
  const res = await fetch("/api/push/vapid-public-key");
  const data = (await res.json()) as {
    configured?: boolean;
    publicKey?: string | null;
  };
  if (!data.configured || !data.publicKey) return false;

  const perm = await Notification.requestPermission();
  if (perm !== "granted") return false;

  const reg = await navigator.serviceWorker.ready;
  const sub = await reg.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: urlBase64ToUint8Array(
      data.publicKey,
    ) as BufferSource,
  });

  const json = sub.toJSON();
  const save = await fetch("/api/push/subscribe", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({
      endpoint: json.endpoint,
      keys: json.keys,
    }),
  });
  return save.ok;
}
