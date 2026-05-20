import { redirect } from "next/navigation";
import { resolveLocaleParam } from "@/lib/resolve-locale";

type Props = { params: Promise<{ locale: string }> };

/** 별칭: `/admin/media/new` → `/admin/medias/new` */
export default async function AdminMediaNewAliasPage({ params }: Props) {
  const locale = await resolveLocaleParam(params);
  redirect(`/${locale}/admin/medias/new`);
}
