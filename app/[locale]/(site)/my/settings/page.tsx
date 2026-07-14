import { Suspense } from "react";
import { MySettingsPageClient } from "@/components/my/my-settings-page-client";

export default function MySettingsPage() {
  return (
    <Suspense fallback={null}>
      <MySettingsPageClient />
    </Suspense>
  );
}
