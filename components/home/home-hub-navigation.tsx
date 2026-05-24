"use client";

import { HomeHubGridSection } from "@/components/home/home-hub-grid-section";
import {
  HOME_HUB_EXTRA_SECTION,
  HOME_HUB_SECTIONS,
} from "@/lib/navigation/home-hub-grid-config";

type Props = { locale: string };

export function HomeHubNavigationSection({ locale }: Props) {
  return (
    <section
      className="mx-auto w-full max-w-6xl space-y-8 px-4 pb-6 sm:px-6 sm:pb-8"
      data-screenshot="home-hub-grid"
    >
      {HOME_HUB_SECTIONS.map((section) => (
        <HomeHubGridSection key={section.id} section={section} locale={locale} />
      ))}
      <HomeHubGridSection section={HOME_HUB_EXTRA_SECTION} locale={locale} />
    </section>
  );
}
