"use client";

import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

export default function ConditionalPublicChrome({
  children,
}: {
  children: ReactNode;
}) {
  const pathname = usePathname();
  if (pathname.includes("/admin")) return null;
  return <>{children}</>;
}
