"use client";

import { useEffect, useState } from "react";
import { ArrowRight } from "lucide-react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";

export function FloatingCta() {
  const t = useTranslations("homePage");
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
        <div className="tkad-home-floating-cta flex items-center justify-between gap-3 rounded-[22px] dark:bg-white/5 bg-gray-50 px-4 py-3 backdrop-blur tkad-neon-border tkad-neon-glow">
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold dark:text-white text-gray-900">
              {t("floatingTitle")}
            </p>
            <p className="mt-0.5 hidden truncate font-mono text-[11px] uppercase tracking-[0.2em] dark:text-white text-gray-500 sm:block">
              {t("floatingSub")}
            </p>
          </div>
          <Link
            href="/contact"
            className="tkad-neon-cta inline-flex h-10 shrink-0 items-center gap-2 rounded-xl px-4 text-sm font-black dark:text-white text-gray-900 transition-transform hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/35"
          >
            {t("floatingCta")}
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </div>
    </div>
  );
}
