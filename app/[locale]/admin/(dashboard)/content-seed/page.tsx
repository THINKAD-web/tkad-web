import { resolveLocaleParam } from "@/lib/resolve-locale";
import { AdminContentSeedClient } from "@/components/admin/admin-content-seed-client";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ locale: string }> };

export default async function AdminContentSeedPage({ params }: Props) {
  const locale = await resolveLocaleParam(params);
  return <AdminContentSeedClient locale={locale} />;
}
