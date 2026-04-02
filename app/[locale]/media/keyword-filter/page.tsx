import { redirect } from "@/i18n/navigation";
import { resolveLocaleParam } from "@/lib/resolve-locale";

type Props = {
  params: Promise<{ locale: string }>;
};

/**
 * 키워드 검색은 `/media`에 통합되었습니다. 기존 URL·북마크 호환을 위해 유지합니다.
 */
export default async function MediaKeywordFilterRedirectPage({ params }: Props) {
  const locale = await resolveLocaleParam(params);
  redirect({ href: "/media", locale });
}
