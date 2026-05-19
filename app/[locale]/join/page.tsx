import { Suspense } from "react";
import { JoinTeamClient } from "@/components/join-team-client";

export default function JoinTeamPage() {
  return (
    <Suspense fallback={null}>
      <JoinTeamClient />
    </Suspense>
  );
}
