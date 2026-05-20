"use client";

import dynamic from "next/dynamic";
import { LazyWhenVisible } from "@/components/lazy-when-visible";
import type { Testimonial } from "@/data/testimonials";
import type { CommunityPostListItem } from "@/lib/community/types";

export const HomeScrollAnimate = dynamic(() => import("@/components/scroll-animate"));

export const HomeFloatingCta = dynamic(
  () => import("@/components/floating-cta").then((m) => ({ default: m.FloatingCta })),
  { ssr: false },
);

export const HomePwaWidget = dynamic(
  () =>
    import("@/components/pwa-home-widget").then((m) => ({
      default: m.PwaHomeWidget,
    })),
  { ssr: false },
);

export const HomeClientLogosLazy = dynamic(
  () => import("@/components/home-client-logos").then((m) => ({ default: m.HomeClientLogos })),
  { ssr: false },
);

const HomeCommunitySectionInner = dynamic(
  () =>
    import("@/components/home-community-section").then((m) => ({
      default: m.HomeCommunitySection,
    })),
  { ssr: false },
);

const HomeRecentlyViewedInner = dynamic(() => import("@/components/home-recently-viewed"), {
  ssr: false,
});

const TestimonialsCarouselInner = dynamic(
  () =>
    import("@/components/testimonials-carousel").then((m) => ({
      default: m.TestimonialsCarousel,
    })),
  { ssr: false },
);

export function HomeClientLogosWhenVisible() {
  return (
    <LazyWhenVisible minHeight={140}>
      <HomeClientLogosLazy />
    </LazyWhenVisible>
  );
}

export function HomeCommunitySectionLazy({
  posts,
  locale,
}: {
  posts: CommunityPostListItem[];
  locale: string;
}) {
  return (
    <LazyWhenVisible minHeight={200}>
      <HomeCommunitySectionInner posts={posts} locale={locale} />
    </LazyWhenVisible>
  );
}

export function HomeRecentlyViewedLazy({ locale }: { locale: string }) {
  return (
    <LazyWhenVisible minHeight={160}>
      <HomeRecentlyViewedInner locale={locale} />
    </LazyWhenVisible>
  );
}

export function HomeTestimonialsCarouselLazy({ items }: { items: Testimonial[] }) {
  return (
    <LazyWhenVisible minHeight={280}>
      <TestimonialsCarouselInner items={items} />
    </LazyWhenVisible>
  );
}
