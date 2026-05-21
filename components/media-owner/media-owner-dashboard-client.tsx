"use client";

import { useCallback, useEffect, useState } from "react";
import { useLocale } from "next-intl";
import { Link } from "@/i18n/navigation";
import { Building2, MessageSquare, Megaphone, Wallet } from "lucide-react";
import {
  MediaOwnerPageLoader,
  ownerGlassCard,
} from "@/components/media-owner/media-owner-shell";

type Stats = {
  mediaCount: number;
  inquiriesThisMonth: number;
  activeCampaigns: number;
  cumulativeNetWon: number;
};

export function MediaOwnerDashboardClient() {
  const locale = useLocale();
  const isKo = locale === "ko";
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const res = await fetch("/api/media-owner/dashboard", { cache: "no-store" });
    const json = await res.json();
    if (json.ok) setStats(json.data as Stats);
    setLoading(false);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  if (loading) return <MediaOwnerPageLoader />;
  if (!stats) {
    return (
      <p className={ownerGlassCard}>
        {isKo ? "데이터를 불러오지 못했습니다." : "Failed to load."}
      </p>
    );
  }

  const cards = [
    {
      icon: Building2,
      label: isKo ? "등록 매체" : "Media",
      value: stats.mediaCount,
      href: "/media-owner/media",
    },
    {
      icon: MessageSquare,
      label: isKo ? "이번 달 문의" : "Inquiries (month)",
      value: stats.inquiriesThisMonth,
      href: "/media-owner/matches",
    },
    {
      icon: Megaphone,
      label: isKo ? "진행 중 캠페인" : "Active campaigns",
      value: stats.activeCampaigns,
      href: "/media-owner/campaigns",
    },
    {
      icon: Wallet,
      label: isKo ? "누적 집행 (수수료 제외)" : "Net revenue",
      value: `${stats.cumulativeNetWon.toLocaleString(isKo ? "ko-KR" : "en-US")}원`,
      href: "/media-owner/settlements",
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold dark:text-white text-gray-900">
          {isKo ? "대시보드" : "Dashboard"}
        </h2>
        <p className="mt-1 text-sm dark:text-white text-gray-500">
          {isKo
            ? "매체 운영·문의·집행·정산을 한곳에서 관리합니다."
            : "Manage media, inquiries, campaigns, and settlements."}
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {cards.map(({ icon: Icon, label, value, href }) => (
          <Link key={label} href={href} className={ownerGlassCard}>
            <Icon className="h-5 w-5 text-violet-300" />
            <p className="mt-3 text-xs dark:text-white text-gray-400">{label}</p>
            <p className="mt-1 text-2xl font-bold tabular-nums dark:text-white text-gray-900">
              {value}
            </p>
          </Link>
        ))}
      </div>

      {stats.mediaCount === 0 ? (
        <div className={ownerGlassCard}>
          <p className="text-sm dark:text-white text-gray-600">
            {isKo
              ? "아직 연결된 매체가 없습니다. 매체 등록 신청 후 승인되면 여기에 표시됩니다."
              : "No linked media yet. Apply at register/media and wait for approval."}
          </p>
          <Link
            href="/register/media"
            className="mt-4 inline-block rounded-xl bg-violet-500 px-5 py-2 text-sm font-bold dark:text-white text-gray-900 hover:bg-violet-400"
          >
            {isKo ? "매체 등록 신청" : "Register media"}
          </Link>
        </div>
      ) : null}
    </div>
  );
}
