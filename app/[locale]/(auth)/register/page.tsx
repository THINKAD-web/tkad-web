"use client";

import { useState, type FormEvent } from "react";
import { Link, useRouter } from "@/i18n/navigation";
import { BtnBlock } from "@/components/brutalist";
import { Spinner } from "@/components/ui/spinner";
import { HomeLandingDayNight } from "@/components/home-landing-day-night";
import { cn } from "@/lib/utils";
import type { CommunityMemberRole } from "@/lib/community/types";

export default function RegisterPage() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [company, setCompany] = useState("");
  const [communityRole, setCommunityRole] =
    useState<CommunityMemberRole>("ADVERTISER");

  const signupRoleOptions: {
    value: CommunityMemberRole;
    title: string;
    desc: string;
  }[] = [
    {
      value: "ADVERTISER",
      title: "광고주로 시작하기",
      desc: "캠페인·매체 탐색·플래너",
    },
    {
      value: "MEDIA",
      title: "매체사로 시작하기",
      desc: "매체 등록·부킹·송출 관리",
    },
  ];
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
          communityRole,
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
    <HomeLandingDayNight>
      <div className="tkad-landing-neon tkad-planner-neon tkad-auth-page min-h-[calc(100vh-72px)] px-4 py-10">
        <div className="mx-auto flex w-full max-w-md flex-col items-center justify-center">
          <div className="tkad-auth-card relative w-full overflow-hidden rounded-[28px] border border-white/12 bg-black/45 p-6 text-white shadow-[0_28px_120px_rgba(0,0,0,0.65)] backdrop-blur sm:p-8">
            <div aria-hidden className="pointer-events-none absolute inset-0 opacity-[0.10] tkad-neon-grid" />
            <div
              aria-hidden
              className="pointer-events-none absolute -inset-24 bg-[radial-gradient(circle_at_top,rgba(168,85,247,0.22),transparent_58%),radial-gradient(circle_at_bottom,rgba(34,211,238,0.18),transparent_58%),radial-gradient(circle_at_left,rgba(236,72,153,0.14),transparent_62%)]"
            />
            <div className="relative">
              <div className="mb-6 text-center">
                <p className="font-mono text-[10px] font-bold uppercase tracking-[0.22em] text-white/65">
                  [ REGISTER ]
                </p>
                <h1 className="mt-2 text-2xl font-black tracking-tight text-white">
                  회원가입
                </h1>
                <p className="mt-2 font-mono text-[12px] tracking-tight text-white/55">
                  {`// `}THINKAD 계정을 만들어보세요
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
                  <div className="space-y-2" role="radiogroup" aria-label="시작 역할">
                    {signupRoleOptions.map((opt) => (
                      <button
                        key={opt.value}
                        id={opt.value === "ADVERTISER" ? "role-advertiser" : undefined}
                        type="button"
                        role="radio"
                        aria-checked={communityRole === opt.value}
                        onClick={() => setCommunityRole(opt.value)}
                        className={cn(
                          "w-full rounded-[18px] border px-4 py-3 text-left transition-all",
                          communityRole === opt.value
                            ? "border-white/28 bg-white/14 text-white shadow-[0_12px_40px_rgba(0,0,0,0.45)]"
                            : "border-white/10 bg-black/25 text-white/65 hover:border-white/16 hover:text-white/85",
                        )}
                      >
                        <p className="font-mono text-sm font-bold tracking-tight">
                          {opt.title}
                        </p>
                        <p className="mt-1 font-mono text-[11px] text-white/55">
                          {opt.desc}
                        </p>
                      </button>
                    ))}
                  </div>
                </Field>

                {error && (
                  <div className="rounded-[18px] border border-white/14 bg-black/35 px-3 py-2 font-mono text-[12px] tracking-tight text-white/85">
                    {`// `}{error}
                  </div>
                )}

                <BtnBlock
                  type="submit"
                  variant="accent"
                  size="lg"
                  disabled={loading}
                  className="w-full rounded-[22px] border border-white/14 bg-[linear-gradient(135deg,rgba(168,85,247,0.95),rgba(34,211,238,0.95),rgba(236,72,153,0.95))] text-white shadow-[0_18px_60px_rgba(0,0,0,0.55)] transition-transform hover:-translate-y-0.5 hover:opacity-95"
                >
                  {loading && <Spinner size="sm" />}
                  {loading ? "가입 중…" : "가입하기"}
                </BtnBlock>
              </form>
            </div>
          </div>

          <p className="mt-6 text-center font-mono text-[12px] tracking-tight text-white/60">
            {`// `}이미 계정이 있으신가요?{" "}
            <Link
              href="/login"
              className="border-b border-white/20 pb-0.5 font-bold text-white transition-colors hover:border-white/35 hover:text-white"
            >
              로그인
            </Link>
          </p>
        </div>
      </div>
    </HomeLandingDayNight>
  );
}

const inputCls =
  "tkad-auth-input h-11 w-full rounded-[18px] border border-white/12 bg-black/28 px-4 font-mono text-sm font-semibold text-white placeholder:text-white/45 outline-none backdrop-blur transition-all focus:border-white/18 focus:ring-2 focus:ring-white/12";

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
        className="mb-2 block font-mono text-[10px] font-bold uppercase tracking-[0.22em] text-white/65"
      >
        [ {label}{hint && <span className="ml-1 text-white/45">{hint}</span>} ]
      </label>
      {children}
    </div>
  );
}
