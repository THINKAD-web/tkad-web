"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";

export default function TopLoader() {
  const pathname = usePathname();
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- progress bar animation on route change
    setLoading(true);
    setProgress(70);
    const t1 = setTimeout(() => setProgress(90), 200);
    const t2 = setTimeout(() => {
      setProgress(100);
      setTimeout(() => {
        setLoading(false);
        setProgress(0);
      }, 200);
    }, 400);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, [pathname]);

  if (!loading && progress === 0) return null;

  return (
    <>
      <div
        className="fixed top-0 left-0 z-[100] h-[3px] bg-gradient-to-r from-navy via-cta to-gold shadow-[0_0_10px_rgba(26,42,108,0.35)] transition-all duration-300 ease-out"
        style={{ width: `${progress}%`, opacity: progress === 100 ? 0 : 1 }}
      />
      <div
        className="pointer-events-none fixed inset-0 z-[99] flex items-center justify-center bg-background/25 backdrop-blur-[2px] motion-reduce:hidden"
        style={{ opacity: progress === 100 ? 0 : 1, transition: "opacity 0.25s ease-out" }}
        aria-hidden
      >
        <div
          className="h-9 w-9 rounded-full border-2 border-navy/15 border-t-navy motion-safe:animate-spin"
          role="status"
          aria-label="Loading"
        />
      </div>
    </>
  );
}
