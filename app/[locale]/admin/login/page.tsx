import { Suspense } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { resolveLocaleParam } from "@/lib/resolve-locale";
import { setRequestLocale } from "next-intl/server";
import Link from "next/link";
import { HomeLandingDayNight } from "@/components/home-landing-day-night";
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
    <HomeLandingDayNight>
      <div className="admin-dashboard-root tkad-landing-neon tkad-planner-neon flex min-h-[calc(100vh-72px)] flex-col items-center justify-center bg-transparent px-4 py-12 text-foreground">
        <div className="relative w-full max-w-md overflow-hidden rounded-[28px] border border-border/70 bg-card/80 p-6 shadow-[0_28px_120px_rgba(0,0,0,0.18)] backdrop-blur">
          <div aria-hidden className="pointer-events-none absolute inset-0 opacity-[0.10] tkad-neon-grid" />
          <div
            aria-hidden
            className="pointer-events-none absolute -inset-20 bg-[radial-gradient(circle_at_20%_10%,rgba(34,211,238,0.18),transparent_55%),radial-gradient(circle_at_80%_70%,rgba(168,85,247,0.14),transparent_60%),radial-gradient(circle_at_40%_90%,rgba(236,72,153,0.10),transparent_65%)]"
          />

          <div className="relative mb-6 text-center">
            <span className="text-2xl font-black tracking-tight">
              THINK<span className="tkad-home-accent-text">AD</span>
            </span>
            <span className="ml-2 inline-flex items-center rounded-2xl border border-border/70 bg-card/80 px-2 py-1 font-mono text-[10px] font-black uppercase tracking-[0.22em] text-muted-foreground shadow-sm backdrop-blur">
              ADMIN
            </span>
            <p className="mt-3 font-mono text-[11px] font-bold uppercase tracking-[0.22em] text-muted-foreground">
              {locale === "ko" ? "관리자 로그인" : "Admin login"}
            </p>
          </div>

          <Suspense fallback={null}>
            <AdminLoginForm locale={locale} />
          </Suspense>

          <div className="relative mt-6 text-center">
            <Link
              href={`/${locale}`}
              className="border-b border-border/70 pb-1 font-mono text-[11px] font-black uppercase tracking-[0.18em] text-foreground/80 transition-colors hover:text-foreground hover:border-border"
            >
              {locale === "ko" ? "사이트로 돌아가기" : "Back to site"}
            </Link>
          </div>
        </div>
      </div>
    </HomeLandingDayNight>
  );
}
