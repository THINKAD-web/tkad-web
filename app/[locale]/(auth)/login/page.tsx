"use client";

import { useState, type FormEvent } from "react";
import { useSearchParams } from "next/navigation";
import { Link, useRouter } from "@/i18n/navigation";
import { BtnBlock } from "@/components/brutalist";
import { Spinner } from "@/components/ui/spinner";

export default function LoginPage() {
  const router = useRouter();
  const search = useSearchParams();
  const redirect = search.get("redirect") || "/my";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

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

  const inputCls =
    "h-11 w-full border-2 border-border bg-card px-3 font-mono text-sm text-foreground placeholder:text-muted-foreground focus:border-accent focus:outline-none";

  return (
    <div className="flex min-h-[calc(100vh-72px)] items-center justify-center bg-muted px-4 py-10 dark:bg-hero-void">
      <div className="w-full max-w-md">
        <div className="mb-6 text-center">
          <p className="font-mono text-[10px] font-bold uppercase tracking-[0.22em] text-accent">
            [ LOGIN ]
          </p>
          <h1 className="mt-2 text-2xl font-bold tracking-tight text-foreground">
            로그인
          </h1>
          <p className="mt-2 font-mono text-[12px] tracking-tight text-muted-foreground">
            {`// `}THINKAD 계정으로 로그인하세요
          </p>
        </div>

        <div className="border-2 border-border bg-card p-6 sm:p-8">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label
                htmlFor="email"
                className="mb-2 block font-mono text-[10px] font-bold uppercase tracking-[0.22em] text-accent"
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

            <div>
              <label
                htmlFor="password"
                className="mb-2 block font-mono text-[10px] font-bold uppercase tracking-[0.22em] text-accent"
              >
                [ 비밀번호 ]
              </label>
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
              <div className="border-2 border-accent bg-card px-3 py-2 font-mono text-[12px] tracking-tight text-accent">
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
              {loading ? "로그인 중…" : "로그인"}
            </BtnBlock>
          </form>
        </div>

        <p className="mt-6 text-center font-mono text-[12px] tracking-tight text-muted-foreground">
          {`// `}계정이 없으신가요?{" "}
          <Link
            href="/register"
            className="border-b-2 border-border pb-0.5 font-bold text-foreground transition-colors hover:border-accent hover:text-accent"
          >
            회원가입
          </Link>
        </p>
      </div>
    </div>
  );
}
