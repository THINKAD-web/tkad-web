import { resolveLocaleParam } from "@/lib/resolve-locale";
import { redirect } from "@/i18n/navigation";

export default async function ToolsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const locale = await resolveLocaleParam(params);
  redirect({ href: "/planner", locale });
}
