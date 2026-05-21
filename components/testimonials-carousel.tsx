"use client";

import { useCallback, useEffect, useState } from "react";
import useEmblaCarousel from "embla-carousel-react";
import Autoplay from "embla-carousel-autoplay";
import { ChevronLeft, ChevronRight, Quote, Star } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { useLocale } from "next-intl";
import { type Testimonial } from "@/data/testimonials";
import { cn } from "@/lib/utils";

type Props = {
  items: Testimonial[];
};

const cardClass =
  "group relative flex min-w-0 shrink-0 grow-0 basis-[88%] flex-col overflow-hidden rounded-[28px] border border-border/60 bg-card/90 p-7 shadow-[0_14px_44px_rgba(0,0,0,0.06)] backdrop-blur-md transition-all duration-300 hover:-translate-y-1 tkad-neon-border dark:border-white/12 border-gray-200 dark:bg-white/6 bg-gray-50 dark:shadow-[0_18px_72px_rgba(0,0,0,0.45)] sm:p-8 md:basis-[48%] lg:basis-[32%]";

/**
 * Embla 기반 캐러셀 — 5초 간격 자동 재생, hover 정지, 모바일은 스와이프·데스크톱은 화살표.
 */
export function TestimonialsCarousel({ items }: Props) {
  const locale = useLocale();
  const isKo = locale === "ko";
  const [emblaRef, emblaApi] = useEmblaCarousel(
    {
      loop: true,
      align: "start",
      skipSnaps: false,
      slidesToScroll: 1,
    },
    [Autoplay({ delay: 5_000, stopOnInteraction: false, stopOnMouseEnter: true })],
  );

  const [canPrev, setCanPrev] = useState(false);
  const [canNext, setCanNext] = useState(false);
  const [selected, setSelected] = useState(0);

  const scrollPrev = useCallback(() => emblaApi?.scrollPrev(), [emblaApi]);
  const scrollNext = useCallback(() => emblaApi?.scrollNext(), [emblaApi]);
  const scrollTo = useCallback(
    (i: number) => emblaApi?.scrollTo(i),
    [emblaApi],
  );

  useEffect(() => {
    if (!emblaApi) return;
    const onSelect = () => {
      setCanPrev(emblaApi.canScrollPrev());
      setCanNext(emblaApi.canScrollNext());
      setSelected(emblaApi.selectedScrollSnap());
    };
    emblaApi.on("select", onSelect);
    emblaApi.on("reInit", onSelect);
    onSelect();
  }, [emblaApi]);

  return (
    <div className="tkad-testimonials-carousel relative">
      <div className="overflow-hidden" ref={emblaRef}>
        <div className="flex gap-5 sm:gap-6">
          {items.map((t) => (
            <article key={t.id} className={cardClass}>
              <Quote
                aria-hidden
                className="absolute right-5 top-5 h-10 w-10 text-foreground/10 transition-colors group-hover:text-foreground/16 dark:text-white text-gray-300 dark:group-hover:dark:text-white"
                strokeWidth={1.5}
                fill="currentColor"
              />

              <header className="mb-4 flex items-start gap-3">
                {t.avatarUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={t.avatarUrl}
                    alt=""
                    className="h-14 w-14 shrink-0 rounded-2xl border border-border/60 object-cover"
                  />
                ) : (
                  <span
                    aria-hidden
                    className="inline-flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border border-border/60 bg-muted text-base font-extrabold text-foreground dark:bg-hero-void dark:text-hero-fg"
                  >
                    {t.initials}
                  </span>
                )}
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-bold tracking-tight text-foreground">
                    {isKo ? t.nameKo : t.nameEn}
                  </div>
                  <div className="font-mono text-[10px] font-bold uppercase tracking-[0.18em] text-muted-foreground">
                    {isKo ? t.roleKo : t.roleEn}
                  </div>
                  <div className="mt-1 flex items-center gap-1.5 font-mono text-[11px] tracking-tight text-muted-foreground">
                    {t.logoUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={t.logoUrl} alt="" className="h-4 w-auto" />
                    ) : null}
                    <span className="truncate">
                      {isKo ? t.companyKo : t.companyEn}
                    </span>
                    <span className="text-border">·</span>
                    <span className="truncate">
                      {isKo ? t.industryKo : t.industryEn}
                    </span>
                  </div>
                </div>
              </header>

              <div
                className="mb-6 inline-flex w-fit items-center gap-2 rounded-2xl border border-border/60 bg-muted/50 px-3 py-1.5 shadow-sm dark:border-white/14 border-gray-200 dark:bg-white/6 bg-gray-50 dark:shadow-[0_18px_72px_rgba(0,0,0,0.65)]"
                aria-label={isKo ? "성과 수치" : "Key outcome"}
              >
                <span className="font-mono text-[10px] font-bold uppercase tracking-[0.22em] text-muted-foreground">
                  {isKo ? "RESULT" : "RESULT"}
                </span>
                <span className="tkad-home-accent-text text-sm font-extrabold tracking-tight">
                  {isKo ? t.metricKo : t.metricEn}
                </span>
              </div>

              <p className="flex-1 text-[15px] leading-relaxed text-foreground/85">
                &ldquo;{isKo ? t.bodyKo : t.bodyEn}&rdquo;
              </p>

              <footer className="mt-5 flex items-center justify-between gap-3 border-t border-border/60 pt-4 dark:border-white/10 border-gray-200">
                <div className="flex items-center gap-0.5" aria-label={`별점 ${t.rating}`}>
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Star
                      key={i}
                      className={cn(
                        "h-3.5 w-3.5",
                        i < t.rating
                          ? "fill-primary text-primary"
                          : "text-muted-foreground/35",
                      )}
                      strokeWidth={1.5}
                    />
                  ))}
                </div>
                {t.caseHref && (
                  <Link
                    href={t.caseHref}
                    className="font-mono text-[11px] font-black uppercase tracking-[0.18em] text-primary hover:text-primary/80"
                  >
                    {isKo ? "사례 →" : "Case →"}
                  </Link>
                )}
              </footer>
            </article>
          ))}
        </div>
      </div>

      <div className="pointer-events-none absolute inset-y-0 left-0 right-0 hidden items-center justify-between md:flex">
        <button
          type="button"
          onClick={scrollPrev}
          disabled={!canPrev}
          aria-label="이전 후기"
          className="pointer-events-auto -translate-x-4 inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-border/60 bg-card/95 text-foreground shadow-sm backdrop-blur transition-all hover:-translate-y-0.5 hover:border-border hover:bg-card disabled:opacity-40 dark:border-white/12 border-gray-200 dark:bg-white/6 bg-gray-50 dark:text-white text-gray-900 dark:hover:border-white/22 dark:hover:dark:bg-white/10 bg-gray-100"
        >
          <ChevronLeft className="h-5 w-5" />
        </button>
        <button
          type="button"
          onClick={scrollNext}
          disabled={!canNext}
          aria-label="다음 후기"
          className="pointer-events-auto translate-x-4 inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-border/60 bg-card/95 text-foreground shadow-sm backdrop-blur transition-all hover:-translate-y-0.5 hover:border-border hover:bg-card disabled:opacity-40 dark:border-white/12 border-gray-200 dark:bg-white/6 bg-gray-50 dark:text-white text-gray-900 dark:hover:border-white/22 dark:hover:dark:bg-white/10 bg-gray-100"
        >
          <ChevronRight className="h-5 w-5" />
        </button>
      </div>

      <div className="mt-6 flex justify-center gap-1">
        {items.map((_, i) => (
          <button
            key={i}
            type="button"
            onClick={() => scrollTo(i)}
            aria-label={`${i + 1}번 후기로 이동`}
            aria-current={selected === i}
            className={cn(
              "h-2 transition-all",
              selected === i
                ? "w-8 bg-[linear-gradient(90deg,#a855f7_0%,#22d3ee_55%,#ec4899_100%)]"
                : "w-2 bg-muted-foreground/25 hover:bg-muted-foreground/40 dark:bg-white/12 dark:hover:bg-white/22",
            )}
          />
        ))}
      </div>
    </div>
  );
}
