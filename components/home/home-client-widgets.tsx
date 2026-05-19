"use client";

import dynamic from "next/dynamic";
import type { Testimonial } from "@/data/testimonials";
import type { CommunityPostListItem } from "@/lib/community/types";

export const HomeScrollAnimate = dynamic(() => import("@/components/scroll-animate"));

export const HomeFloatingCta = dynamic(
  () => import("@/components/floating-cta").then((m) => ({ default: m.FloatingCta })),
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

export function HomeCommunitySectionLazy({
  posts,
  locale,
}: {
  posts: CommunityPostListItem[];
  locale: string;
}) {
  return <HomeCommunitySectionInner posts={posts} locale={locale} />;
}

export function HomeRecentlyViewedLazy({ locale }: { locale: string }) {
  return <HomeRecentlyViewedInner locale={locale} />;
}

export function HomeTestimonialsCarouselLazy({ items }: { items: Testimonial[] }) {
  return <TestimonialsCarouselInner items={items} />;
}
