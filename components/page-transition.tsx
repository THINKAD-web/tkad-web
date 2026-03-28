"use client";

import { usePathname } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";

export default function PageTransition({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const [show, setShow] = useState(true);
  const [displayChildren, setDisplayChildren] = useState(children);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- transition animation on route change
    setShow(false);
    const id = setTimeout(() => {
      setDisplayChildren(children);
      setShow(true);
    }, 120);
    return () => clearTimeout(id);
  }, [pathname]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div
      className={`transition-opacity duration-500 ease-out motion-reduce:transition-none ${
        show ? "opacity-100" : "opacity-0"
      }`}
    >
      {displayChildren}
    </div>
  );
}
