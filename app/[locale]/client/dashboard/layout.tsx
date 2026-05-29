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
  const title = isKo ? "캠페인 대시보드" : "Campaign dashboard";
  const description = isKo
    ? "THINKAD 클라이언트 캠페인 대시보드"
    : "THINKAD client campaign dashboard";
  return {
    title,
    description,
    ...buildShareMetadata({ locale, title, description, path: "/client/dashboard" }),
    robots: { index: false, follow: false },
  };
}

export default function ClientDashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
