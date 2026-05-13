import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Link } from "@/i18n/navigation";
import { setRequestLocale } from "next-intl/server";
import { resolveLocaleParam } from "@/lib/resolve-locale";
import { pageAlternates } from "@/lib/seo";
import { getCommunityMemberProfile } from "@/lib/community/queries";
import { CommunityRoleBadge } from "@/components/community/role-badge";
import { CommunityPostCard } from "@/components/community/post-card";
import {
  ArrowLeft,
  Building2,
  MessageSquare,
  PenSquare,
  Sparkles,
  Users,
} from "lucide-react";
import { HomeLandingDayNight } from "@/components/home-landing-day-night";
import { NeonSection } from "@/components/landing/neon/neon-section";
import { NeonSectionHead } from "@/components/landing/neon/neon-section-head";

type Props = {
  params: Promise<{ locale: string; id: string }>;
};

export const dynamic = "force-dynamic";

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
  const profile = await getCommunityMemberProfile(id);
  if (!profile) notFound();

  return (
    <HomeLandingDayNight>
      <div className="tkad-landing-neon tkad-planner-neon">
        <NeonSection className="pb-10 pt-16 sm:pt-20 lg:pt-24">
          <Link
            href="/community/members"
            className="inline-flex items-center gap-2 font-mono text-[11px] font-bold uppercase tracking-[0.22em] text-white/62 transition-colors hover:text-white"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            {isKo ? "멤버 목록" : "Members"}
          </Link>

          <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1.15fr)_360px]">
            <div className="rounded-[30px] border border-white/12 bg-white/6 p-6 shadow-[0_36px_140px_rgba(0,0,0,0.72)] backdrop-blur tkad-neon-border tkad-neon-glow sm:p-8">
              <NeonSectionHead
                number="09"
                kicker="Profile"
                title={
                  <>
                    {profile.member.name}
                    <span className="tkad-home-accent-text">
                      {isKo ? " 멤버 프로필" : " profile"}
                    </span>
                  </>
                }
                meta="community identity"
                className="mb-0"
              />

              <div className="mt-6 flex flex-wrap items-center gap-3">
                <CommunityRoleBadge role={profile.member.role} locale={locale} />
                {profile.member.company ? (
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-white/12 bg-white/6 px-4 py-2 font-mono text-[11px] uppercase tracking-[0.18em] text-white/68">
                    <Building2 className="h-3.5 w-3.5" />
                    {profile.member.company}
                  </span>
                ) : null}
              </div>

              <p className="mt-6 whitespace-pre-wrap text-[15px] leading-relaxed text-white/76 sm:text-lg">
                {profile.member.bio ??
                  (isKo
                    ? "아직 자기소개가 등록되지 않았습니다."
                    : "This member has not added a bio yet.")}
              </p>
            </div>

            <div className="grid gap-4">
              {[
                {
                  icon: PenSquare,
                  label: isKo ? "작성 글" : "Posts",
                  value: profile.member.postCount,
                },
                {
                  icon: MessageSquare,
                  label: isKo ? "댓글" : "Comments",
                  value: profile.member.commentCount,
                },
                {
                  icon: Users,
                  label: isKo ? "멤버 상태" : "Status",
                  value: isKo ? "활동 중" : "Active",
                },
              ].map((item) => (
                <div
                  key={item.label}
                  className="rounded-[24px] border border-white/12 bg-white/6 p-5 backdrop-blur tkad-neon-border"
                >
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="font-mono text-[11px] font-bold uppercase tracking-[0.22em] text-white/55">
                        {item.label}
                      </p>
                      <p className="mt-2 font-display text-2xl font-black tracking-tight text-white">
                        {typeof item.value === "number"
                          ? item.value.toLocaleString()
                          : item.value}
                      </p>
                    </div>
                    <item.icon className="h-5 w-5 text-white/68" />
                  </div>
                </div>
              ))}

              <div className="rounded-[28px] border border-white/12 bg-[linear-gradient(135deg,rgba(168,85,247,0.12),rgba(34,211,238,0.08),rgba(255,255,255,0.04))] p-5 backdrop-blur tkad-neon-border">
                <div className="flex items-start gap-3">
                  <Sparkles className="mt-0.5 h-5 w-5 text-white/72" />
                  <p className="text-sm leading-relaxed text-white/72">
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
              <p className="font-mono text-[11px] font-bold uppercase tracking-[0.22em] text-white/55">
                [ POSTS ]
              </p>
              <h2 className="mt-2 text-2xl font-black tracking-[-0.05em] text-white sm:text-3xl">
                {isKo ? "최근 작성 글" : "Recent posts"}
              </h2>
            </div>
          </div>

          {profile.recentPosts.length === 0 ? (
            <div className="mt-6 rounded-[28px] border border-white/12 bg-white/6 p-10 text-center backdrop-blur tkad-neon-border">
              <p className="font-mono text-[12px] uppercase tracking-[0.22em] text-white/58">
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
