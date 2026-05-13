import type { Metadata } from "next";
import { setRequestLocale } from "next-intl/server";
import { resolveLocaleParam } from "@/lib/resolve-locale";
import { pageAlternates } from "@/lib/seo";
import { listCommunityMembers } from "@/lib/community/queries";
import { CommunityMemberCard } from "@/components/community/member-card";
import { HomeLandingDayNight } from "@/components/home-landing-day-night";
import { NeonSection } from "@/components/landing/neon/neon-section";
import { NeonSectionHead } from "@/components/landing/neon/neon-section-head";
import { Link } from "@/i18n/navigation";
import { ArrowLeft, Building2, MessageSquare, PenSquare, Users } from "lucide-react";

type Props = {
  params: Promise<{ locale: string }>;
};

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const locale = await resolveLocaleParam(params);
  const isKo = locale === "ko";
  const title = isKo ? "커뮤니티 멤버" : "Community Members";
  const description = isKo
    ? "싱커드 커뮤니티에서 활동 중인 광고주, 매체사, 대행사, 프리랜서 멤버를 만나보세요."
    : "Meet advertisers, media operators, agencies, and freelancers active in the THINKAD community.";
  return {
    title,
    description,
    alternates: pageAlternates(locale, "/community/members"),
    openGraph: { title, description, type: "website" },
  };
}

export default async function CommunityMembersPage({ params }: Props) {
  const locale = await resolveLocaleParam(params);
  setRequestLocale(locale);
  const isKo = locale === "ko";
  const members = await listCommunityMembers();
  const activeAuthors = members.filter((member) => member.postCount > 0).length;
  const activeDiscussants = members.filter((member) => member.commentCount > 0).length;
  const companies = new Set(members.map((member) => member.company).filter(Boolean)).size;

  return (
    <HomeLandingDayNight>
      <div className="tkad-landing-neon tkad-planner-neon">
        <NeonSection className="pb-10 pt-16 sm:pt-20 lg:pt-24">
          <Link
            href="/community"
            className="inline-flex items-center gap-2 font-mono text-[11px] font-bold uppercase tracking-[0.22em] text-white/62 transition-colors hover:text-white"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            {isKo ? "커뮤니티 홈" : "Community home"}
          </Link>

          <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1.2fr)_360px]">
            <div className="rounded-[30px] border border-white/12 bg-white/6 p-6 shadow-[0_36px_140px_rgba(0,0,0,0.72)] backdrop-blur tkad-neon-border tkad-neon-glow sm:p-8">
              <NeonSectionHead
                number="08"
                kicker="Members"
                title={
                  isKo ? (
                    <>
                      업계를 잇는
                      <span className="tkad-home-accent-text"> 멤버 디렉토리</span>
                    </>
                  ) : (
                    <>
                      The industry
                      <span className="tkad-home-accent-text"> member network</span>
                    </>
                  )
                }
                meta="community directory"
                className="mb-0"
              />
              <p className="mt-6 max-w-3xl text-[15px] leading-relaxed text-white/78 sm:text-lg">
                {isKo
                  ? "광고주, 매체사, 대행사, 프리랜서 멤버가 질문과 후기, 인사이트를 실제 프로필 기반으로 나누는 공간입니다."
                  : "Advertisers, media operators, agencies, and freelancers sharing practical learnings under real member profiles."}
              </p>
            </div>

            <div className="grid gap-4">
              {[
                {
                  icon: Users,
                  label: isKo ? "전체 멤버" : "Members",
                  value: members.length.toLocaleString(),
                },
                {
                  icon: PenSquare,
                  label: isKo ? "글 작성 멤버" : "Authors",
                  value: activeAuthors.toLocaleString(),
                },
                {
                  icon: MessageSquare,
                  label: isKo ? "댓글 활동 멤버" : "Discussants",
                  value: activeDiscussants.toLocaleString(),
                },
                {
                  icon: Building2,
                  label: isKo ? "소속 회사" : "Companies",
                  value: companies.toLocaleString(),
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
                        {item.value}
                      </p>
                    </div>
                    <item.icon className="h-5 w-5 text-white/68" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </NeonSection>

        <NeonSection className="pt-0 pb-20 sm:pb-24">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="font-mono text-[11px] font-bold uppercase tracking-[0.22em] text-white/55">
                {isKo ? "// directory" : "// directory"}
              </p>
              <h2 className="mt-2 text-2xl font-black tracking-[-0.05em] text-white sm:text-3xl">
                {isKo ? "활동 멤버" : "Active members"}
              </h2>
            </div>
            <Link
              href="/community/write"
              className="inline-flex items-center gap-2 rounded-full border border-[#8b5cf6]/55 bg-[linear-gradient(135deg,rgba(168,85,247,0.26),rgba(34,211,238,0.16))] px-5 py-3 font-mono text-[11px] font-bold uppercase tracking-[0.22em] text-white transition-colors hover:bg-white/10"
            >
              {isKo ? "글쓰기 시작" : "Start posting"}
            </Link>
          </div>

          {members.length === 0 ? (
            <div className="mt-6 rounded-[28px] border border-white/12 bg-white/6 p-12 text-center backdrop-blur tkad-neon-border">
              <p className="font-mono text-[12px] uppercase tracking-[0.22em] text-white/58">
                {isKo ? "// 아직 노출할 멤버가 없습니다." : "// no members yet"}
              </p>
            </div>
          ) : (
            <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
              {members.map((member) => (
                <CommunityMemberCard key={member.id} member={member} locale={locale} />
              ))}
            </div>
          )}
        </NeonSection>
      </div>
    </HomeLandingDayNight>
  );
}
