import { redirect } from "@/i18n/navigation";
import { resolveLocaleParam } from "@/lib/resolve-locale";

type Props = { params: Promise<{ locale: string }> };

/** `/packages` → `/media/packages` (canonical) */
export default async function PackagesRedirectPage({ params }: Props) {
  const locale = await resolveLocaleParam(params);
  redirect({ href: "/media/packages", locale });
}
