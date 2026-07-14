import { redirect } from "@/i18n/navigation";
import { resolveLocaleParam } from "@/lib/resolve-locale";

type Props = {
  params: Promise<{ locale: string }>;
};

/** `/signup` → `/register` (회원가입 페이지 단일 진입) */
export default async function SignupRedirectPage({ params }: Props) {
  const locale = await resolveLocaleParam(params);
  redirect({ href: "/register", locale });
}
