"use client";

import { usePathname } from "@/i18n/navigation";
import { useEffect, useState, useRef, type ReactNode } from "react";
import { cn } from "@/lib/utils";

export default function PageTransition({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const [show, setShow] = useState(true);
  const [displayChildren, setDisplayChildren] = useState<ReactNode>(children ?? null);
  const firstPaint = useRef(true);
  const childrenRef = useRef(children);
  childrenRef.current = children ?? null;

  useEffect(() => {
    if (firstPaint.current) {
      firstPaint.current = false;
      setDisplayChildren(childrenRef.current ?? null);
      return;
    }
    // eslint-disable-next-line react-hooks/set-state-in-effect -- intentional route transition
    setShow(false);
    const id = setTimeout(() => {
      setDisplayChildren(childrenRef.current ?? null);
      requestAnimationFrame(() => setShow(true));
    }, 120);
    return () => clearTimeout(id);
  }, [pathname]);

  return (
    <div
      className={cn(
        "ease-out motion-reduce:transition-none motion-reduce:translate-y-0",
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
