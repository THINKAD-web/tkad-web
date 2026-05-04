"use client";

import { useCallback, useEffect, useState } from "react";
import useEmblaCarousel from "embla-carousel-react";
import Autoplay from "embla-carousel-autoplay";
import { ChevronLeft, ChevronRight, Quote, Star } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { type Testimonial } from "@/data/testimonials";

type Props = {
  items: Testimonial[];
  isKo: boolean;
};

/**
 * Embla 기반 캐러셀 — 5초 간격 자동 재생, hover 정지, 모바일은 스와이프·데스크톱은 화살표.
 */
export function TestimonialsCarousel({ items, isKo }: Props) {
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
    <div className="relative">
      <div className="overflow-hidden" ref={emblaRef}>
        <div className="flex gap-5 sm:gap-6">
          {items.map((t) => (
            <article
              key={t.id}
              className="relative flex min-w-0 shrink-0 grow-0 basis-[88%] flex-col overflow-hidden border-2 border-border bg-card p-5 sm:p-6 md:basis-[48%] lg:basis-[32%]"
            >
              <Quote
                aria-hidden
                className="absolute right-5 top-5 h-8 w-8 text-accent/20"
                strokeWidth={1.5}
                fill="currentColor"
              />

              <header className="mb-4 flex items-start gap-3">
                {t.avatarUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={t.avatarUrl}
                    alt=""
                    className="h-12 w-12 shrink-0 border-2 border-border object-cover"
                  />
                ) : (
                  <span
                    aria-hidden
                    className="inline-flex h-12 w-12 shrink-0 items-center justify-center border-2 border-border bg-hero-void text-sm font-extrabold text-hero-fg"
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
                    <span className="text-foreground/30">·</span>
                    <span className="truncate">
                      {isKo ? t.industryKo : t.industryEn}
                    </span>
                  </div>
                </div>
              </header>

              <div
                className="mb-4 inline-flex w-fit items-center gap-2 border-2 border-accent bg-accent px-3 py-1.5 text-accent-foreground"
                aria-label={isKo ? "성과 수치" : "Key outcome"}
              >
                <span className="font-mono text-[10px] font-bold uppercase tracking-[0.22em]">
                  {isKo ? "RESULT" : "RESULT"}
                </span>
                <span className="text-sm font-extrabold tracking-tight">
                  {isKo ? t.metricKo : t.metricEn}
                </span>
              </div>

              <p className="flex-1 text-sm leading-relaxed text-foreground">
                &ldquo;{isKo ? t.bodyKo : t.bodyEn}&rdquo;
              </p>

              <footer className="mt-4 flex items-center justify-between gap-3 border-t-2 border-border/10 pt-3">
                <div className="flex items-center gap-0.5" aria-label={`별점 ${t.rating}`}>
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Star
                      key={i}
                      className={`h-3.5 w-3.5 ${
                        i < t.rating ? "fill-accent text-accent" : "text-foreground/15"
                      }`}
                      strokeWidth={1.5}
                    />
                  ))}
                </div>
                {t.caseHref && (
                  <Link
                    href={t.caseHref}
                    className="font-mono text-[11px] font-bold uppercase tracking-[0.18em] text-accent hover:text-foreground"
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
          className="pointer-events-auto -translate-x-4 inline-flex h-11 w-11 items-center justify-center border-2 border-border bg-card text-foreground transition-colors hover:bg-foreground hover:text-background disabled:opacity-40"
        >
          <ChevronLeft className="h-5 w-5" />
        </button>
        <button
          type="button"
          onClick={scrollNext}
          disabled={!canNext}
          aria-label="다음 후기"
          className="pointer-events-auto translate-x-4 inline-flex h-11 w-11 items-center justify-center border-2 border-border bg-card text-foreground transition-colors hover:bg-foreground hover:text-background disabled:opacity-40"
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
            className={`h-2 transition-all ${
              selected === i
                ? "w-8 bg-accent"
                : "w-2 bg-hero-void/20 hover:bg-hero-void/40"
            }`}
          />
        ))}
      </div>
    </div>
  );
}
