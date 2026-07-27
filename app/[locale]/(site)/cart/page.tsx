import { resolveLocaleParam } from "@/lib/resolve-locale";
import { redirect } from "@/i18n/navigation";

/** Legacy quote cart — redirect to plan cart page. */
export default async function CartPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const locale = await resolveLocaleParam(params);
  redirect({ href: "/my/plan", locale });
}
