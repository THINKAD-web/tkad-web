"use client";

export type PointToastPayload = {
  amount: number;
  balance: number;
  label: string;
};

const STORAGE_KEY = "tkad-point-toast-queue";

export function enqueuePointToast(payload: PointToastPayload) {
  if (typeof window === "undefined") return;
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    const queue: PointToastPayload[] = raw ? JSON.parse(raw) : [];
    queue.push(payload);
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(queue));
    window.dispatchEvent(new CustomEvent("tkad-point-toast"));
  } catch {
    /* ignore */
  }
}

export function drainPointToasts(): PointToastPayload[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    sessionStorage.removeItem(STORAGE_KEY);
    return JSON.parse(raw) as PointToastPayload[];
  } catch {
    return [];
  }
}

export function formatPointToast(p: PointToastPayload): string {
  return `✦ +${p.amount.toLocaleString()}P 적립! (${p.label})\n현재 잔액: ${p.balance.toLocaleString()}P`;
}
