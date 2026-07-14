"use client";

import dynamic from "next/dynamic";

function ContactFormSkeleton() {
  return (
    <div className="h-96 animate-pulse rounded-2xl bg-gray-100 dark:bg-white/5" />
  );
}

export const ContactFormLoader = dynamic(
  () =>
    import("./contact-form-panel").then((m) => ({
      default: m.ContactFormPanel,
    })),
  {
    ssr: false,
    loading: () => <ContactFormSkeleton />,
  },
);
