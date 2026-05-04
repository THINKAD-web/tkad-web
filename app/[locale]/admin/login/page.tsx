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
    <div className="admin-dashboard-root flex min-h-screen flex-col items-center justify-center bg-background px-4 py-12 text-foreground">
      <div className="mb-8 text-center">
        <span className="text-2xl font-extrabold tracking-tight">
          THINK<span className="text-primary">AD</span>
        </span>
        <span className="ml-2 border-2 border-border bg-primary px-1.5 py-0.5 font-mono text-[10px] font-bold uppercase tracking-[0.18em] text-primary-foreground">
          ADMIN
        </span>
      </div>
      <Suspense fallback={null}>
        <AdminLoginForm locale={locale} />
      </Suspense>
      <Link
        href={`/${locale}`}
        className="mt-8 border-b-2 border-border pb-1 font-mono text-[11px] font-bold uppercase tracking-[0.18em] text-foreground transition-colors hover:text-primary hover:border-primary dark:hover:border-primary dark:hover:text-primary"
      >
        {locale === "ko" ? "사이트로 돌아가기" : "Back to site"}
      </Link>
    </div>
  );
}
