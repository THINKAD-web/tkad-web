"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useSearchParams } from "next/navigation";
import { Link, useRouter } from "@/i18n/navigation";
import { BtnBlock } from "@/components/brutalist";
import { Spinner } from "@/components/ui/spinner";
import { HomeLandingDayNight } from "@/components/home-landing-day-night";
import { useAppToast } from "@/lib/use-toast";

const ROLE_LABEL: Record<string, string> = {
  advertiser: "광고주",
  agency: "대행사",
  owner: "매체사",
  admin: "관리자",
};

type ProfileData = {
  id: string;
  email: string;
  name: string;
  phone: string | null;
  company: string | null;
  locale: string;
  role: string;
  communityRole: string | null;
  communityBio: string | null;
  region: string | null;
  emailVerifiedAt: string | null;
  createdAt: string;
  oauthAccounts: Array<{
    provider: string;
    providerEmail: string | null;
    providerName: string | null;
    createdAt: string;
  }>;
};

export default function ProfilePage() {
  const router = useRouter();
  const params = useSearchParams();
  const welcome = params.get("welcome") === "1";
  const needsEmail = params.get("needs_email") === "1";
  const toast = useAppToast();

  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [company, setCompany] = useState("");
  const [communityBio, setCommunityBio] = useState("");
  const [region, setRegion] = useState("");
  const [locale, setLocale] = useState<"ko" | "en" | "zh" | "ja">("ko");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const r = await fetch("/api/auth/profile", { cache: "no-store" });
        const d = await r.json();
        if (cancelled) return;
        if (r.status === 401) {
          router.replace("/login?redirect=/account/profile");
          return;
        }
        if (!d?.ok) {
          toast.error("프로필을 불러오지 못했습니다.");
          return;
        }
        setProfile(d.data);
        setName(d.data.name || "");
        // OAuth 신규 가입 시 placeholder 이메일을 받았으면 비워서 입력 유도
        const isPlaceholderEmail = /@oauth\.local\.thinkad$/i.test(d.data.email);
        setEmail(isPlaceholderEmail ? "" : d.data.email || "");
        setPhone(d.data.phone || "");
        setCompany(d.data.company || "");
        setCommunityBio(d.data.communityBio || "");
        setRegion(d.data.region || "");
        setLocale(d.data.locale || "ko");
      } catch {
        if (!cancelled) toast.error("네트워크 오류가 발생했습니다.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [router, toast]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!profile) return;
    setSaving(true);
    try {
      const res = await fetch("/api/auth/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          email: email.trim() || undefined,
          phone: phone.trim() || null,
          company: company.trim() || null,
          communityBio: communityBio.trim() || null,
          region: region.trim() || null,
          locale,
        }),
      });
      const d = await res.json();
      if (!res.ok || !d?.ok) {
        const code = d?.error?.code;
        toast.error(
          code === "EMAIL_IN_USE"
            ? "이미 사용 중인 이메일입니다."
            : d?.error?.message || "저장에 실패했습니다.",
        );
        return;
      }
      setProfile(d.data);
      toast.success("프로필을 저장했습니다.");
    } catch {
      toast.error("네트워크 오류가 발생했습니다.");
    } finally {
      setSaving(false);
    }
  }

  async function handleLogout() {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } catch {
      // ignore
    }
    router.push("/");
    router.refresh();
  }

  return (
    <HomeLandingDayNight>
      <div className="tkad-landing-neon tkad-planner-neon tkad-auth-page min-h-[calc(100vh-72px)] px-4 py-10">
        <div className="mx-auto flex w-full max-w-xl flex-col gap-4">
          {welcome ? (
            <div className="tkad-auth-card relative overflow-hidden rounded-[22px] border border-white/12 bg-black/45 px-5 py-4 text-white backdrop-blur">
              <p className="font-mono text-[10px] font-bold uppercase tracking-[0.22em] text-white/65">
                [ WELCOME ]
              </p>
              <p className="mt-2 text-base font-bold leading-snug">
                THINKAD 에 오신 것을 환영합니다 👋
              </p>
              {needsEmail ? (
                <p className="mt-1 font-mono text-[12px] tracking-tight text-white/65">
                  {`// `}소셜 계정에서 이메일을 받지 못했어요. 알림·견적 발송을 위해 이메일을 입력해주세요.
                </p>
              ) : null}
            </div>
          ) : null}

          <div className="tkad-auth-card relative w-full overflow-hidden rounded-[28px] border border-white/12 bg-black/45 p-6 text-white shadow-[0_28px_120px_rgba(0,0,0,0.65)] backdrop-blur sm:p-8">
            <div aria-hidden className="pointer-events-none absolute inset-0 opacity-[0.10] tkad-neon-grid" />
            <div
              aria-hidden
              className="pointer-events-none absolute -inset-24 bg-[radial-gradient(circle_at_top,rgba(168,85,247,0.22),transparent_58%),radial-gradient(circle_at_bottom,rgba(34,211,238,0.18),transparent_58%)]"
            />
            <div className="relative">
              <div className="mb-6">
                <p className="font-mono text-[10px] font-bold uppercase tracking-[0.22em] text-white/65">
                  [ PROFILE ]
                </p>
                <h1 className="mt-2 text-2xl font-black tracking-tight text-white">
                  프로필 설정
                </h1>
                <p className="mt-2 font-mono text-[12px] tracking-tight text-white/55">
                  {`// `}계정 정보와 연락처를 관리합니다.
                </p>
              </div>

              {loading || !profile ? (
                <div className="flex h-40 items-center justify-center">
                  <Spinner size="sm" />
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-4">
                  <ReadOnlyRow label="회원 유형" value={ROLE_LABEL[profile.role] ?? profile.role} />
                  <ReadOnlyRow
                    label="가입 경로"
                    value={
                      profile.oauthAccounts.length > 0
                        ? profile.oauthAccounts.map((a) => labelForProvider(a.provider)).join(", ")
                        : "이메일/비밀번호"
                    }
                  />

                  <Field label="이름" htmlFor="name">
                    <input
                      id="name"
                      type="text"
                      required
                      maxLength={40}
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className={inputCls}
                    />
                  </Field>

                  <Field label="이메일" htmlFor="email" hint={needsEmail ? "(필수)" : undefined}>
                    <input
                      id="email"
                      type="email"
                      required={needsEmail}
                      autoComplete="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className={inputCls}
                    />
                  </Field>

                  <Field label="연락처" htmlFor="phone" hint="(선택)">
                    <input
                      id="phone"
                      type="tel"
                      maxLength={20}
                      autoComplete="tel"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="010-1234-5678"
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

                  <Field label="지역" htmlFor="region" hint="(선택, 예: 서울)">
                    <input
                      id="region"
                      type="text"
                      maxLength={40}
                      value={region}
                      onChange={(e) => setRegion(e.target.value)}
                      className={inputCls}
                    />
                  </Field>

                  <Field label="자기소개" htmlFor="bio" hint="(커뮤니티 표시용)">
                    <textarea
                      id="bio"
                      rows={3}
                      maxLength={500}
                      value={communityBio}
                      onChange={(e) => setCommunityBio(e.target.value)}
                      className={`${inputCls} h-auto resize-y py-3`}
                    />
                  </Field>

                  <Field label="언어" htmlFor="locale">
                    <select
                      id="locale"
                      value={locale}
                      onChange={(e) =>
                        setLocale(e.target.value as typeof locale)
                      }
                      className={inputCls}
                    >
                      <option value="ko">한국어</option>
                      <option value="en">English</option>
                    </select>
                  </Field>

                  <div className="flex flex-col gap-2 pt-2">
                    <BtnBlock
                      type="submit"
                      variant="accent"
                      size="lg"
                      disabled={saving}
                      className="w-full rounded-[22px] border border-white/14 bg-[linear-gradient(135deg,rgba(168,85,247,0.95),rgba(34,211,238,0.95),rgba(236,72,153,0.95))] text-white shadow-[0_18px_60px_rgba(0,0,0,0.55)] transition-transform hover:-translate-y-0.5 hover:opacity-95"
                    >
                      {saving && <Spinner size="sm" />}
                      {saving ? "저장 중…" : "저장"}
                    </BtnBlock>
                    <button
                      type="button"
                      onClick={handleLogout}
                      className="mt-1 inline-flex h-10 w-full items-center justify-center rounded-[18px] border border-white/12 bg-black/30 font-mono text-[12px] font-bold uppercase tracking-[0.18em] text-white/75 transition-colors hover:bg-black/45"
                    >
                      로그아웃
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>

          <p className="text-center font-mono text-[12px] tracking-tight text-white/60">
            <Link
              href="/my"
              className="border-b border-white/20 pb-0.5 font-bold text-white transition-colors hover:border-white/35 hover:text-white"
            >
              내 대시보드로
            </Link>
          </p>
        </div>
      </div>
    </HomeLandingDayNight>
  );
}

function labelForProvider(p: string): string {
  if (p === "kakao") return "카카오";
  if (p === "naver") return "네이버";
  return p;
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
        [ {label}
        {hint && <span className="ml-1 text-white/45">{hint}</span>} ]
      </label>
      {children}
    </div>
  );
}

function ReadOnlyRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[18px] border border-white/10 bg-black/25 px-3 py-2.5">
      <p className="font-mono text-[10px] font-bold uppercase tracking-[0.22em] text-white/55">
        [ {label} ]
      </p>
      <p className="mt-1 text-sm font-bold tracking-tight text-white/90">{value}</p>
    </div>
  );
}
