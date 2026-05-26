"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { ActionSheetItem } from "@/components/mobile/action-sheet";

type DetailChromeState = {
  title?: string;
  sheetItems: ActionSheetItem[];
};

type DetailChromeContextValue = {
  detail: DetailChromeState;
  setDetailChrome: (patch: Partial<DetailChromeState>) => void;
  clearDetailChrome: () => void;
};

const defaultState: DetailChromeState = { sheetItems: [] };

const MobileDetailChromeContext = createContext<DetailChromeContextValue | null>(
  null,
);

export function MobileDetailChromeProvider({ children }: { children: ReactNode }) {
  const [detail, setDetail] = useState<DetailChromeState>(defaultState);

  const setDetailChrome = useCallback((patch: Partial<DetailChromeState>) => {
    setDetail((prev) => {
      const nextTitle = patch.title !== undefined ? patch.title : prev.title;
      const nextItems =
        patch.sheetItems !== undefined ? patch.sheetItems : prev.sheetItems;
      if (prev.title === nextTitle && prev.sheetItems === nextItems) {
        return prev;
      }
      return { title: nextTitle, sheetItems: nextItems };
    });
  }, []);

  const clearDetailChrome = useCallback(() => {
    setDetail((prev) => {
      if (!prev.title && prev.sheetItems.length === 0) return prev;
      return defaultState;
    });
  }, []);

  const value = useMemo(
    () => ({ detail, setDetailChrome, clearDetailChrome }),
    [detail, setDetailChrome, clearDetailChrome],
  );

  return (
    <MobileDetailChromeContext.Provider value={value}>
      {children}
    </MobileDetailChromeContext.Provider>
  );
}

export function useMobileDetailChrome() {
  const ctx = useContext(MobileDetailChromeContext);
  if (!ctx) {
    throw new Error("useMobileDetailChrome must be used within MobileDetailChromeProvider");
  }
  return ctx;
}

/** Safe optional hook for pages outside provider (no-op). */
export function useMobileDetailChromeOptional() {
  return useContext(MobileDetailChromeContext);
}
