import type { Metadata } from "next";
import { resolveLocaleParam } from "@/lib/resolve-locale";
import { buildShareMetadata } from "@/lib/seo";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const locale = await resolveLocaleParam(params);
  const isKo = locale === "ko";
  const title = isKo ? "캠페인 모니터링" : "Campaign monitoring";
  const description = isKo
    ? "THINKAD 클라이언트 캠페인 모니터링"
    : "THINKAD client campaign monitoring";
  return {
    title,
    description,
    ...buildShareMetadata({ locale, title, description, path: "/client/monitoring" }),
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
