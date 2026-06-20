"use client";

import type { AccessCheckResult, ReportFeature } from "@/lib/report-access-shared";
import { buildFeatureGateMessage } from "@/lib/entitlements/gate-messages";
import {
  TierGateOverlay,
  TierGatePanel,
} from "@/components/entitlements/tier-gate-panel";

type Props = {
  access: AccessCheckResult;
  feature: ReportFeature;
  isKo: boolean;
  children: React.ReactNode;
  /** When true, show content blurred behind overlay */
  gated?: boolean;
  className?: string;
  /** 권한 API 로딩 중 — 거부 오버레이·블러 억제 */
  loading?: boolean;
};

export function ReportAccessGate({
  access,
  feature,
  isKo,
  children,
  gated = true,
  className = "",
  loading = false,
}: Props) {
  if (loading) {
    return (
      <div
        className={`relative ${className}`}
        aria-busy="true"
        aria-label={isKo ? "접근 권한 확인 중" : "Checking access"}
      >
        <div className="min-h-[12rem] animate-pulse rounded-2xl border border-gray-100 bg-gray-100/80 dark:border-white/8 dark:bg-white/5" />
      </div>
    );
  }

  if (access.allowed) {
    return <div className={className}>{children}</div>;
  }

  const message = buildFeatureGateMessage({ feature, access, isKo });
  const trialHint =
    access.trialDaysLeft != null && access.trialDaysLeft > 0
      ? isKo
        ? `${message.hint ? `${message.hint} · ` : ""}PRO 체험 ${access.trialDaysLeft}일 남음`
        : `${message.hint ? `${message.hint} · ` : ""}${access.trialDaysLeft} days left in PRO trial`
      : message.hint;
  const panelMessage = trialHint !== message.hint ? { ...message, hint: trialHint } : message;

  if (!gated) {
    return (
      <div className={`relative ${className}`}>
        <div className="opacity-40" aria-hidden>
          {children}
        </div>
        <div className="mt-4">
          <TierGatePanel message={panelMessage} />
        </div>
      </div>
    );
  }

  return (
    <TierGateOverlay message={panelMessage} className={className}>
      {children}
    </TierGateOverlay>
  );
}
