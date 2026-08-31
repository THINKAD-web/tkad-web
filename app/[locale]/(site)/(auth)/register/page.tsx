"use client";

import { Suspense, useState, type FormEvent } from "react";
import { useSearchParams } from "next/navigation";
import { useLocale } from "next-intl";
import { Link, useRouter } from "@/i18n/navigation";
import { BtnBlock } from "@/components/brutalist";
import { Spinner } from "@/components/ui/spinner";
import { HomeLandingDayNight } from "@/components/home-landing-day-night";
import { getOrCreateTrackingSessionId } from "@/lib/tracking/client";
import { SignupStartRolePicker } from "@/components/auth/signup-start-role-picker";
import { SocialAuthButtons } from "@/components/auth/social-auth-buttons";
import { resolveOAuthLoginErrorMessage } from "@/lib/oauth-login-errors";
import type { SignupStartRole } from "@/lib/signup-start-roles";
import {
  proTrialSignupHeadlineEn,
  proTrialSignupHeadlineKo,
  freeAfterProTrialNoteEn,
  freeAfterProTrialNoteKo,
} from "@/lib/pro-trial-marketing";
import {
  authAlertClass,
  authCardClass,
  authEyebrowClass,
  authFooterClass,
  authInputClass,
  authLabelClass,
  authLinkClass,
  authSubmitClass,
  authSubtitleClass,
  authTitleClass,
} from "@/lib/auth/auth-ui-classes";

export default function RegisterPage() {
  return (
    <Suspense
      fallback={
        <HomeLandingDayNight>
          <div className="flex min-h-[50vh] items-center justify-center">
            <Spinner />
          </div>
        </HomeLandingDayNight>
      }
    >
      <RegisterPageInner />
    </Suspense>
  );
}

function RegisterPageInner() {
  const locale = useLocale();
  const isKo = locale === "ko";
  const router = useRouter();
  const searchParams = useSearchParams();
  const inviteRefUserId = searchParams.get("ref")?.trim() ?? "";
  const oauthError = resolveOAuthLoginErrorMessage(
    searchParams.get("error"),
    searchParams.get("provider"),
    isKo,
  );

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [company, setCompany] = useState("");
  const [startRole, setStartRole] = useState<SignupStartRole>("ADVERTISER");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(oauthError);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    if (password.length < 8) {
      setError("비밀번호는 8자 이상이어야 합니다.");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          password,
          name,
          company: company || undefined,
          startRole,
          sessionId: getOrCreateTrackingSessionId() || undefined,
          inviteRefUserId: inviteRefUserId || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        const code = data?.error?.code;
        setError(
          code === "EMAIL_IN_USE"
            ? "이미 사용 중인 이메일입니다."
            : code === "INVALID_INPUT"
              ? "입력값을 확인해주세요."
              : code === "RATE_LIMITED"
                ? "요청이 너무 많습니다. 잠시 후 다시 시도해주세요."
                : data?.error?.message ?? "회원가입에 실패했습니다.",
        );
        return;
      }
      const { trackGaEvent } = await import("@/lib/ga-events");
      trackGaEvent("sign_up", { method: "email" });
      router.push("/onboarding");
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
        <div className="mx-auto flex w-full max-w-md flex-col items-center justify-center">
          <div className={authCardClass}>
            <div>
              <div className="mb-6 text-center">
                <p className={authEyebrowClass}>[ REGISTER ]</p>
                <h1 className={`mt-2 ${authTitleClass}`}>회원가입</h1>
                <p className={`mt-2 ${authSubtitleClass}`}>
                  {`// `}
                  {isKo
                    ? "Google·카카오·네이버로 간편 가입하거나 이메일로 가입하세요"
                    : "Sign up with Google, Kakao, Naver, or email"}
                </p>
                <p className="mt-2 text-center tkad-type-title text-[color:var(--qp-accent)]">
                  {isKo ? proTrialSignupHeadlineKo() : proTrialSignupHeadlineEn()}
                </p>
                <p className={`mt-1 ${authSubtitleClass}`}>
                  {isKo ? freeAfterProTrialNoteKo() : freeAfterProTrialNoteEn()}
                </p>
              </div>

              <SocialAuthButtons />

              <div className="relative py-1">
                <div className="absolute inset-0 flex items-center" aria-hidden>
                  <div className="w-full border-t dark:border-white/12 border-gray-200" />
                </div>
                <p className="relative text-center tkad-type-label dark:text-white">
                  {isKo ? "또는 이메일로" : "Or with email"}
                </p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <Field label="이름" htmlFor="name">
                  <input
                    id="name"
                    type="text"
                    required
                    maxLength={40}
                    autoComplete="name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className={inputCls}
                  />
                </Field>

                <Field label="이메일" htmlFor="email">
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
                </Field>

                <Field label="비밀번호" htmlFor="password" hint="(8자 이상)">
                  <input
                    id="password"
                    type="password"
                    required
                    minLength={8}
                    maxLength={128}
                    autoComplete="new-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className={inputCls}
                  />
                </Field>

                <Field label="회사" htmlFor="company" hint="(선택)">
                  <input
                    id="company"
                    type="text"
                    maxLength={80}
                    autoComplete="organization"
                    value={company}
                    onChange={(e) => setCompany(e.target.value)}
                    className={inputCls}
                  />
                </Field>

                <Field label="시작 역할" htmlFor="role-advertiser" hint="(필수)">
                  <SignupStartRolePicker
                    value={startRole}
                    onChange={setStartRole}
                    ariaLabel="시작 역할"
                  />
                </Field>

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
                  {loading ? "가입 중…" : "가입하기"}
                </BtnBlock>
              </form>
            </div>
          </div>

          <p className={`mt-6 ${authFooterClass}`}>
            {`// `}이미 계정이 있으신가요?{" "}
            <Link href="/login" className={authLinkClass}>
              로그인
            </Link>
          </p>
        </div>
      </div>
    </HomeLandingDayNight>
  );
}

const inputCls = authInputClass;

function Field({
  label,
  hint,
  htmlFor,
  children,
}: {
  label: string;
  hint?: string;
  htmlFor: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label htmlFor={htmlFor} className={authLabelClass}>
        [ {label}{hint && <span className="ml-1">{hint}</span>} ]
      </label>
      {children}
    </div>
  );
}
