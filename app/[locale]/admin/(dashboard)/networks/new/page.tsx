import { setRequestLocale } from "next-intl/server";
import { resolveLocaleParam } from "@/lib/resolve-locale";
import AdminNetworkEditor from "../admin-network-editor";

type Props = { params: Promise<{ locale: string }> };

export default async function AdminNetworkNewPage({ params }: Props) {
  const { locale } = await params;
  const resolved = await resolveLocaleParam(Promise.resolve({ locale }));
  setRequestLocale(resolved);
  return <AdminNetworkEditor mode="create" />;
}
