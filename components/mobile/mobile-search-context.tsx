"use client";

import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";

type MobileSearchContextValue = {
  isOpen: boolean;
  openSearch: () => void;
  closeSearch: () => void;
};

const MobileSearchContext = createContext<MobileSearchContextValue | null>(null);

export function MobileSearchProvider({ children }: { children: ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);

  const openSearch = useCallback(() => setIsOpen(true), []);
  const closeSearch = useCallback(() => setIsOpen(false), []);

  const value = useMemo(
    () => ({ isOpen, openSearch, closeSearch }),
    [isOpen, openSearch, closeSearch],
  );

  return (
    <MobileSearchContext.Provider value={value}>{children}</MobileSearchContext.Provider>
  );
}

export function useMobileSearch(): MobileSearchContextValue {
  const ctx = useContext(MobileSearchContext);
  if (!ctx) {
    return {
      isOpen: false,
      openSearch: () => {},
      closeSearch: () => {},
    };
  }
  return ctx;
}
