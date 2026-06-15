"use client";

import { HomeLandingDayNight } from "@/components/home-landing-day-night";
import { SubTabsBar } from "@/components/layout/sub-tabs-bar";
import { NetworkCTA } from "@/components/media-network/network-cta";
import { NetworkFAQ } from "@/components/media-network/network-faq";
import { NetworkGallery } from "@/components/media-network/network-gallery";
import { NetworkHero } from "@/components/media-network/network-hero";
import { NetworkMap } from "@/components/media-network/network-map";
import { NetworkPackages } from "@/components/media-network/network-packages";
import { NetworkRecommendations } from "@/components/media-network/network-recommendations";
import { PriceCalculator } from "@/components/media-network/price-calculator";
import { RegionalStats } from "@/components/media-network/regional-stats";
import type { NetworkMediaStats } from "@/lib/network-media-stats";

type Props = {
  isKo: boolean;
  stats: NetworkMediaStats;
};

export function NetworkLandingClient({ isKo, stats }: Props) {
  return (
    <HomeLandingDayNight>
      <div className="tkad-landing-neon tkad-planner-neon tkad-media-page min-h-screen">
        <SubTabsBar group="discovery" currentPath="/media/network" />
        <NetworkHero isKo={isKo} stats={stats} />
        <PriceCalculator
          isKo={isKo}
          regions={stats.regions}
          nationalAvgPriceManWon={stats.nationalAvgPriceManWon}
        />
        <NetworkMap isKo={isKo} mapPoints={stats.mapPoints} />
        <RegionalStats isKo={isKo} regions={stats.regions} />
        <NetworkGallery isKo={isKo} galleryImages={stats.galleryImages} />
        <NetworkRecommendations
          isKo={isKo}
          networks={stats.featuredNetworks}
        />
        <NetworkPackages isKo={isKo} />
        <NetworkFAQ isKo={isKo} />
        <NetworkCTA isKo={isKo} />
      </div>
    </HomeLandingDayNight>
  );
}
