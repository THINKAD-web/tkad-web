import { Suspense } from "react";
import { TeamManagementSection } from "@/components/my/team-management-section";
import { HomeLandingDayNight } from "@/components/home-landing-day-night";

export default function MyTeamPage() {
  return (
    <HomeLandingDayNight portal>
      <div className="tkad-landing-neon tkad-planner-neon tkad-portal-shell mx-auto max-w-3xl min-h-[calc(100dvh-4rem)] px-4 py-10 sm:px-6 sm:py-14">
        <TeamManagementSection />
      </div>
    </HomeLandingDayNight>
  );
}
