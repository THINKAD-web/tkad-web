"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
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
              : "로그인에 실패했습니다.",
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

  return (
    <div className="min-h-screen flex items-center justify-center px-4 bg-background">
      <div className="w-full max-w-md bg-white rounded-2xl shadow p-8">
        <h1 className="text-2xl font-semibold text-primary mb-2">로그인</h1>
        <p className="text-sm text-gray-500 mb-6">THINKAD 계정으로 로그인하세요</p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="email" className="block text-sm font-medium mb-1">
              이메일
            </label>
            <input
              id="email"
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-medium mb-1">
              비밀번호
            </label>
            <input
              id="password"
              type="password"
              required
              autoComplete="current-password"
              minLength={8}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>

          {error && (
            <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 bg-primary text-white rounded-lg font-medium disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {loading && <Spinner size="sm" />}
            {loading ? "로그인 중…" : "로그인"}
          </button>
        </form>

        <div className="mt-6 text-sm text-center text-gray-600">
          계정이 없으신가요?{" "}
          <Link href="/register" className="text-primary font-medium hover:underline">
            회원가입
          </Link>
        </div>
      </div>
    </div>
  );
}
