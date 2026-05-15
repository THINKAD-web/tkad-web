"use client";

import { usePathname } from "@/i18n/navigation";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { cn } from "@/lib/utils";

export default function PageTransition({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const [show, setShow] = useState(true);
  const [displayChildren, setDisplayChildren] = useState<ReactNode>(children ?? null);
  const firstPaint = useRef(true);
  const latestChildrenRef = useRef<ReactNode>(children ?? null);

  useEffect(() => {
    latestChildrenRef.current = children ?? null;
  }, [children]);

  useEffect(() => {
    if (firstPaint.current) {
      firstPaint.current = false;
      return;
    }
    const hideFrame = requestAnimationFrame(() => setShow(false));
    const id = setTimeout(() => {
      setDisplayChildren(latestChildrenRef.current);
      requestAnimationFrame(() => setShow(true));
    }, 120);
    return () => {
      cancelAnimationFrame(hideFrame);
      clearTimeout(id);
    };
  }, [pathname]);

  return (
    <div
      className={cn(
        "flex min-h-0 flex-1 flex-col ease-out motion-reduce:transition-none motion-reduce:translate-y-0",
        "origin-top transition-[opacity,transform] duration-200",
        show
          ? "translate-y-0 opacity-100"
          : "pointer-events-none translate-y-1 opacity-0 motion-reduce:translate-y-0",
      )}
    >
      {displayChildren}
    </div>
  );
}
