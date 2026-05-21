"use client";

import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { Link, useRouter } from "@/i18n/navigation";
import { BtnBlock } from "@/components/brutalist";
import { Spinner } from "@/components/ui/spinner";
import { HomeLandingDayNight } from "@/components/home-landing-day-night";
import { cn } from "@/lib/utils";
import type { NaverSignupRole } from "@/lib/naver-oauth-pending";

const ROLE_OPTIONS: {
  value: NaverSignupRole;
  titleKo: string;
  descKo: string;
}[] = [
  {
    value: "ADVERTISER",
    titleKo: "광고주로 시작하기",
    descKo: "캠페인·매체 탐색·플래너",
  },
  {
    value: "MEDIA_OWNER",
    titleKo: "매체사로 시작하기",
    descKo: "매체 등록·부킹·송출 관리",
  },
];

function NaverRegisterForm() {
  const t = useTranslations("auth");
  const router = useRouter();
  const search = useSearchParams();
  const redirect = search.get("redirect") || "/my";

  const [role, setRole] = useState<NaverSignupRole>("ADVERTISER");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleComplete() {
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/auth/naver/complete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        const code = data?.error?.code;
        setError(
          code === "NAVER_PENDING_EXPIRED"
            ? "네이버 인증이 만료되었습니다. 로그인 페이지에서 다시 시도해주세요."
            : code === "EMAIL_IN_USE"
              ? "이미 가입된 계정입니다. 이메일 로그인을 이용해주세요."
              : data?.error?.message ?? "가입 완료에 실패했습니다.",
        );
        return;
      }
      const dest = data.data?.redirect || redirect;
      router.push(dest === "/my" ? "/onboarding" : dest);
      router.refresh();
    } catch {
      setError("네트워크 오류가 발생했습니다.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <HomeLandingDayNight>
      <div className="tkad-landing-neon tkad-planner-neon tkad-auth-page min-h-[calc(100vh-72px)] px-4 py-10">
        <AuthCardShell>
          <div className="mb-6 text-center">
            <p className="font-mono text-[10px] font-bold uppercase tracking-[0.22em] dark:text-white text-gray-600">
              [ NAVER SIGNUP ]
            </p>
            <h1 className="mt-2 text-2xl font-black tracking-tight dark:text-white text-gray-900">
              네이버 계정 가입
            </h1>
            <p className="mt-2 font-mono text-[12px] tracking-tight dark:text-white text-gray-500">
              {`// `}역할을 선택하면 가입이 완료됩니다
            </p>
          </div>

          <div className="space-y-3" role="radiogroup" aria-label="가입 역할">
            {ROLE_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                type="button"
                role="radio"
                aria-checked={role === opt.value}
                onClick={() => setRole(opt.value)}
                className={cn(
                  "w-full rounded-[18px] border px-4 py-4 text-left transition-all",
                  role === opt.value
                    ? "border-white/28 bg-white/14 dark:text-white text-gray-900 shadow-[0_12px_40px_rgba(0,0,0,0.45)]"
                    : "dark:border-white/10 border-gray-200 dark:bg-black bg-white bg-white/25 dark:text-white text-gray-600 hover:border-white/16 hover:dark:text-white text-gray-800",
                )}
              >
                <p className="font-mono text-sm font-bold tracking-tight">
                  {opt.titleKo}
                </p>
                <p className="mt-1 font-mono text-[11px] dark:text-white text-gray-500">
                  {opt.descKo}
                </p>
              </button>
            ))}
          </div>

          {error && (
            <div className="mt-4 rounded-[18px] border dark:border-white/14 border-gray-200 dark:bg-black bg-white bg-white/35 px-3 py-2 font-mono text-[12px] tracking-tight dark:text-white text-gray-800">
              {`// `}
              {error}
            </div>
          )}

          <BtnBlock
            type="button"
            variant="accent"
            size="lg"
            disabled={loading}
            onClick={handleComplete}
            className="mt-4 w-full rounded-[22px] border border-[#03C75A]/40 bg-[#03C75A] dark:text-white text-gray-900 shadow-[0_18px_60px_rgba(3,199,90,0.35)] transition-transform hover:-translate-y-0.5 hover:opacity-95"
          >
            {loading && <Spinner size="sm" />}
            {loading ? "가입 중…" : "가입 완료"}
          </BtnBlock>

          <p className="mt-6 text-center font-mono text-[12px] tracking-tight dark:text-white text-gray-500">
            {`// `}
            <Link
              href="/login"
              className="border-b dark:border-white/20 border-gray-300 pb-0.5 font-bold dark:text-white text-gray-900 transition-colors hover:border-white/35"
            >
              {t("backToLogin")}
            </Link>
          </p>
        </AuthCardShell>
      </div>
    </HomeLandingDayNight>
  );
}

function AuthCardShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="mx-auto flex w-full max-w-md flex-col items-center justify-center">
      <div className="tkad-auth-card relative w-full overflow-hidden rounded-[28px] border dark:border-white/12 border-gray-200 dark:bg-black bg-white bg-white/45 p-6 dark:text-white text-gray-900 shadow-[0_28px_120px_rgba(0,0,0,0.65)] backdrop-blur sm:p-8">
        <AuthCardDecor />
        <div className="relative">{children}</div>
      </div>
    </div>
  );
}

function AuthCardDecor() {
  return (
    <>
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-[0.10] tkad-neon-grid"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -inset-24 bg-[radial-gradient(circle_at_top,rgba(168,85,247,0.22),transparent_58%),radial-gradient(circle_at_bottom,rgba(34,211,238,0.18),transparent_58%),radial-gradient(circle_at_left,rgba(236,72,153,0.14),transparent_62%)]"
      />
    </>
  );
}

export default function NaverRegisterPage() {
  return (
    <Suspense fallback={null}>
      <NaverRegisterForm />
    </Suspense>
  );
}
