"use client";

import { useEffect } from "react";

const FOCUSABLE =
  'input:not([type="hidden"]):not([disabled]), textarea:not([disabled]), select:not([disabled])';

function inferInputMode(el: HTMLInputElement): string | undefined {
  if (el.inputMode && el.inputMode !== "text") return undefined;

  const type = el.type.toLowerCase();
  if (type === "tel") return "tel";
  if (type === "email") return "email";
  if (type === "number") return "numeric";
  if (type === "url") return "url";

  const hint = `${el.name} ${el.id} ${el.autocomplete}`.toLowerCase();
  if (hint.includes("phone") || hint.includes("tel") || hint.includes("mobile")) {
    return "tel";
  }
  if (hint.includes("email") || hint.includes("mail")) return "email";
  if (
    hint.includes("amount") ||
    hint.includes("price") ||
    hint.includes("budget") ||
    hint.includes("quantity") ||
    hint.includes("numeric")
  ) {
    return "numeric";
  }

  return undefined;
}

function enhanceInputModes(root: ParentNode) {
  root.querySelectorAll<HTMLInputElement>(FOCUSABLE).forEach((el) => {
    if (!(el instanceof HTMLInputElement)) return;
    const mode = inferInputMode(el);
    if (mode) el.inputMode = mode;
  });
}

/** Adds mobile-friendly inputMode when missing (tel / email / numeric). */
export function useMobileInputMode(enabled = true) {
  useEffect(() => {
    if (!enabled || typeof window === "undefined") return;
    if (!window.matchMedia("(max-width: 767px)").matches) return;

    enhanceInputModes(document);

    const observer = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        mutation.addedNodes.forEach((node) => {
          if (node instanceof HTMLElement) enhanceInputModes(node);
        });
      }
    });

    observer.observe(document.body, { childList: true, subtree: true });
    return () => observer.disconnect();
  }, [enabled]);
}
