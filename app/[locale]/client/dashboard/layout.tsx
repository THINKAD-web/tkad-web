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
    title: isKo ? "캠페인 대시보드" : "Campaign dashboard",
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
