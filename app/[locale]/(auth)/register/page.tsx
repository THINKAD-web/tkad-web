"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

export default function RegisterPage() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [company, setCompany] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
                : "회원가입에 실패했습니다.",
        );
        return;
      }
      router.push("/my");
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
        <h1 className="text-2xl font-semibold text-primary mb-2">회원가입</h1>
        <p className="text-sm text-gray-500 mb-6">THINKAD 계정을 만들어보세요</p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="name" className="block text-sm font-medium mb-1">
              이름
            </label>
            <input
              id="name"
              type="text"
              required
              maxLength={40}
              autoComplete="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>

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
              비밀번호 <span className="text-gray-400 text-xs">(8자 이상)</span>
            </label>
            <input
              id="password"
              type="password"
              required
              minLength={8}
              maxLength={128}
              autoComplete="new-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>

          <div>
            <label htmlFor="company" className="block text-sm font-medium mb-1">
              회사 <span className="text-gray-400 text-xs">(선택)</span>
            </label>
            <input
              id="company"
              type="text"
              maxLength={80}
              autoComplete="organization"
              value={company}
              onChange={(e) => setCompany(e.target.value)}
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
            className="w-full py-2.5 bg-primary text-white rounded-lg font-medium disabled:opacity-50"
          >
            {loading ? "가입 중…" : "가입하기"}
          </button>
        </form>

        <div className="mt-6 text-sm text-center text-gray-600">
          이미 계정이 있으신가요?{" "}
          <Link href="/login" className="text-primary font-medium hover:underline">
            로그인
          </Link>
        </div>
      </div>
    </div>
  );
}
