"use client";

import { useState, type FormEvent } from "react";
import { Link, useRouter } from "@/i18n/navigation";
import { BtnBlock } from "@/components/brutalist";
import { Spinner } from "@/components/ui/spinner";

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
                : data?.error?.message ?? "회원가입에 실패했습니다.",
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
    <div className="flex min-h-[calc(100vh-72px)] items-center justify-center bg-bx-off px-4 py-10 dark:bg-bx-black">
      <div className="w-full max-w-md">
        <div className="mb-6 text-center">
          <p className="font-mono text-[10px] font-bold uppercase tracking-[0.22em] text-bx-accent">
            [ REGISTER ]
          </p>
          <h1 className="mt-2 text-2xl font-bold tracking-tight text-bx-black">
            회원가입
          </h1>
          <p className="mt-2 font-mono text-[12px] tracking-tight text-bx-gray-dim">
            {`// `}THINKAD 계정을 만들어보세요
          </p>
        </div>

        <div className="border-2 border-bx-black bg-bx-white p-6 sm:p-8">
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

            {error && (
              <div className="border-2 border-bx-accent bg-bx-white px-3 py-2 font-mono text-[12px] tracking-tight text-bx-accent">
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
              {loading ? "가입 중…" : "가입하기"}
            </BtnBlock>
          </form>
        </div>

        <p className="mt-6 text-center font-mono text-[12px] tracking-tight text-bx-gray-dim">
          {`// `}이미 계정이 있으신가요?{" "}
          <Link
            href="/login"
            className="border-b-2 border-bx-black pb-0.5 font-bold text-bx-black transition-colors hover:border-bx-accent hover:text-bx-accent"
          >
            로그인
          </Link>
        </p>
      </div>
    </div>
  );
}

const inputCls =
  "h-11 w-full border-2 border-bx-black bg-bx-white px-3 font-mono text-sm text-bx-black placeholder:text-bx-gray-dim focus:border-bx-accent focus:outline-none";

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
      <label
        htmlFor={htmlFor}
        className="mb-2 block font-mono text-[10px] font-bold uppercase tracking-[0.22em] text-bx-accent"
      >
        [ {label}{hint && <span className="ml-1 text-bx-gray-dim">{hint}</span>} ]
      </label>
      {children}
    </div>
  );
}
