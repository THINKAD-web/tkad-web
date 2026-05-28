import { Suspense } from "react";
import { MyBookingRequestsClient } from "@/components/my/my-booking-requests-client";

export default function MyBookingRequestsPage() {
  return (
    <Suspense fallback={null}>
      <MyBookingRequestsClient />
    </Suspense>
  );
}
