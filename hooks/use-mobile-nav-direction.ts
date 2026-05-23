"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname } from "@/i18n/navigation";

const STACK_KEY = "tkad-mobile-nav-stack";

function readStack(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = sessionStorage.getItem(STACK_KEY);
    const parsed = raw ? (JSON.parse(raw) as string[]) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeStack(stack: string[]) {
  sessionStorage.setItem(STACK_KEY, JSON.stringify(stack.slice(-30)));
}

/** 1 = forward (slide from right), -1 = back (slide from left) */
export function useMobileNavDirection(): number {
  const pathname = usePathname() ?? "/";
  const prevPath = useRef<string | null>(null);
  const [direction, setDirection] = useState(1);

  useEffect(() => {
    const path = pathname || "/";
    if (prevPath.current === path) return;

    const stack = readStack();
    const existingIdx = stack.lastIndexOf(path);

    if (existingIdx >= 0 && existingIdx < stack.length - 1) {
      setDirection(-1);
      writeStack(stack.slice(0, existingIdx + 1));
    } else {
      setDirection(1);
      writeStack([...stack, path]);
    }

    prevPath.current = path;
  }, [pathname]);

  return direction;
}
