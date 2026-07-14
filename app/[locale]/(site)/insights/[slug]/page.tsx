import { redirect } from "next/navigation";
import { resolveLocaleParam } from "@/lib/resolve-locale";

type Props = {
  params: Promise<{ locale: string; slug: string }>;
};

/** Legacy insight URLs → report detail when slug matches published Report. */
export default async function InsightsSlugRedirect({ params }: Props) {
  const { slug } = await params;
  const locale = await resolveLocaleParam(params);
  redirect(`/${locale}/report/${encodeURIComponent(slug)}`);
}
