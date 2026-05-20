import { redirect } from "next/navigation";
import { resolveLocaleParam } from "@/lib/resolve-locale";

type Props = { params: Promise<{ locale: string }> };

/** `/admin/medias/new` — 목록에서 추가 모달 자동 오픈 */
export default async function AdminMediasNewPage({ params }: Props) {
  const locale = await resolveLocaleParam(params);
  redirect(`/${locale}/admin/medias?action=new`);
}
