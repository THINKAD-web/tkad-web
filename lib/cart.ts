"use client";

import { useCallback, useEffect, useState } from "react";

export const CART_KEY = "tkad-media-cart-v1";

function readRaw(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(CART_KEY);
    if (!raw) return [];
    const arr = JSON.parse(raw);
    return Array.isArray(arr) ? arr.filter((x): x is string => typeof x === "string") : [];
  } catch {
    return [];
  }
}

function writeRaw(ids: string[]) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(CART_KEY, JSON.stringify(ids));
  window.dispatchEvent(new CustomEvent("tkad:cart-changed", { detail: ids }));
}

export function useCart() {
  const [ids, setIds] = useState<string[]>([]);

  useEffect(() => {
    setIds(readRaw());
    const onChange = (e: Event) => {
      const detail = (e as CustomEvent<string[]>).detail;
      if (Array.isArray(detail)) setIds(detail);
      else setIds(readRaw());
    };
    const onStorage = (e: StorageEvent) => {
      if (e.key === CART_KEY) setIds(readRaw());
    };
    window.addEventListener("tkad:cart-changed", onChange);
    window.addEventListener("storage", onStorage);
    return () => {
      window.removeEventListener("tkad:cart-changed", onChange);
      window.removeEventListener("storage", onStorage);
    };
  }, []);

  const add = useCallback((id: string) => {
    const cur = readRaw();
    if (cur.includes(id)) return;
    writeRaw([...cur, id]);
  }, []);

  const remove = useCallback((id: string) => {
    writeRaw(readRaw().filter((x) => x !== id));
  }, []);

  const toggle = useCallback((id: string) => {
    const cur = readRaw();
    writeRaw(cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id]);
  }, []);

  const clear = useCallback(() => writeRaw([]), []);

  const has = useCallback((id: string) => ids.includes(id), [ids]);

  return { ids, add, remove, toggle, clear, has };
}
