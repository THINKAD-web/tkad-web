"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useLocale } from "next-intl";
import { useRouter, Link } from "@/i18n/navigation";
import { Users } from "lucide-react";
import { HomeLandingDayNight } from "@/components/home-landing-day-night";
import { useAuthSession } from "@/components/auth/auth-session-provider";
import { FullPageSpinner, Spinner } from "@/components/ui/spinner";
import { withSearchParamsSuspense } from "@/components/with-search-params-suspense";

const gradientBtn =
  "inline-flex items-center justify-center rounded-xl bg-gradient-to-r from-violet-500 to-cyan-400 px-6 py-3 text-sm font-semibold dark:text-white text-gray-900 shadow-[0_8px_28px_rgba(124,58,237,0.35)] transition-opacity hover:opacity-95 disabled:opacity-50";

function JoinTeamClientInner() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const locale = useLocale();
  const isKo = locale === "ko";
  const token = searchParams.get("token")?.trim() ?? "";
  const { user } = useAuthSession();

  const [loading, setLoading] = useState(true);
  const [accepting, setAccepting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState<{
    teamName: string;
    email: string;
    roleLabel: { ko: string; en: string };
  } | null>(null);
  const [done, setDone] = useState<{ teamName: string } | null>(null);

  useEffect(() => {
    if (!token) {
      setError(isKo ? "초대 토큰이 없습니다." : "Missing invite token.");
      setLoading(false);
      return;
    }
    let cancelled = false;
    (async () => {
      const res = await fetch(
        `/api/team/join?token=${encodeURIComponent(token)}`,
        { cache: "no-store" },
      );
      const data = await res.json();
      if (cancelled) return;
      if (!data?.ok) {
        setError(data?.message ?? (isKo ? "유효하지 않은 초대입니다." : "Invalid invite."));
        setLoading(false);
        return;
      }
      setPreview({
        teamName: data.data.teamName,
        email: data.data.email,
        roleLabel: data.data.roleLabel,
      });
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [token, isKo]);

  async function accept() {
    if (!token) return;
    setAccepting(true);
    setError(null);
    try {
      if (!user) {
        router.push(`/login?redirect=${encodeURIComponent(`/join?token=${token}`)}`);
        return;
      }
      const res = await fetch("/api/team/join", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token }),
      });
      const data = await res.json();
      if (data?.ok) {
        setDone({ teamName: data.data.teamName });
      } else {
        setError(data?.message ?? (isKo ? "수락에 실패했습니다." : "Could not accept."));
      }
    } finally {
      setAccepting(false);
    }
  }

  if (loading) {
    return (
      <HomeLandingDayNight>
        <FullPageSpinner label={isKo ? "초대 확인 중…" : "Verifying invite…"} />
      </HomeLandingDayNight>
    );
  }

  return (
    <HomeLandingDayNight>
      <div className="tkad-landing-neon mx-auto flex min-h-[60vh] max-w-lg flex-col items-center justify-center px-4 py-16 text-center">
        <Users className="mb-4 h-12 w-12 text-cyan-300" aria-hidden />
        {done ? (
          <>
            <h1 className="text-2xl font-black dark:text-white text-gray-900">
              {isKo ? "팀에 합류했습니다" : "You joined the team"}
            </h1>
            <p className="mt-3 dark:text-white text-gray-600">{done.teamName}</p>
            <Link href="/my/team" className={`${gradientBtn} mt-8`}>
              {isKo ? "팀 관리로 이동" : "Go to team settings"}
            </Link>
          </>
        ) : error ? (
          <>
            <h1 className="text-xl font-bold dark:text-white text-gray-900">
              {isKo ? "초대를 처리할 수 없습니다" : "Invite unavailable"}
            </h1>
            <p className="mt-3 text-sm text-red-300">{error}</p>
            <Link href="/" className={`${gradientBtn} mt-8`}>
              {isKo ? "홈으로" : "Home"}
            </Link>
          </>
        ) : preview ? (
          <>
            <h1 className="text-2xl font-black dark:text-white text-gray-900">
              {isKo ? "팀 초대" : "Team invitation"}
            </h1>
            <p className="mt-3 dark:text-white text-gray-700">
              {isKo
                ? `${preview.teamName} 팀에 ${preview.roleLabel.ko}(으)로 초대되었습니다.`
                : `You are invited to "${preview.teamName}" as ${preview.roleLabel.en}.`}
            </p>
            <p className="mt-2 text-xs dark:text-white">{preview.email}</p>
            <button
              type="button"
              onClick={() => void accept()}
              disabled={accepting}
              className={`${gradientBtn} mt-8`}
            >
              {accepting ? (
                <Spinner size="sm" label={isKo ? "처리 중…" : "Joining…"} />
              ) : isKo ? (
                "초대 수락"
              ) : (
                "Accept invitation"
              )}
            </button>
          </>
        ) : null}
      </div>
    </HomeLandingDayNight>
  );
}

export const JoinTeamClient = withSearchParamsSuspense(JoinTeamClientInner);
