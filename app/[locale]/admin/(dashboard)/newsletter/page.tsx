import { resolveLocaleParam } from "@/lib/resolve-locale";
import { setRequestLocale } from "next-intl/server";
import { AdminNewsletterClient } from "./admin-newsletter-client";

export const dynamic = "force-dynamic";

export default async function AdminNewsletterPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const locale = await resolveLocaleParam(params);
  setRequestLocale(locale);
  return <AdminNewsletterClient />;
}
