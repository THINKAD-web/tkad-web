import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Link } from "@/i18n/navigation";
import { setRequestLocale } from "next-intl/server";
import { resolveLocaleParam } from "@/lib/resolve-locale";
import { pageAlternates } from "@/lib/seo";
import { getCommunityMemberProfile } from "@/lib/community/queries";
import { getCurrentUser } from "@/lib/user-session";
import { RoleBadge } from "@/components/community/role-badge";
import { CommunityPostCard } from "@/components/community/post-card";
import { CommunityProfileEditForm } from "@/components/community/profile-edit-form";
import {
  ArrowLeft,
  Building2,
  Calendar,
  Heart,
  MessageSquare,
  PenSquare,
  Sparkles,
} from "lucide-react";
import { HomeLandingDayNight } from "@/components/home-landing-day-night";
import { NeonSection } from "@/components/landing/neon/neon-section";
import { NeonSectionHead } from "@/components/landing/neon/neon-section-head";

type Props = {
  params: Promise<{ locale: string; id: string }>;
};

export const dynamic = "force-dynamic";

function fmtJoin(iso: string, locale: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString(locale === "ko" ? "ko-KR" : "en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale: rawLocale, id } = await params;
  const locale = await resolveLocaleParam(Promise.resolve({ locale: rawLocale }));
  const profile = await getCommunityMemberProfile(id);
  if (!profile) return { title: locale === "ko" ? "멤버 없음" : "Not found" };
  const title =
    locale === "ko"
      ? `${profile.member.name} 멤버 프로필`
      : `${profile.member.name} Profile`;
  const description =
    profile.member.bio ??
    (locale === "ko"
      ? "싱커드 커뮤니티 멤버 프로필"
      : "THINKAD community member profile");
  return {
    title,
    description,
    alternates: pageAlternates(locale, `/community/profile/${id}`),
    openGraph: { title, description, type: "website" },
  };
}

export default async function CommunityProfilePage({ params }: Props) {
  const { locale: rawLocale, id } = await params;
  const locale = await resolveLocaleParam(Promise.resolve({ locale: rawLocale }));
  setRequestLocale(locale);
  const isKo = locale === "ko";
  const [profile, me] = await Promise.all([getCommunityMemberProfile(id), getCurrentUser()]);
  if (!profile) notFound();

  const isOwn = me?.id === id;

  return (
    <HomeLandingDayNight>
      <div className="tkad-landing-neon tkad-planner-neon">
        <NeonSection className="pb-10 pt-16 sm:pt-20 lg:pt-24">
          <Link
            href="/community/members"
            className="inline-flex items-center gap-2 font-mono text-[11px] font-bold uppercase tracking-[0.22em] dark:text-white transition-colors hover:dark:text-white text-gray-900"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            {isKo ? "멤버 목록" : "Members"}
          </Link>

          <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1.15fr)_360px]">
            <div className="rounded-[30px] border dark:border-white/12 border-gray-200 dark:bg-white/6 bg-gray-50 p-6 shadow-[0_36px_140px_rgba(0,0,0,0.72)] backdrop-blur tkad-neon-border tkad-neon-glow sm:p-8">
              <NeonSectionHead
                number="09"
                kicker="Profile"
                title={isKo ? "멤버 프로필" : "Member profile"}
                meta="community identity"
                className="mb-0"
              />

              <div className="mt-6 flex flex-wrap items-center gap-3">
                <h1 className="text-2xl font-black tracking-[-0.04em] dark:text-white text-gray-900 sm:text-3xl">
                  {profile.member.name}
                </h1>
                <RoleBadge role={profile.member.role} locale={locale} />
                {profile.member.company ? (
                  <span className="inline-flex items-center gap-1.5 rounded-full border dark:border-white/12 border-gray-200 dark:bg-white/6 bg-gray-50 px-4 py-2 font-mono text-[11px] uppercase tracking-[0.18em] dark:text-white">
                    <Building2 className="h-3.5 w-3.5" />
                    {profile.member.company}
                  </span>
                ) : null}
              </div>

              {profile.member.region ? (
                <p className="mt-3 font-mono text-[11px] uppercase tracking-[0.18em] dark:text-white">
                  {isKo ? "지역" : "Region"} · {profile.member.region}
                </p>
              ) : null}

              <p className="mt-6 whitespace-pre-wrap text-[15px] leading-relaxed dark:text-white sm:text-lg">
                {profile.member.bio ??
                  (isKo
                    ? "아직 자기소개가 등록되지 않았습니다."
                    : "This member has not added a bio yet.")}
              </p>

              {isOwn ? (
                <CommunityProfileEditForm
                  userId={id}
                  locale={locale}
                  initialName={profile.member.name}
                  initialCompany={profile.member.company ?? ""}
                  initialBio={profile.member.bio ?? ""}
                  initialRegion={profile.member.region ?? ""}
                />
              ) : null}
            </div>

            <div className="grid gap-4">
              {[
                {
                  icon: Calendar,
                  label: isKo ? "가입일" : "Joined",
                  value: fmtJoin(profile.member.joinedAt, locale),
                },
                {
                  icon: PenSquare,
                  label: isKo ? "작성 글" : "Posts",
                  value: profile.member.postCount.toLocaleString(),
                },
                {
                  icon: Heart,
                  label: isKo ? "받은 좋아요" : "Likes received",
                  value: profile.member.likesReceived.toLocaleString(),
                },
                {
                  icon: MessageSquare,
                  label: isKo ? "댓글" : "Comments",
                  value: profile.member.commentCount.toLocaleString(),
                },
              ].map((item) => (
                <div
                  key={item.label}
                  className="rounded-[24px] border dark:border-white/12 border-gray-200 dark:bg-white/6 bg-gray-50 p-5 backdrop-blur tkad-neon-border"
                >
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="font-mono text-[11px] font-bold uppercase tracking-[0.22em] dark:text-white text-gray-500">
                        {item.label}
                      </p>
                      <p className="mt-2 font-display text-2xl font-black tracking-tight dark:text-white text-gray-900">
                        {item.value}
                      </p>
                    </div>
                    <item.icon className="h-5 w-5 dark:text-white" />
                  </div>
                </div>
              ))}

              <div className="rounded-[28px] border dark:border-white/12 border-gray-200 bg-[linear-gradient(135deg,rgba(168,85,247,0.12),rgba(34,211,238,0.08),rgba(255,255,255,0.04))] p-5 backdrop-blur tkad-neon-border">
                <div className="flex items-start gap-3">
                  <Sparkles className="mt-0.5 h-5 w-5 dark:text-white" />
                  <p className="text-sm leading-relaxed dark:text-white">
                    {isKo
                      ? "최근 작성 글과 댓글 활동은 업계 관점과 관심사를 파악하는 좋은 단서가 됩니다."
                      : "Recent posts and replies give a quick read on this member’s perspective and focus areas."}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </NeonSection>

        <NeonSection className="pt-0 pb-20 sm:pb-24">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="font-mono text-[11px] font-bold uppercase tracking-[0.22em] dark:text-white text-gray-500">
                [ POSTS ]
              </p>
              <h2 className="mt-2 text-2xl font-black tracking-[-0.05em] dark:text-white text-gray-900 sm:text-3xl">
                {isKo ? "최근 작성 글" : "Recent posts"}
              </h2>
            </div>
          </div>

          {profile.recentPosts.length === 0 ? (
            <div className="mt-6 rounded-[28px] border dark:border-white/12 border-gray-200 dark:bg-white/6 bg-gray-50 p-10 text-center backdrop-blur tkad-neon-border">
              <p className="font-mono text-[12px] uppercase tracking-[0.22em] dark:text-white">
                {isKo ? "// 아직 공개 글이 없습니다." : "// no public posts yet"}
              </p>
            </div>
          ) : (
            <div className="mt-6 grid grid-cols-1 gap-4">
              {profile.recentPosts.map((post) => (
                <CommunityPostCard
                  key={post.id}
                  post={post}
                  locale={locale}
                  variant="community"
                />
              ))}
            </div>
          )}
        </NeonSection>
      </div>
    </HomeLandingDayNight>
  );
}
