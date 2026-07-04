"use client";

import type { ReactNode } from "react";
import { usePathname } from "next/navigation";

function isAdminPathname(pathname: string | null): boolean {
  return pathname != null && /\/(?:ko|en)\/admin(?:\/|$)/.test(pathname);
}

/** Skips analytics/widgets on admin routes without calling headers() in the locale layout. */
export function PublicOnlyMount({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  if (isAdminPathname(pathname)) return null;
  return <>{children}</>;
}
