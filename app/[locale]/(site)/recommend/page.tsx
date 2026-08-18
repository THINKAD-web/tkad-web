import { redirect } from "@/i18n/navigation";

/** Legacy `/recommend` — next.config 301 + runtime redirect to `/planner`. */
export default async function RecommendPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  redirect({ href: "/planner", locale });
}
