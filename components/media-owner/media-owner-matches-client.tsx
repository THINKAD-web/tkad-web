"use client";

import { useCallback, useEffect, useState } from "react";
import { useLocale } from "next-intl";
import { Link } from "@/i18n/navigation";
import { Bell, Clock, Star } from "lucide-react";
import {
  MediaOwnerPageLoader,
  ownerGlassCard,
} from "@/components/media-owner/media-owner-shell";

type MatchItem = {
  id: string;
  status: string;
  media: { id: string; name: string; type: string; region: string };
  openBid: {
    id: string;
    mode: string;
    status: string;
    summaryKo: string;
    regionLabel: string | null;
    budgetMin: number | null;
    budgetMax: number | null;
    periodLabel: string | null;
    industryAnonymized: string | null;
    daysLeft: number;
  };
};

type Profile = {
  tierLabel: string;
  avgRating: number | null;
  reviewCount: number;
  avgResponseLabel: string;
  registrationFeeWaived: boolean;
};

const STATUS_KO: Record<string, string> = {
  NOTIFY: "새 문의",
  INTERESTED: "관심 표명",
  SUBMITTED: "견적 제출됨",
  APPROVED: "싱크드 검토 완료",
  SELECTED: "선택됨",
  REJECTED: "미선택",
};

export function MediaOwnerMatchesClient() {
  const locale = useLocale();
  const isKo = locale === "ko";
  const [items, setItems] = useState<MatchItem[]>([]);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const [mRes, pRes] = await Promise.all([
      fetch("/api/media-owner/matches", { cache: "no-store" }),
      fetch("/api/media-owner/profile", { cache: "no-store" }),
    ]);
    const mJson = await mRes.json();
    const pJson = await pRes.json();
    if (mJson.ok) setItems(mJson.data.items as MatchItem[]);
    if (pJson.ok) setProfile(pJson.data as Profile);
    setLoading(false);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  if (loading) return <MediaOwnerPageLoader />;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-white">
          {isKo ? "매칭·비딩" : "Matches & bids"}
        </h2>
        <p className="mt-1 text-sm text-white/60">
          {isKo
            ? "조건에 맞는 광고주 문의에 응답하고 견적을 제출하세요."
            : "Respond to advertiser inquiries and submit quotes."}
        </p>
      </div>

      {profile ? (
        <div className={`${ownerGlassCard} flex flex-wrap gap-4 text-sm text-white/80`}>
          <span className="inline-flex items-center gap-1">
            <Star className="h-4 w-4 text-amber-300" />
            {profile.avgRating != null
              ? `⭐ ${profile.avgRating} (${profile.reviewCount}${isKo ? "건" : ""})`
              : isKo
                ? "아직 평가 없음"
                : "No reviews yet"}
          </span>
          <span>{isKo ? "등급" : "Tier"}: {profile.tierLabel}</span>
          <span>
            {isKo ? "응답 평균" : "Avg response"}: {profile.avgResponseLabel}
          </span>
          {profile.registrationFeeWaived ? (
            <span className="text-emerald-300">
              {isKo ? "등록비 면제 적용" : "Registration fee waived"}
            </span>
          ) : null}
        </div>
      ) : null}

      {items.length === 0 ? (
        <p className={ownerGlassCard}>
          {isKo ? "현재 매칭된 문의가 없습니다." : "No matched inquiries yet."}
        </p>
      ) : (
        <ul className="space-y-3">
          {items.map((item) => (
            <li key={item.id}>
              <Link href={`/media-owner/matches/${item.id}`} className={ownerGlassCard}>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-violet-300">
                      <Bell className="h-3.5 w-3.5" />
                      {item.openBid.mode === "OPEN_BID"
                        ? isKo
                          ? "오픈 비딩"
                          : "Open bid"
                        : isKo
                          ? "매칭 문의"
                          : "Match inquiry"}
                    </p>
                    <p className="mt-2 font-semibold text-white">
                      {item.openBid.summaryKo}
                    </p>
                    <p className="mt-1 text-xs text-white/50">
                      {item.media.name} · {STATUS_KO[item.status] ?? item.status}
                    </p>
                  </div>
                  <div className="shrink-0 text-right text-xs text-white/50">
                    <Clock className="mx-auto h-4 w-4" />
                    <p className="mt-1">D-{item.openBid.daysLeft}</p>
                  </div>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
