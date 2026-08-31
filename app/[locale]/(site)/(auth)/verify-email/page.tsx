"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { BtnBlock } from "@/components/brutalist";
import { Spinner } from "@/components/ui/spinner";
import { HomeLandingDayNight } from "@/components/home-landing-day-night";
import { CheckCircle2, XCircle } from "lucide-react";
import { authCardClass, authSubmitClass } from "@/lib/auth/auth-ui-classes";

function VerifyEmailContent() {
  const search = useSearchParams();
  const token = search.get("token");
  const [status, setStatus] = useState<"loading" | "ok" | "error">("loading");
  const [message, setMessage] = useState<string>("");

  useEffect(() => {
    if (!token) {
      setStatus("error");
      setMessage("인증 토큰이 없습니다.");
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(
          `/api/auth/verify-email?token=${encodeURIComponent(token)}`,
        );
        const data = await res.json();
        if (cancelled) return;
        if (res.ok && data.ok) {
          setStatus("ok");
          setMessage("이메일 인증이 완료되었습니다.");
        } else {
          setStatus("error");
          setMessage(
            data?.error?.message ?? "인증 링크가 유효하지 않거나 만료되었습니다.",
          );
        }
      } catch {
        if (!cancelled) {
          setStatus("error");
          setMessage("네트워크 오류가 발생했습니다.");
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [token]);

  return (
    <HomeLandingDayNight>
      <div className="tkad-landing-neon tkad-planner-neon tkad-auth-page min-h-[calc(100vh-72px)] px-4 py-10">
        <div className="mx-auto flex w-full max-w-md flex-col items-center justify-center">
          <div className={authCardClass}>
            <div className="relative text-center">
              {status === "loading" && (
                <>
                  <Spinner className="mx-auto mb-4" />
                  <p className="text-sm dark:text-white text-gray-600">이메일 인증 처리 중…</p>
                </>
              )}
              {status === "ok" && (
                <>
                  <CheckCircle2 className="mx-auto mb-4 h-12 w-12 text-emerald-400" />
                  <h1 className="text-xl font-black">인증 완료</h1>
                  <p className="mt-2 tkad-type-meta dark:text-white text-gray-600">{message}</p>
                  <BtnBlock href="/my" variant="accent" size="lg" className={`mt-6 ${authSubmitClass}`}>
                    마이페이지로 이동
                  </BtnBlock>
                </>
              )}
              {status === "error" && (
                <>
                  <XCircle className="mx-auto mb-4 h-12 w-12 text-red-400" />
                  <h1 className="text-xl font-black">인증 실패</h1>
                  <p className="mt-2 tkad-type-meta dark:text-white text-gray-600">{message}</p>
                  <BtnBlock href="/my/settings" variant="accent" size="lg" className={`mt-6 ${authSubmitClass}`}>
                    설정에서 재발송
                  </BtnBlock>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </HomeLandingDayNight>
  );
}

export default function VerifyEmailPage() {
  return (
    <Suspense fallback={null}>
      <VerifyEmailContent />
    </Suspense>
  );
}
