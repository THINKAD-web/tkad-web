import { resolveLocaleParam } from "@/lib/resolve-locale";
import { AdminLaunchMonitorClient } from "@/components/admin/admin-launch-monitor-client";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ locale: string }> };

export default async function AdminLaunchMonitorPage({ params }: Props) {
  const locale = await resolveLocaleParam(params);
  return <AdminLaunchMonitorClient locale={locale} />;
}
