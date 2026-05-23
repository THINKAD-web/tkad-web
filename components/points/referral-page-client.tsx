"use client";

import { useCallback, useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { HomeLandingDayNight } from "@/components/home-landing-day-night";
import { NeonFullPageSpinner } from "@/components/ui/neon-page-spinner";
import { useAppToast } from "@/lib/use-toast";
import { Copy, Users } from "lucide-react";
import { POINT_REWARDS } from "@/lib/points-constants";

type ReferralData = {
  inviteLink: string;
  inviteCount: number;
  totalEarned: number;
};

export function ReferralPageClient() {
  const t = useTranslations("points");
  const router = useRouter();
  const toast = useAppToast();
  const [data, setData] = useState<ReferralData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/my/referral", { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => {
        if (!d.ok) {
          router.push("/login");
          return;
        }
        setData(d.data);
      })
      .finally(() => setLoading(false));
  }, [router]);

  const copyLink = useCallback(async () => {
    if (!data?.inviteLink) return;
    try {
      await navigator.clipboard.writeText(data.inviteLink);
      toast.success(t("referralCopied"));
    } catch {
      toast.error(t("referralCopyFailed"));
    }
  }, [data?.inviteLink, toast, t]);

  if (loading) {
    return (
      <HomeLandingDayNight>
        <NeonFullPageSpinner label={t("loading")} />
      </HomeLandingDayNight>
    );
  }

  return (
    <HomeLandingDayNight>
      <div className="tkad-landing-neon mx-auto max-w-lg px-4 py-10">
        <div className="tkad-glass-surface tkad-neon-border rounded-[28px] border p-6 sm:p-8">
          <p className="font-display text-xs font-medium uppercase tracking-[0.22em] text-primary">
            {t("referralEyebrow")}
          </p>
          <h1 className="mt-2 text-2xl font-black">{t("referralTitle")}</h1>
          <p className="mt-2 text-sm text-muted-foreground">{t("referralDesc")}</p>

          <div className="mt-6 rounded-2xl bg-muted/30 p-4">
            <p className="font-display text-xs font-medium uppercase text-muted-foreground">{t("referralLinkLabel")}</p>
            <p className="mt-2 break-all text-sm font-medium">{data?.inviteLink}</p>
            <button
              type="button"
              onClick={() => void copyLink()}
              className="mt-3 inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2 font-display text-xs font-medium uppercase text-primary-foreground"
            >
              <Copy className="h-4 w-4" />
              {t("referralCopy")}
            </button>
          </div>

          <div className="mt-6 grid grid-cols-2 gap-3">
            <div className="rounded-2xl border border-border/50 p-4 text-center">
              <Users className="mx-auto h-5 w-5 text-primary" />
              <p className="mt-2 text-2xl font-black tabular-nums">{data?.inviteCount ?? 0}</p>
              <p className="font-display text-xs font-medium uppercase text-muted-foreground">{t("referralCount")}</p>
            </div>
            <div className="rounded-2xl border border-border/50 p-4 text-center">
              <p className="mt-2 text-2xl font-black tabular-nums text-primary">
                {(data?.totalEarned ?? 0).toLocaleString()}P
              </p>
              <p className="font-display text-xs font-medium uppercase text-muted-foreground">{t("referralEarned")}</p>
            </div>
          </div>

          <ul className="mt-6 space-y-2 text-sm text-muted-foreground">
            <li>{t("referralRule1", { pts: POINT_REWARDS.REFERRAL.toLocaleString() })}</li>
            <li>{t("referralRule2", { pts: POINT_REWARDS.SIGNUP.toLocaleString() })}</li>
          </ul>
        </div>
      </div>
    </HomeLandingDayNight>
  );
}
