"use client";

import ScrollAnimate from "@/components/scroll-animate";
import { NeonSection } from "@/components/landing/neon/neon-section";
import { NeonSectionHead } from "@/components/landing/neon/neon-section-head";
import { useTkadAppearance } from "@/lib/use-tkad-appearance";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";

export function HomeClientLogos() {
  const t = useTranslations("homePage");
  const appearance = useTkadAppearance();
  const isDay = appearance === "day";

  const logos = [
    "Samsung",
    "Hyundai",
    "LG",
    "Coupang",
    "Kakao",
    "Naver",
    "Shinsegae",
    "Lotte",
    "KB",
    "Shinhan",
    "SK",
    "CJ",
  ];
  const brandColor: Record<string, string> = {
    Samsung: "#1428A0",
    Hyundai: "#002C5F",
    LG: "#A50034",
    Coupang: "#E52528",
    Kakao: "#FEE500",
    Naver: "#03C75A",
    Shinsegae: "#C8102E",
    Lotte: "#DA291C",
    KB: "#FFBC00",
    Shinhan: "#0072CE",
    SK: "#FF7A00",
    CJ: "#E4002B",
  };
  const needsChip = new Set(["Kakao", "KB"]);
  const row = [...logos, ...logos];

  return (
    <NeonSection>
      <ScrollAnimate>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <NeonSectionHead
            number="00"
            kicker={t("trustKicker")}
title={t("trustTitle")}
            meta={t("trustMeta")}
            className="mb-0 flex-1"
          />
        </div>
      </ScrollAnimate>

      <div className="relative mt-5 overflow-hidden rounded-[28px] dark:bg-white/5 bg-gray-50 backdrop-blur tkad-neon-border tkad-neon-glow sm:mt-8 lg:mt-12">
        <div
          aria-hidden
          className={cn(
            "pointer-events-none absolute inset-y-0 left-0 w-24 bg-gradient-to-r to-transparent",
            isDay ? "from-[#f4f6fb]" : "from-[#05050a]",
          )}
        />
        <div
          aria-hidden
          className={cn(
            "pointer-events-none absolute inset-y-0 right-0 w-24 bg-gradient-to-l to-transparent",
            isDay ? "from-[#f4f6fb]" : "from-[#05050a]",
          )}
        />
        <div className="py-7">
          <div className="tkad-marquee px-7">
            {row.map((label, idx) => (
              <div
                key={`${label}-${idx}`}
                className="group flex h-12 w-[10.5rem] shrink-0 items-center justify-center rounded-2xl border dark:border-white/12 border-gray-200 dark:bg-white/5 bg-gray-50 text-center shadow-[0_22px_84px_rgba(0,0,0,0.65)] transition-all hover:-translate-y-0.5 hover:dark:border-white/20 border-gray-300 hover:bg-white/9"
              >
                <span
                  className={cn(
                    "text-[12px] font-black uppercase tracking-[0.22em]",
                    "transition-all duration-300 [filter:grayscale(1)] group-hover:[filter:grayscale(0)]",
                    isDay
                      ? "text-slate-600 group-hover:text-slate-900"
                      : "dark:text-white group-hover:dark:text-white text-gray-900",
                    needsChip.has(label) ? "rounded-md px-2 py-1" : "",
                    needsChip.has(label)
                      ? "dark:bg-white/10 bg-gray-100 [text-shadow:0_0_0.5px_rgba(0,0,0,0.45)]"
                      : "",
                  )}
                  style={{
                    fontFamily:
                      'var(--font-display), "General Sans", "Satoshi", "Inter", system-ui, -apple-system, Segoe UI, Roboto, Arial',
                    color:
                      idx < logos.length
                        ? (brandColor[label] ?? "currentColor")
                        : undefined,
                  }}
                >
                  {label}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </NeonSection>
  );
}
