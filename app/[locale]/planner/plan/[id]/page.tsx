import { redirect } from "@/i18n/navigation";
import { resolveLocaleParam } from "@/lib/resolve-locale";

type Props = { params: Promise<{ locale: string; id: string }> };

/** `/planner/plan/[id]` → canonical shared plan URL */
export default async function PlannerPlanAliasPage({ params }: Props) {
  const { id } = await params;
  const locale = await resolveLocaleParam(params);
  redirect({ href: `/planner/shared/${id}`, locale });
}
