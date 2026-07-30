"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";

type MobileChromeOverlayContextValue = {
  isAnyOpen: boolean;
  setOpen: (key: string, open: boolean) => void;
};

const MobileChromeOverlayContext =
  createContext<MobileChromeOverlayContextValue | null>(null);

/** Guest/profile header dropdown 등 모바일 full-bleed overlay open 상태 */
export function MobileChromeOverlayProvider({ children }: { children: ReactNode }) {
  const [openKeys, setOpenKeys] = useState<Set<string>>(() => new Set());

  const setOpen = useCallback((key: string, open: boolean) => {
    setOpenKeys((prev) => {
      const next = new Set(prev);
      if (open) next.add(key);
      else next.delete(key);
      if (next.size === prev.size && [...next].every((k) => prev.has(k))) {
        return prev;
      }
      return next;
    });
  }, []);

  const value = useMemo(
    () => ({
      isAnyOpen: openKeys.size > 0,
      setOpen,
    }),
    [openKeys, setOpen],
  );

  return (
    <MobileChromeOverlayContext.Provider value={value}>
      {children}
    </MobileChromeOverlayContext.Provider>
  );
}

export function useMobileChromeOverlayOptional() {
  return useContext(MobileChromeOverlayContext);
}
