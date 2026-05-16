import { redirect } from "next/navigation";
import { resolveLocaleParam } from "@/lib/resolve-locale";

/**
 * `/media/compare` 는 `/compare` 의 별칭(alias). PATCH-P2-03 에서
 * 외부 문서/링크가 이 경로를 사용하도록 권장돼 영구 살려둔다.
 *
 * `?ids=` 파라미터를 그대로 전달해 비교 컨텍스트가 유지된다.
 */
export const dynamic = "force-dynamic";

type SearchParams = { ids?: string | string[] };

export default async function MediaCompareAlias({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<SearchParams>;
}) {
  const locale = await resolveLocaleParam(params);
  const sp = await searchParams;
  const raw = sp.ids;
  const idsParam = Array.isArray(raw) ? raw[0] : raw;
  const target = idsParam
    ? `/${locale}/compare?ids=${encodeURIComponent(idsParam)}`
    : `/${locale}/compare`;
  redirect(target);
}
