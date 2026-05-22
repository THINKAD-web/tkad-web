"use client";

import { Suspense, useState, type FormEvent } from "react";
import { useSearchParams } from "next/navigation";
import { BtnBlock } from "@/components/brutalist";
import { Spinner } from "@/components/ui/spinner";
import { HomeLandingDayNight } from "@/components/home-landing-day-night";

function ResetPasswordForm() {
  const search = useSearchParams();
  const token = search.get("token") ?? "";
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const inputCls =
    "tkad-auth-input h-11 w-full rounded-[18px] border dark:border-white/12 border-gray-200 dark:bg-black bg-white/28 px-4 font-mono text-sm font-semibold dark:text-white text-gray-900 placeholder:dark:text-white outline-none backdrop-blur transition-all focus:dark:border-white/18 border-gray-300 focus:ring-2 focus:ring-white/12";

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    if (!token) {
      setError("재설정 토큰이 없습니다.");
      return;
    }
    if (password.length < 8) {
      setError("비밀번호는 8자 이상이어야 합니다.");
      return;
    }
    if (password !== confirm) {
      setError("비밀번호가 일치하지 않습니다.");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        setError(data?.error?.message ?? "비밀번호 재설정에 실패했습니다.");
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
              <p className="font-mono text-[10px] font-bold uppercase tracking-[0.22em] dark:text-white text-gray-600">
                [ RESET PASSWORD ]
              </p>
              <h1 className="mt-2 text-2xl font-black tracking-tight dark:text-white text-gray-900">
                새 비밀번호 설정
              </h1>
            </div>

            {done ? (
              <>
                <p className="font-mono text-[12px] text-emerald-200">
                  비밀번호가 변경되었습니다. 새 비밀번호로 로그인해 주세요.
                </p>
                <BtnBlock href="/login" variant="accent" size="lg" className="mt-6 w-full">
                  로그인
                </BtnBlock>
              </>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label
                    htmlFor="password"
                    className="mb-2 block font-mono text-[10px] font-bold uppercase tracking-[0.22em] dark:text-white text-gray-600"
                  >
                    [ 새 비밀번호 ]
                  </label>
                  <input
                    id="password"
                    type="password"
                    required
                    minLength={8}
                    autoComplete="new-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className={inputCls}
                  />
                </div>
                <div>
                  <label
                    htmlFor="confirm"
                    className="mb-2 block font-mono text-[10px] font-bold uppercase tracking-[0.22em] dark:text-white text-gray-600"
                  >
                    [ 비밀번호 확인 ]
                  </label>
                  <input
                    id="confirm"
                    type="password"
                    required
                    minLength={8}
                    autoComplete="new-password"
                    value={confirm}
                    onChange={(e) => setConfirm(e.target.value)}
                    className={inputCls}
                  />
                </div>
                {error && (
                  <div className="rounded-[18px] border dark:border-white/14 border-gray-200 dark:bg-black bg-white/35 px-3 py-2 font-mono text-[12px] dark:text-white text-gray-800">
                    {`// `}{error}
                  </div>
                )}
                <BtnBlock type="submit" variant="accent" size="lg" disabled={loading} className="w-full">
                  {loading && <Spinner size="sm" />}
                  {loading ? "저장 중…" : "비밀번호 변경"}
                </BtnBlock>
              </form>
            )}
          </div>
        </div>
      </div>
    </HomeLandingDayNight>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={null}>
      <ResetPasswordForm />
    </Suspense>
  );
}
