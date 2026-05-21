"use client";

import { Link } from "@/i18n/navigation";
import { Lock, Sparkles } from "lucide-react";
import type { AccessCheckResult, ReportFeature } from "@/lib/report-access-shared";
import { featureLabel } from "@/lib/report-access-shared";

type Props = {
  access: AccessCheckResult;
  feature: ReportFeature;
  isKo: boolean;
  children: React.ReactNode;
  /** When true, show content blurred behind overlay */
  gated?: boolean;
  className?: string;
};

export function ReportAccessGate({
  access,
  feature,
  isKo,
  children,
  gated = true,
  className = "",
}: Props) {
  if (access.allowed) {
    return <div className={className}>{children}</div>;
  }

  const title = featureLabel(feature, isKo);
  const isLogin = access.reason === "login";
  const isEnterprise = access.reason === "enterprise";

  return (
    <div className={`relative ${className}`}>
      <div
        className={
          gated
            ? "pointer-events-none select-none blur-sm brightness-75"
            : "opacity-40"
        }
        aria-hidden={gated}
      >
        {children}
      </div>
      <div className="absolute inset-0 flex items-center justify-center rounded-2xl dark:bg-black bg-white bg-white/45 backdrop-blur-[2px]">
        <div className="mx-4 max-w-sm rounded-2xl border dark:border-white/14 border-gray-200 dark:bg-black bg-white bg-white/70 px-6 py-8 text-center shadow-xl">
          <Lock className="mx-auto h-8 w-8 text-cyan-300/90" aria-hidden />
          <p className="mt-3 font-mono text-[10px] font-bold uppercase tracking-[0.2em] dark:text-white text-gray-400">
            {isEnterprise ? "ENTERPRISE" : "PRO"}
          </p>
          <h3 className="mt-2 text-base font-black dark:text-white text-gray-900">{title}</h3>
          <p className="mt-2 text-sm dark:text-white">
            {isLogin
              ? isKo
                ? "로그인 후 기본 데이터를 확인할 수 있습니다."
                : "Sign in to view basic data."
              : isEnterprise
                ? isKo
                  ? "엔터프라이즈 플랜에서 이용 가능합니다."
                  : "Available on Enterprise plan."
                : isKo
                  ? "PRO 플랜에서 이용 가능합니다."
                  : "Available on PRO plan."}
          </p>
          {access.trialDaysLeft != null && access.trialDaysLeft > 0 ? (
            <p className="mt-2 text-xs font-semibold text-cyan-200">
              {isKo
                ? `PRO 체험 ${access.trialDaysLeft}일 남음`
                : `${access.trialDaysLeft} days left in PRO trial`}
            </p>
          ) : null}
          <div className="mt-5 flex flex-col gap-2 sm:flex-row sm:justify-center">
            {isLogin ? (
              <Link
                href="/login"
                className="tkad-neon-cta-clean inline-flex h-10 items-center justify-center rounded-xl px-5 text-sm font-bold dark:text-white text-gray-900"
              >
                {isKo ? "로그인" : "Sign in"}
              </Link>
            ) : (
              <>
                <Link
                  href="/pricing"
                  className="tkad-neon-cta-clean inline-flex h-10 items-center justify-center gap-1.5 rounded-xl px-5 text-sm font-bold dark:text-white text-gray-900"
                >
                  <Sparkles className="h-4 w-4" aria-hidden />
                  {isKo ? "플랜 보기" : "View plans"}
                </Link>
                {!isEnterprise ? (
                  <Link
                    href="/pricing?trial=1"
                    className="inline-flex h-10 items-center justify-center rounded-xl border dark:border-white/14 border-gray-200 px-5 text-sm font-bold dark:text-white text-gray-900 hover:dark:bg-white/10 bg-gray-100"
                  >
                    {isKo ? "무료 체험 시작" : "Start free trial"}
                  </Link>
                ) : null}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
