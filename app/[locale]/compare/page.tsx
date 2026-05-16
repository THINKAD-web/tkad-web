import { redirect } from "@/i18n/navigation";
import { resolveLocaleParam } from "@/lib/resolve-locale";

type Props = {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ ids?: string | string[] }>;
};

/** 레거시 `/compare` → `/media/compare` (ids 쿼리 유지) */
export default async function CompareLegacyRedirectPage({
  params,
  searchParams,
}: Props) {
  const locale = await resolveLocaleParam(params);
  const sp = await searchParams;
  const raw = sp.ids;
  const idsParam = Array.isArray(raw) ? raw[0] : raw ?? "";
  const q = idsParam.trim() ? `?ids=${encodeURIComponent(idsParam)}` : "";
  redirect({ href: `/media/compare${q}`, locale });
}
