import { Suspense } from "react";
import { NotificationsPageClient } from "@/components/my/notifications-page-client";

export default function MyNotificationsPage() {
  return (
    <Suspense fallback={null}>
      <NotificationsPageClient />
    </Suspense>
  );
}
