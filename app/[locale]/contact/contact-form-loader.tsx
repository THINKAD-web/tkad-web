"use client";

import dynamic from "next/dynamic";

export const ContactFormLoader = dynamic(
  () =>
    import("./contact-form-client").then((m) => ({
      default: m.ContactFormClient,
    })),
  { ssr: false },
);
