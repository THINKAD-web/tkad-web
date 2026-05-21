"use client";

import { useLocale } from "next-intl";
import { Link } from "@/i18n/navigation";
import { ArrowUpRight } from "lucide-react";
import { cn } from "@/lib/utils";

type Stat = {
  value: string;
  labelKo: string;
  labelEn: string;
  href: string;
};

const STATS: Stat[] = [
  {
    value: "500+",
    labelKo: "검증 매체",
    labelEn: "Verified media",
    href: "/media",
  },
  {
    value: "129+",
    labelKo: "활성 브랜드",
    labelEn: "Active brands",
    href: "/cases",
  },
  {
    value: "24시간",
    labelKo: "평균 응답",
    labelEn: "Avg. response",
    href: "/contact",
  },
  {
    value: "1.8억",
    labelKo: "누적 노출",
    labelEn: "Total impressions",
    href: "/media",
  },
];

export function HomeSocialProof() {
  const locale = useLocale();
  const isKo = locale.startsWith("ko");

  return (
    <section
      className="mx-auto w-full max-w-6xl px-4 py-4 sm:px-6 lg:px-8"
      aria-label={isKo ? "신뢰 지표" : "Trust metrics"}
    >
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4">
        {STATS.map((s) => (
          <Link
            key={s.href + s.value}
            href={s.href}
            className={cn(
              "group relative overflow-hidden rounded-2xl border dark:border-white/12 border-gray-200 bg-white/[0.04] p-4 transition-all",
              "hover:border-cyan-400/40 hover:bg-white/[0.08] hover:-translate-y-0.5",
            )}
          >
            <p className="font-mono text-2xl font-black tabular-nums tracking-tight dark:text-white text-gray-900 sm:text-3xl">
              {s.value}
            </p>
            <p className="mt-1 text-xs font-semibold dark:text-white text-gray-600 sm:text-sm">
              {isKo ? s.labelKo : s.labelEn}
            </p>
            <ArrowUpRight
              className="absolute right-3 top-3 h-4 w-4 dark:text-white text-gray-300 transition-colors group-hover:text-cyan-300"
              aria-hidden
            />
          </Link>
        ))}
      </div>
    </section>
  );
}
