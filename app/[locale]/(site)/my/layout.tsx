import { Suspense } from "react";
import { MyHubShell } from "@/components/my/my-hub-shell";

export default function MyLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <Suspense fallback={null}>
      <MyHubShell>{children}</MyHubShell>
    </Suspense>
  );
}
