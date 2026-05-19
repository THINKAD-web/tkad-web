import { Suspense } from "react";
import { TeamManagementSection } from "@/components/my/team-management-section";
import { HomeLandingDayNight } from "@/components/home-landing-day-night";

export default function MyTeamPage() {
  return (
    <HomeLandingDayNight>
      <div className="tkad-landing-neon tkad-planner-neon mx-auto max-w-3xl px-4 py-10 sm:px-6 sm:py-14">
        <TeamManagementSection />
      </div>
    </HomeLandingDayNight>
  );
}
