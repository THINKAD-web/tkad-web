"use client";

import { useState, type FormEvent } from "react";
import { useLocale } from "next-intl";
import { Link } from "@/i18n/navigation";
import { BtnBlock } from "@/components/brutalist";
import { Spinner } from "@/components/ui/spinner";
import { HomeLandingDayNight } from "@/components/home-landing-day-night";

export default function ForgotPasswordPage() {
  const locale = useLocale();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const inputCls =
    "tkad-auth-input h-11 w-full rounded-[18px] border dark:border-white/12 border-gray-200 dark:bg-black bg-white/28 px-4  text-sm font-semibold dark:text-white text-gray-900 placeholder:dark:text-white outline-none backdrop-blur transition-all focus:dark:border-white/18 border-gray-300 focus:ring-2 focus:ring-white/12";

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, locale }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        setError(data?.error?.message ?? "요청 처리에 실패했습니다.");
        return;
      }
      setDone(true);
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
          <div className="tkad-auth-card relative w-full overflow-hidden rounded-[28px] border dark:border-white/12 border-gray-200 dark:bg-black bg-white/45 p-6 dark:text-white text-gray-900 shadow-[0_28px_120px_rgba(0,0,0,0.65)] backdrop-blur sm:p-8">
            <div className="mb-6 text-center">
              <p className="font-display text-xs font-medium uppercase tracking-[0.22em] dark:text-white text-gray-600">
                [ FORGOT PASSWORD ]
              </p>
              <h1 className="mt-2 text-2xl font-black tracking-tight dark:text-white text-gray-900">
                비밀번호 찾기
              </h1>
              <p className="mt-2 text-[12px] tracking-tight dark:text-white text-gray-500">
                {`// `}가입 이메일로 재설정 링크를 보내드립니다
              </p>
            </div>

            {done ? (
              <div className="rounded-[18px] border border-emerald-400/25 bg-emerald-500/10 px-4 py-3 text-[12px] text-emerald-100">
                등록된 이메일이 있다면 재설정 링크를 보냈습니다. 받은편지함을 확인해 주세요.
              </div>
            ) : (
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
                    required
                    autoComplete="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className={inputCls}
                  />
                </div>
                {error && (
                  <div className="rounded-[18px] border dark:border-white/14 border-gray-200 dark:bg-black bg-white/35 px-3 py-2 text-[12px] dark:text-white text-gray-800">
                    {`// `}{error}
                  </div>
                )}
                <BtnBlock
                  type="submit"
                  variant="accent"
                  size="lg"
                  disabled={loading}
                  className="w-full"
                >
                  {loading && <Spinner size="sm" />}
                  {loading ? "발송 중…" : "재설정 링크 보내기"}
                </BtnBlock>
              </form>
            )}

            <p className="mt-6 text-center text-[12px] dark:text-white text-gray-500">
              <Link href="/login" className="font-bold dark:text-white text-gray-900 hover:underline">
                로그인으로 돌아가기
              </Link>
            </p>
          </div>
        </div>
      </div>
    </HomeLandingDayNight>
  );
}
