"use client";

import { useCallback, useEffect, useState, type FormEvent } from "react";
import { useLocale } from "next-intl";
import { Link, useRouter } from "@/i18n/navigation";
import { ArrowLeft, CheckCircle2, Loader2, Mail, RefreshCw, Trash2 } from "lucide-react";
import { BtnBlock } from "@/components/brutalist";
import { NeonFullPageSpinner } from "@/components/ui/neon-page-spinner";
import { useAppToast } from "@/lib/use-toast";
import { cn } from "@/lib/utils";

type SettingsData = {
  id: string;
  email: string;
  name: string;
  company: string | null;
  phone: string | null;
  emailVerifiedAt: string | null;
  needsEmailVerification: boolean;
  hasPassword: boolean;
  isOAuthPlaceholderEmail: boolean;
  linkedProviders: string[];
};

const glassCard =
  "rounded-2xl border dark:border-white/12 border-gray-200 dark:bg-white/5 bg-gray-50 p-5 shadow-[0_12px_40px_rgba(0,0,0,0.35)] backdrop-blur";

const inputCls =
  "h-11 w-full rounded-xl border dark:border-white/12 border-gray-200 dark:bg-black bg-white/30 px-4  text-sm dark:text-white text-gray-900 placeholder:dark:text-white text-gray-400 outline-none focus:dark:border-white/20 border-gray-300 focus:ring-2 focus:ring-white/10";

const PROVIDER_LABEL: Record<string, string> = {
  kakao: "카카오",
  naver: "네이버",
};

