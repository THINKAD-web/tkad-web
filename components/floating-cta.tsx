"use client";

import { useEffect, useState } from "react";
import { ArrowRight } from "lucide-react";
import { Link } from "@/i18n/navigation";

export function FloatingCta({ isKo }: { isKo: boolean }) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const onScroll = () => {
      const y = window.scrollY || 0;
      setVisible(y > 420);
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <div
      className={`fixed bottom-6 right-6 z-50 transition-all duration-300 ${
        visible ? "translate-y-0 opacity-100" : "translate-y-4 opacity-0 pointer-events-none"
      }`}
    >
      <div className="w-[360px] max-w-[calc(100vw-48px)]">
        <div className="tkad-home-floating-cta flex items-center justify-between gap-3 rounded-[22px] bg-white/5 px-4 py-3 backdrop-blur tkad-neon-border tkad-neon-glow">
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-white">
              {isKo ? "검증된 광고매체로 캠페인을 시작하세요" : "Start with verified media"}
            </p>
            <p className="mt-0.5 hidden truncate font-mono text-[11px] uppercase tracking-[0.2em] text-white/55 sm:block">
              {isKo ? "// 견적·집행까지 원스톱" : "// Quote to execution, one-stop"}
            </p>
          </div>
          <Link
            href="/contact"
            className="tkad-neon-cta inline-flex h-10 shrink-0 items-center gap-2 rounded-xl px-4 text-sm font-black text-white transition-transform hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/35"
          >
            {isKo ? "상담 신청" : "Contact"}
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </div>
    </div>
  );
}
