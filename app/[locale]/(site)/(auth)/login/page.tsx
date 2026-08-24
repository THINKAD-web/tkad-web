"use client";

import { Suspense, useState, type FormEvent } from "react";
import { useSearchParams } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { Link, useRouter } from "@/i18n/navigation";
import { SocialAuthButtons } from "@/components/auth/social-auth-buttons";
import { BtnBlock } from "@/components/brutalist";
import { Spinner } from "@/components/ui/spinner";
import { HomeLandingDayNight } from "@/components/home-landing-day-night";
import { resolveOAuthLoginErrorMessage } from "@/lib/oauth-login-errors";
import {
  authAlertClass,
  authCardClass,
  authInputClass,
  authSubmitClass,
} from "@/lib/auth/auth-ui-classes";

function LoginForm() {
  const t = useTranslations("auth");
  const locale = useLocale();
  const isKo = locale === "ko";
  const router = useRouter();
  const search = useSearchParams();
  const redirect = search.get("redirect") || "/my";
  const oauthError = resolveOAuthLoginErrorMessage(
    search.get("error"),
    search.get("provider"),
    isKo,
  );

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(oauthError);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        const code = data?.error?.code;
        setError(
          code === "INVALID_CREDENTIALS"
            ? "이메일 또는 비밀번호가 올바르지 않습니다."
            : code === "RATE_LIMITED"
              ? "요청이 너무 많습니다. 잠시 후 다시 시도해주세요."
              : data?.error?.message ?? "로그인에 실패했습니다.",
        );
        return;
      }
      router.push(redirect);
      router.refresh();
    } catch {
      setError("네트워크 오류가 발생했습니다.");
    } finally {
      setLoading(false);
    }
  }

  const inputCls = authInputClass;

  return (
    <HomeLandingDayNight>
      <div className="tkad-landing-neon tkad-planner-neon tkad-auth-page min-h-[calc(100vh-72px)] px-4 py-10">
        <div className="mx-auto flex w-full max-w-md flex-col items-center justify-center">
          <div className={authCardClass}>
            <div>
              <div className="mb-6 text-center">
                <p className="font-display text-xs font-medium uppercase tracking-[0.22em] dark:text-white text-gray-600">
                  [ LOGIN ]
                </p>
                <h1 className="mt-2 text-2xl font-black tracking-tight dark:text-white text-gray-900">
                  로그인
                </h1>
                <p className="mt-2 text-[12px] tracking-tight dark:text-white text-gray-500">
                  {`// `}
                  {isKo
                    ? "Google·카카오·네이버 간편 로그인 또는 이메일 로그인"
                    : "Sign in with Google, Kakao, Naver, or email"}
                </p>
              </div>

              <SocialAuthButtons />

              <div className="relative py-1">
                <div className="absolute inset-0 flex items-center" aria-hidden>
                  <div className="w-full border-t dark:border-white/12 border-gray-200" />
                </div>
                <p className="relative text-center font-display text-xs font-medium uppercase tracking-[0.2em] dark:text-white">
                  {t("orEmail")}
                </p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label
                    htmlFor="email"
                    className="mb-2 block font-display text-xs font-medium uppercase tracking-[0.22em] dark:text-white text-gray-600"
                  >
                    [ 이메일 ]
                  </label>
                  <input
                    id="email"
                    type="email"
                    inputMode="email"
                    required
                    autoComplete="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className={inputCls}
                  />
                </div>

                <div>
                  <div className="mb-2 flex items-center justify-between gap-2">
                    <label
                      htmlFor="password"
                      className="block font-display text-xs font-medium uppercase tracking-[0.22em] dark:text-white text-gray-600"
                    >
                      [ 비밀번호 ]
                    </label>
                    <Link
                      href="/forgot-password"
                      className="text-[10px] dark:text-white text-gray-400 transition-colors hover:dark:text-white text-gray-900"
                    >
                      비밀번호 찾기
                    </Link>
                  </div>
                  <input
                    id="password"
                    type="password"
                    required
                    autoComplete="current-password"
                    minLength={8}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className={inputCls}
                  />
                </div>

                {error && (
                  <div className={authAlertClass}>
                    {`// `}{error}
                  </div>
                )}

                <BtnBlock
                  type="submit"
                  variant="accent"
                  size="lg"
                  disabled={loading}
                  className={authSubmitClass}
                >
                  {loading && <Spinner size="sm" />}
                  {loading ? "로그인 중…" : "로그인"}
                </BtnBlock>
              </form>
            </div>
          </div>

          <p className="mt-6 text-center text-[12px] tracking-tight dark:text-white text-gray-500">
            {`// `}계정이 없으신가요?{" "}
            <Link
              href="/signup"
              className="border-b dark:border-white/20 border-gray-300 pb-0.5 font-bold dark:text-white text-gray-900 transition-colors hover:border-white/35 hover:dark:text-white"
            >
              {t("signup")}
            </Link>
          </p>
        </div>
      </div>
    </HomeLandingDayNight>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginForm />
    </Suspense>
  );
}