export function MySettingsPageClient() {
  const router = useRouter();
  const locale = useLocale();
  const isKo = locale === "ko";
  const toast = useAppToast();

  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<SettingsData | null>(null);

  const [name, setName] = useState("");
  const [company, setCompany] = useState("");
  const [phone, setPhone] = useState("");
  const [profileSaving, setProfileSaving] = useState(false);

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [passwordSaving, setPasswordSaving] = useState(false);

  const [resending, setResending] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const [deletePassword, setDeletePassword] = useState("");
  const [deleteConfirm, setDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const load = useCallback(async () => {
    const res = await fetch("/api/my/settings", { cache: "no-store" });
    const json = await res.json();
    if (!res.ok || !json.ok) {
      router.replace("/login?redirect=/my/settings");
      return null;
    }
    return json.data as SettingsData;
  }, [router]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const row = await load();
      if (cancelled) return;
      if (row) {
        setData(row);
        setName(row.name);
        setCompany(row.company ?? "");
        setPhone(row.phone ?? "");
      }
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [load]);

  async function saveProfile(e: FormEvent) {
    e.preventDefault();
    setProfileSaving(true);
    try {
      const res = await fetch("/api/my/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          company: company.trim() || null,
          phone: phone.trim() || null,
        }),
      });
      const json = await res.json();
      if (!res.ok || !json.ok) {
        toast.error(json?.error?.message ?? (isKo ? "저장 실패" : "Save failed"));
        return;
      }
      toast.success(isKo ? "프로필을 저장했습니다." : "Profile saved.");
      setData((d) => (d ? { ...d, ...json.data } : d));
    } finally {
      setProfileSaving(false);
    }
  }

  async function changePassword(e: FormEvent) {
    e.preventDefault();
    setPasswordSaving(true);
    try {
      const res = await fetch("/api/my/settings/password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          currentPassword: data?.hasPassword ? currentPassword : undefined,
          newPassword,
        }),
      });
      const json = await res.json();
      if (!res.ok || !json.ok) {
        toast.error(json?.error?.message ?? (isKo ? "변경 실패" : "Update failed"));
        return;
      }
      toast.success(isKo ? "비밀번호를 변경했습니다." : "Password updated.");
      setCurrentPassword("");
      setNewPassword("");
      setData((d) => (d ? { ...d, hasPassword: true } : d));
    } finally {
      setPasswordSaving(false);
    }
  }

  async function refreshVerificationStatus() {
    setRefreshing(true);
    try {
      const row = await load();
      if (!row) return;
      setData(row);
      setName(row.name);
      setCompany(row.company ?? "");
      setPhone(row.phone ?? "");
      if (row.emailVerifiedAt) {
        toast.success(isKo ? "이메일 인증이 확인되었습니다." : "Email verification confirmed.");
      } else if (row.needsEmailVerification) {
        toast.warning(isKo ? "아직 인증되지 않았습니다." : "Email is not verified yet.");
      }
    } finally {
      setRefreshing(false);
    }
  }

  async function resendVerification() {
    setResending(true);
    try {
      const res = await fetch("/api/auth/verify-email/resend", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ locale }),
      });
      const json = await res.json();
      if (!res.ok || !json.ok) {
        toast.error(json?.error?.message ?? (isKo ? "재발송 실패" : "Resend failed"));
        return;
      }
      if (json.data?.sent === false) {
        toast.error(isKo ? "인증 메일 발송에 실패했습니다." : "Failed to send verification email.");
        return;
      }
      toast.success(isKo ? "인증 메일을 보냈습니다." : "Verification email sent.");
    } finally {
      setResending(false);
    }
  }

  async function deleteAccount() {
    if (!deleteConfirm) {
      toast.warning(isKo ? "삭제 확인에 체크해 주세요." : "Please confirm deletion.");
      return;
    }
    setDeleting(true);
    try {
      const res = await fetch("/api/my/settings/account", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          password: data?.hasPassword ? deletePassword : undefined,
          confirm: true,
        }),
      });
      const json = await res.json();
      if (!res.ok || !json.ok) {
        toast.error(json?.error?.message ?? (isKo ? "삭제 실패" : "Delete failed"));
        return;
      }
      window.location.href = `/${locale}`;
    } finally {
      setDeleting(false);
    }
  }

  if (loading || !data) {
    return (
      <NeonFullPageSpinner
        label={isKo ? "설정 불러오는 중…" : "Loading settings…"}
        portal
      />
    );
  }

  const verified = !!data.emailVerifiedAt;

  return (
      <div className="relative mx-auto max-w-2xl">
          <Link
            href="/my"
            className="mb-6 inline-flex items-center gap-2 text-[12px] dark:text-white text-gray-500 transition-colors hover:dark:text-white text-gray-900"
          >
            <ArrowLeft className="h-4 w-4" />
            {isKo ? "마이페이지" : "My hub"}
          </Link>

          <header className="mb-8">
            <p className="font-display text-xs font-medium uppercase tracking-[0.22em] dark:text-white text-gray-500">
              [ SETTINGS ]
            </p>
            <h1 className="mt-2 text-2xl font-black dark:text-white text-gray-900 sm:text-3xl">
              {isKo ? "계정 설정" : "Account settings"}
            </h1>
            <p className="mt-1 text-[11px] dark:text-white">{data.email}</p>
          </header>

          <section className={cn(glassCard, "mb-6")}>
            <h2 className="flex items-center gap-2 text-sm font-bold dark:text-white text-gray-900">
              <Mail className="h-4 w-4 text-[color:var(--qp-accent)]" />
              {isKo ? "이메일 인증" : "Email verification"}
            </h2>
            <p className="mt-2 text-xs dark:text-white text-gray-500">
              {verified
                ? isKo
                  ? "인증이 완료된 계정입니다."
                  : "Your email is verified."
                : data.isOAuthPlaceholderEmail
                  ? isKo
                    ? "소셜 로그인 계정은 별도 이메일 인증이 필요하지 않습니다."
                    : "Social login accounts do not require email verification."
                  : isKo
                    ? "이메일 인증을 완료하면 알림·견적 메일을 안정적으로 받을 수 있습니다."
                    : "Verify your email to receive notifications reliably."}
            </p>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              {verified ? (
                <span className="inline-flex items-center gap-1 rounded-lg border border-emerald-600/25 bg-emerald-500/15 px-3 py-1 text-xs font-semibold text-emerald-800 dark:border-emerald-400/30 dark:bg-emerald-500/10 dark:text-emerald-200">
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  {isKo ? "인증 완료" : "Verified"}
                </span>
              ) : data.needsEmailVerification ? (
                <>
                  <button
                    type="button"
                    onClick={() => void resendVerification()}
                    disabled={resending || refreshing}
                    className="inline-flex items-center gap-2 rounded-lg border dark:border-white/15 border-gray-200 dark:bg-white/10 bg-gray-100 px-3 py-1.5 text-xs font-semibold dark:text-white text-gray-900 hover:bg-white/15 disabled:opacity-60"
                  >
                    {resending && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                    {isKo ? "인증 메일 재발송" : "Resend verification"}
                  </button>
                  <button
                    type="button"
                    onClick={() => void refreshVerificationStatus()}
                    disabled={resending || refreshing}
                    className="inline-flex items-center gap-2 rounded-lg border dark:border-white/15 border-gray-200 dark:bg-white/10 bg-gray-100 px-3 py-1.5 text-xs font-semibold dark:text-white text-gray-900 hover:bg-white/15 disabled:opacity-60"
                  >
                    {refreshing ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <RefreshCw className="h-3.5 w-3.5" />
                    )}
                    Refresh
                  </button>
                </>
              ) : null}
            </div>
          </section>

          <form onSubmit={saveProfile} className={cn(glassCard, "mb-6 space-y-4")}>
            <h2 className="text-sm font-bold dark:text-white text-gray-900">{isKo ? "프로필" : "Profile"}</h2>
            <div>
              <label className="mb-1.5 block font-display text-xs font-medium uppercase tracking-wider dark:text-white text-gray-500">
                {isKo ? "이름" : "Name"}
              </label>
              <input className={inputCls} value={name} onChange={(e) => setName(e.target.value)} required />
            </div>
            <div>
              <label className="mb-1.5 block font-display text-xs font-medium uppercase tracking-wider dark:text-white text-gray-500">
                {isKo ? "회사명" : "Company"}
              </label>
              <input className={inputCls} value={company} onChange={(e) => setCompany(e.target.value)} />
            </div>
            <div>
              <label className="mb-1.5 block font-display text-xs font-medium uppercase tracking-wider dark:text-white text-gray-500">
                {isKo ? "연락처" : "Phone"}
              </label>
              <input className={inputCls} value={phone} onChange={(e) => setPhone(e.target.value)} />
            </div>
            <BtnBlock type="submit" variant="accent" disabled={profileSaving}>
              {profileSaving ? (isKo ? "저장 중…" : "Saving…") : isKo ? "프로필 저장" : "Save profile"}
            </BtnBlock>
          </form>

          <form onSubmit={changePassword} className={cn(glassCard, "mb-6 space-y-4")}>
            <h2 className="text-sm font-bold dark:text-white text-gray-900">
              {data.hasPassword
                ? isKo
                  ? "비밀번호 변경"
                  : "Change password"
                : isKo
                  ? "비밀번호 설정"
                  : "Set password"}
            </h2>
            {data.hasPassword && (
              <div>
                <label className="mb-1.5 block font-display text-xs font-medium uppercase tracking-wider dark:text-white text-gray-500">
                  {isKo ? "현재 비밀번호" : "Current password"}
                </label>
                <input
                  type="password"
                  className={inputCls}
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  autoComplete="current-password"
                />
              </div>
            )}
            <div>
              <label className="mb-1.5 block font-display text-xs font-medium uppercase tracking-wider dark:text-white text-gray-500">
                {isKo ? "새 비밀번호" : "New password"}
              </label>
              <input
                type="password"
                className={inputCls}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                minLength={8}
                required
                autoComplete="new-password"
              />
            </div>
            <BtnBlock type="submit" variant="accent" disabled={passwordSaving}>
              {passwordSaving
                ? isKo
                  ? "변경 중…"
                  : "Updating…"
                : isKo
                  ? "비밀번호 저장"
                  : "Save password"}
            </BtnBlock>
          </form>

          {data.linkedProviders.length > 0 && (
            <section className={cn(glassCard, "mb-6")}>
              <h2 className="text-sm font-bold dark:text-white text-gray-900">
                {isKo ? "연결된 소셜 계정" : "Linked accounts"}
              </h2>
              <ul className="mt-3 space-y-2">
                {data.linkedProviders.map((p) => (
                  <li
                    key={p}
                    className="flex items-center justify-between rounded-xl border dark:border-white/10 border-gray-200 dark:bg-black bg-white/25 px-3 py-2 text-sm dark:text-white text-gray-800"
                  >
                    <span>{PROVIDER_LABEL[p] ?? p}</span>
                    <span className="text-[10px] text-emerald-300/90">
                      {isKo ? "연결됨" : "Connected"}
                    </span>
                  </li>
                ))}
              </ul>
            </section>
          )}

          <section className={cn(glassCard, "border-red-400/20")}>
            <h2 className="flex items-center gap-2 text-sm font-bold text-red-300">
              <Trash2 className="h-4 w-4" />
              {isKo ? "계정 삭제" : "Delete account"}
            </h2>
            <p className="mt-2 text-xs dark:text-white text-gray-500">
              {isKo
                ? "삭제 후 30일 내 복구가 어려울 수 있습니다. 진행 전 데이터를 확인해 주세요."
                : "This action may be irreversible. Please back up important data."}
            </p>
            {data.hasPassword && (
              <div className="mt-3">
                <input
                  type="password"
                  className={inputCls}
                  placeholder={isKo ? "비밀번호 확인" : "Confirm password"}
                  value={deletePassword}
                  onChange={(e) => setDeletePassword(e.target.value)}
                />
              </div>
            )}
            <label className="mt-3 flex items-center gap-2 text-xs dark:text-white text-gray-600">
              <input
                type="checkbox"
                checked={deleteConfirm}
                onChange={(e) => setDeleteConfirm(e.target.checked)}
                className="rounded dark:border-white/20 border-gray-300"
              />
              {isKo ? "계정 삭제에 동의합니다" : "I understand this will delete my account"}
            </label>
            <button
              type="button"
              onClick={() => void deleteAccount()}
              disabled={deleting}
              className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-xl border border-red-400/40 bg-red-500/15 py-2.5 text-sm font-semibold text-red-200 hover:bg-red-500/25 disabled:opacity-60"
            >
              {deleting && <Loader2 className="h-4 w-4 animate-spin" />}
              {isKo ? "계정 삭제" : "Delete account"}
            </button>
          </section>
        </div>
  );
}
