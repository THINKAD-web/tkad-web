import { resolveLocaleParam } from "@/lib/resolve-locale";
import { AdminMonitoringClient } from "@/components/admin/admin-monitoring-client";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ locale: string }> };

export default async function AdminMonitoringPage({ params }: Props) {
  const locale = await resolveLocaleParam(params);
  return <AdminMonitoringClient locale={locale} />;
}
