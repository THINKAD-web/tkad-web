import { redirect } from "next/navigation";
import { resolveLocaleParam } from "@/lib/resolve-locale";

/** Alias → canonical `/register/media` */
export default async function MediaSubmitAliasPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const locale = await resolveLocaleParam(params);
  redirect(`/${locale}/register/media`);
}
