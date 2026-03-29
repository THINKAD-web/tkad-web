import { Suspense } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { resolveLocaleParam } from "@/lib/resolve-locale";
import { setRequestLocale } from "next-intl/server";
import Link from "next/link";
import {
  ADMIN_SESSION_COOKIE,
  verifyAdminSessionToken,
} from "@/lib/admin-session";
import { AdminLoginForm } from "./admin-login-form";

type Props = {
  params: Promise<{ locale: string }>;
};

export default async function AdminLoginPage({ params }: Props) {
  const locale = await resolveLocaleParam(params);
  setRequestLocale(locale);

  const cookieStore = await cookies();
  if (verifyAdminSessionToken(cookieStore.get(ADMIN_SESSION_COOKIE)?.value)) {
    redirect(`/${locale}/admin`);
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-slate-100 px-4 py-12">
      <div className="mb-8 text-center">
        <span className="text-2xl font-extrabold tracking-tight text-navy">
          THINK<span className="text-gold">AD</span>
        </span>
        <span className="ml-2 rounded bg-navy/10 px-1.5 py-0.5 text-[10px] font-semibold text-navy">
          ADMIN
        </span>
      </div>
      <Suspense fallback={null}>
        <AdminLoginForm locale={locale} />
      </Suspense>
      <Link
        href={`/${locale}`}
        className="mt-8 text-sm text-slate-500 underline-offset-4 hover:text-navy hover:underline"
      >
        {locale === "ko" ? "사이트로 돌아가기" : "Back to site"}
      </Link>
    </div>
  );
}
