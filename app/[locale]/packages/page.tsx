import type { Metadata } from "next";
import { redirect } from "@/i18n/navigation";
import { resolveLocaleParam } from "@/lib/resolve-locale";

type Props = { params: Promise<{ locale: string }> };

/** `/packages` → `/media/packages` — canonical은 대상 페이지 메타 사용 */
export function generateMetadata(): Metadata {
  return { robots: { index: false, follow: true } };
}

/** `/packages` → `/media/packages` (canonical) */
export default async function PackagesRedirectPage({ params }: Props) {
  const locale = await resolveLocaleParam(params);
  redirect({ href: "/media/packages", locale });
}
