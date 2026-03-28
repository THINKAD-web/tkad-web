import type { Metadata } from "next";
import { resolveLocaleParam } from "@/lib/resolve-locale";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const locale = await resolveLocaleParam(params);
  const isKo = locale === "ko";
  return {
    title: isKo ? "캠페인 모니터링" : "Campaign monitoring",
    robots: { index: false, follow: false },
  };
}

export default function ClientMonitoringLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
