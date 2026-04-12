import { Suspense } from "react";
import ContactPage from "./contact-client";

export default function ContactPageWrapper() {
  return (
    <Suspense>
      <ContactPage />
    </Suspense>
  );
}
