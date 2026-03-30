import { setRequestLocale } from "next-intl/server";
import { resolveLocaleParam } from "@/lib/resolve-locale";
import AdminNetworkQuickAddClient from "./admin-network-quick-add-client";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ locale: string }> };

export default async function AdminNetworkQuickAddPage({ params }: Props) {
  const { locale } = await params;
  const resolved = await resolveLocaleParam(Promise.resolve({ locale }));
  setRequestLocale(resolved);
  return <AdminNetworkQuickAddClient />;
}
