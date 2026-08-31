"use client";

import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { Link, useRouter } from "@/i18n/navigation";
import { BtnBlock } from "@/components/brutalist";
import { Spinner } from "@/components/ui/spinner";
import { HomeLandingDayNight } from "@/components/home-landing-day-night";
import { SignupStartRolePicker } from "@/components/auth/signup-start-role-picker";
import type { KakaoSignupRole } from "@/lib/kakao-oauth-pending";

function KakaoRegisterForm() {
  const t = useTranslations("auth");
  const router = useRouter();
  const search = useSearchParams();
  const redirect = search.get("redirect") || "/my";

  const [role, setRole] = useState<KakaoSignupRole>("ADVERTISER");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleComplete() {
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/auth/kakao/complete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        const code = data?.error?.code;
        setError(
          code === "KAKAO_PENDING_EXPIRED"
            ? "카카오 인증이 만료되었습니다. 로그인 페이지에서 다시 시도해주세요."
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
            <p className="tkad-type-label dark:text-white text-gray-600">
              [ KAKAO SIGNUP ]
            </p>
            <h1 className="mt-2 text-2xl font-black tracking-tight dark:text-white text-gray-900">
              카카오 계정 가입
            </h1>
            <p className="mt-2 tkad-type-meta tracking-tight dark:text-white text-gray-500">
              {`// `}역할을 선택하면 가입이 완료됩니다
            </p>
          </div>

          <SignupStartRolePicker
            value={role}
            onChange={setRole}
            ariaLabel="가입 역할"
          />

          {error && (
            <div className="mt-4 rounded-[18px] border dark:border-white/14 border-gray-200 dark:bg-black bg-white/35 px-3 py-2 tkad-type-meta tracking-tight dark:text-white text-gray-800">
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
            className="mt-4 w-full rounded-[22px] border dark:border-white/14 border-gray-200 bg-[#FEE500] text-[#191600] shadow-[0_18px_60px_rgba(0,0,0,0.35)] transition-transform hover:-translate-y-0.5 hover:opacity-95"
          >
            {loading && <Spinner size="sm" />}
            {loading ? "가입 중…" : "가입 완료"}
          </BtnBlock>

          <p className="mt-6 text-center tkad-type-meta tracking-tight dark:text-white text-gray-500">
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
      <div className="tkad-auth-card tkad-qp-auth-card relative w-full overflow-hidden border dark:border-white/12 border-gray-200 p-6 dark:text-white text-gray-900 sm:p-8">
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
        className="pointer-events-none absolute inset-0 opacity-[0.04] bg-[linear-gradient(rgba(255,255,255,0.04)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.04)_1px,transparent_1px)] bg-[size:28px_28px]"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -inset-24 bg-[radial-gradient(circle_at_top,color-mix(in_srgb,var(--qp-accent)_18%,transparent),transparent_58%),radial-gradient(circle_at_bottom,color-mix(in_srgb,var(--qp-accent)_10%,transparent),transparent_58%)]"
      />
    </>
  );
}

export default function KakaoRegisterPage() {
  return (
    <Suspense fallback={null}>
      <KakaoRegisterForm />
    </Suspense>
  );
}
