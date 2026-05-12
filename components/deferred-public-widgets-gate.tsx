"use client";

import dynamic from "next/dynamic";

const DeferredPublicWidgets = dynamic(
  () => import("@/components/deferred-public-widgets"),
  { ssr: false, loading: () => null },
);

export default function DeferredPublicWidgetsGate() {
  return <DeferredPublicWidgets />;
}
