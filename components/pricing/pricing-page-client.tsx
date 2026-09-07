"use client";

import { useMemo } from "react";
import { getPricingGuestFootnote } from "@/lib/entitlements/pricing-plans";
import { ProUpgradePanel } from "@/components/pricing/pro-upgrade-panel";
import { useIsPro } from "@/hooks/use-is-pro";

type Props = {
  isKo: boolean;
  loggedIn: boolean;
  userName?: string;
  userEmail?: string;
};

export function PricingPageClient({
  isKo,
  loggedIn,
  userName = "",
  userEmail = "",
}: Props) {
  const { isPro, refresh } = useIsPro();
  const guestFootnote = useMemo(() => getPricingGuestFootnote(isKo), [isKo]);

  return (
    <div className="space-y-8">
      <p className="text-center text-xs leading-relaxed text-gray-500 dark:text-white/50">
        {guestFootnote}
      </p>

      <ProUpgradePanel
        isKo={isKo}
        loggedIn={loggedIn}
        userName={userName}
        userEmail={userEmail}
        isPro={isPro}
        onPlanChange={() => void refresh()}
      />
    </div>
  );
}
