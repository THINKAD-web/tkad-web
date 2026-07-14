import { Suspense } from "react";
import { TeamManagementSection } from "@/components/my/team-management-section";

export default function MyTeamPage() {
  return (
    <Suspense fallback={null}>
      <TeamManagementSection />
    </Suspense>
  );
}
