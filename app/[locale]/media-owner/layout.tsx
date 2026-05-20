import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { setRequestLocale } from "next-intl/server";
import { resolveLocaleParam } from "@/lib/resolve-locale";
import { defaultOgImages, pageAlternates } from "@/lib/seo";
import { MediaOwnerShell } from "@/components/media-owner/media-owner-shell";
import { isMediaOwnerPortalRole } from "@/lib/media-owner-role";
import { getCurrentUser } from "@/lib/user-session";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const locale = await resolveLocaleParam(params);
  const isKo = locale === "ko";
  const title = isKo ? "매체사 포털" : "Media owner portal";
  const description = isKo
    ? "등록 매체 관리, 집행 현황, 정산을 확인하는 매체사 전용 영역입니다."
    : "Manage your media inventory, campaigns, and settlements.";
  return {
    title,
    description,
    alternates: pageAlternates(locale, "/media-owner"),
    robots: { index: false, follow: false },
    openGraph: {
      title: `${title} | THINKAD`,
      description,
      images: defaultOgImages(locale, {
        ko: "THINKAD 매체사 포털",
        en: "THINKAD media owner portal",
      }),
    },
  };
}

type Props = {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
};

export default async function MediaOwnerLayout({ children, params }: Props) {
  const locale = await resolveLocaleParam(params);
  setRequestLocale(locale);

  const user = await getCurrentUser();
  if (!user) {
    redirect(`/${locale}/login?redirect=/media-owner/dashboard`);
  }
  if (!isMediaOwnerPortalRole(user.role)) {
    redirect(`/${locale}/my`);
  }

  return <MediaOwnerShell>{children}</MediaOwnerShell>;
}
