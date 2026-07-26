"use client";
import { useEffect, useState } from "react";
import Image from "next/image";
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
type Props = { className?: string };
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
      {" "}
      {visible ? (
        <motion.div
          className={cn(
            "fixed inset-0 z-[100] flex flex-col items-center justify-center md:hidden",
            "bg-gradient-to-br from-[#050508] via-violet-950 to-cyan-900",
            className,
          )}
          initial={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.4, ease: "easeOut" }}
          aria-hidden={!visible}
        >
          {" "}
          <motion.div
            initial={{ scale: 0.92, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.35, ease: "easeOut" }}
            className="flex flex-col items-center"
          >
            {" "}
            <Image
              src="/icons/icon-192.png"
              alt=""
              width={88}
              height={88}
              priority
              className="rounded-[22px] shadow-[0_20px_60px_rgba(139,92,246,0.45)]"
            />{" "}
            <p className="mt-5 text-3xl font-black tracking-tight text-white">
              THINK
              <span className="tkad-home-accent-text">AD</span>
            </p>
            <p className="mt-2 font-display text-xs font-medium uppercase tracking-[0.14em] text-white/50">
              OOH MKT
            </p>
          </motion.div>{" "}
        </motion.div>
      ) : null}{" "}
    </AnimatePresence>
  );
}
