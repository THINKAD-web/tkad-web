import { notFound } from "next/navigation";
import { setRequestLocale } from "next-intl/server";
import { DsPreviewClient } from "@/components/ds/ds-preview-client";
import { getCurrentUser } from "@/lib/user-session";
import { resolveLocaleParam } from "@/lib/resolve-locale";

type Props = { params: Promise<{ locale: string }> };

/** W0 — 디자인 시스템 프리뷰 (로그인 + preview/development only) */
export default async function DevDsPreviewPage({ params }: Props) {
  const locale = await resolveLocaleParam(params);
  setRequestLocale(locale);

  const allowed =
    process.env.NODE_ENV === "development" ||
    process.env.VERCEL_ENV === "preview";
  if (!allowed) notFound();

  const user = await getCurrentUser();
  if (!user) notFound();

  return <DsPreviewClient isKo={locale === "ko"} />;
}
