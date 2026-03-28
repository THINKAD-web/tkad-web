"use client";

import { usePathname } from "@/i18n/navigation";
import { useEffect, useState, useRef, type ReactNode } from "react";
import { cn } from "@/lib/utils";

export default function PageTransition({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const [show, setShow] = useState(true);
  const [displayChildren, setDisplayChildren] = useState(children);
  const firstPaint = useRef(true);
  const childrenRef = useRef(children);
  childrenRef.current = children;

  useEffect(() => {
    if (firstPaint.current) {
      firstPaint.current = false;
      setDisplayChildren(childrenRef.current);
      return;
    }
    // eslint-disable-next-line react-hooks/set-state-in-effect -- intentional route transition
    setShow(false);
    const id = setTimeout(() => {
      setDisplayChildren(childrenRef.current);
      requestAnimationFrame(() => setShow(true));
    }, 200);
    return () => clearTimeout(id);
  }, [pathname]);

  return (
    <div
      className={cn(
        "ease-out transition-[opacity,transform] duration-300 motion-reduce:transition-none",
        show
          ? "translate-y-0 opacity-100"
          : "pointer-events-none translate-y-2 opacity-0",
      )}
    >
      {displayChildren}
    </div>
  );
}
