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
    <div className="admin-dashboard-root flex min-h-screen flex-col items-center justify-center bg-bx-off px-4 py-12 text-bx-black dark:bg-bx-black dark:text-bx-white">
      <div className="mb-8 text-center">
        <span className="text-2xl font-extrabold tracking-tight">
          THINK<span className="text-bx-accent">AD</span>
        </span>
        <span className="ml-2 border-2 border-bx-black bg-bx-accent px-1.5 py-0.5 font-mono text-[10px] font-bold uppercase tracking-[0.18em] text-bx-white dark:border-bx-white">
          ADMIN
        </span>
      </div>
      <Suspense fallback={null}>
        <AdminLoginForm locale={locale} />
      </Suspense>
      <Link
        href={`/${locale}`}
        className="mt-8 border-b-2 border-bx-black pb-1 font-mono text-[11px] font-bold uppercase tracking-[0.18em] text-bx-black transition-colors hover:text-bx-accent hover:border-bx-accent dark:border-bx-white dark:text-bx-white dark:hover:border-bx-accent dark:hover:text-bx-accent"
      >
        {locale === "ko" ? "사이트로 돌아가기" : "Back to site"}
      </Link>
    </div>
  );
}
