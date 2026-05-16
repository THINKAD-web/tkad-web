import { redirect } from "next/navigation";
import { resolveLocaleParam } from "@/lib/resolve-locale";

type Props = {
  params: Promise<{ locale: string }>;
};

/** Legacy path — public nav uses `/report` for trend reports. */
export default async function InsightsIndexRedirect({ params }: Props) {
  const locale = await resolveLocaleParam(params);
  redirect(`/${locale}/report`);
}
