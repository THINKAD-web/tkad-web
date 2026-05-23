"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { cn } from "@/lib/utils";

function isStandalonePwa(): boolean {
  if (typeof window === "undefined") return false;
  const mq = window.matchMedia("(display-mode: standalone)");
  const iosStandalone =
    "standalone" in window.navigator &&
    (window.navigator as Navigator & { standalone?: boolean }).standalone;
  return mq.matches || Boolean(iosStandalone);
}

type Props = {
  className?: string;
};

export function PwaSplashScreen({ className }: Props) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!isStandalonePwa()) return;
    setVisible(true);
    const id = window.setTimeout(() => setVisible(false), 1000);
    return () => window.clearTimeout(id);
  }, []);

  return (
    <AnimatePresence>
      {visible ? (
        <motion.div
          className={cn(
            "fixed inset-0 z-[100] flex flex-col items-center justify-center bg-gradient-to-br from-[#020202] via-violet-950 to-cyan-950 md:hidden",
            className,
          )}
          initial={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.35, ease: "easeOut" }}
          aria-hidden={!visible}
        >
          <p className="text-3xl font-black tracking-tight text-white">
            <span>THINK</span>
            <span className="tkad-home-accent-text">AD</span>
          </p>
          <p className="mt-2 font-mono text-[10px] font-bold uppercase tracking-[0.28em] text-white/50">
            OOH Platform
          </p>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
