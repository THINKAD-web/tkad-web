import { AdminBrokenLinksClient } from "@/components/admin/admin-broken-links-client";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ locale: string }> };

export default async function AdminHealthLinksPage({ params }: Props) {
  const { locale } = await params;
  return <AdminBrokenLinksClient locale={locale} />;
}
