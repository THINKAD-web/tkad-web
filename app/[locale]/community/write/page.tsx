import type { Metadata } from "next";
import { Link } from "@/i18n/navigation";
import { setRequestLocale } from "next-intl/server";
import { resolveLocaleParam } from "@/lib/resolve-locale";
import { pageAlternates } from "@/lib/seo";
import { getCurrentUser } from "@/lib/user-session";
import { ArrowLeft, Shield, Sparkles, Users } from "lucide-react";
import { CommunityWriteForm } from "@/components/community/write-form";
import { CommunityMemberRequiredPanel } from "@/components/community/member-required-panel";
import { HomeLandingDayNight } from "@/components/home-landing-day-night";
import { NeonSection } from "@/components/landing/neon/neon-section";
import { NeonSectionHead } from "@/components/landing/neon/neon-section-head";

type Props = { params: Promise<{ locale: string }> };

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const locale = await resolveLocaleParam(params);
  const isKo = locale === "ko";
  const title = isKo ? "글쓰기 — 광고 커뮤니티" : "Write — Community";
  const description = isKo
    ? "OOH 업계 질문, 후기, 인사이트를 작성해주세요. 로그인한 멤버만 글을 작성할 수 있습니다."
    : "Write a community post for the OOH industry. Posting is available to signed-in members.";
  return {
    title,
    description,
    alternates: pageAlternates(locale, "/community/write"),
    // 작성 폼은 인덱싱 X
    robots: { index: false, follow: false },
  };
}

export default async function CommunityWritePage({ params }: Props) {
  const locale = await resolveLocaleParam(params);
  setRequestLocale(locale);
  const isKo = locale === "ko";
  const me = await getCurrentUser();

  return (
    <HomeLandingDayNight>
      <div className="tkad-landing-neon tkad-planner-neon">
        <NeonSection className="pb-10 pt-16 sm:pt-20 lg:pt-24">
          <Link
            href="/community"
            className="inline-flex items-center gap-2 font-mono text-[11px] font-bold uppercase tracking-[0.22em] dark:text-white transition-colors hover:dark:text-white text-gray-900"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            {isKo ? "커뮤니티 목록" : "Community list"}
          </Link>

          <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1.2fr)_360px]">
            <div className="rounded-[30px] border dark:border-white/12 border-gray-200 dark:bg-white/6 bg-gray-50 p-6 shadow-[0_36px_140px_rgba(0,0,0,0.72)] backdrop-blur tkad-neon-border tkad-neon-glow sm:p-8">
              <NeonSectionHead
                number="07"
                kicker="Write"
                title={
                  isKo ? (
                    <>
                      멤버 프로필로 남기는
                      <span className="tkad-home-accent-text"> 인사이트</span>
                    </>
                  ) : (
                    <>
                      Post your next
                      <span className="tkad-home-accent-text"> insight</span>
                    </>
                  )
                }
                meta="members-first authoring"
                className="mb-0"
              />
              <p className="mt-6 max-w-3xl text-[15px] leading-relaxed dark:text-white text-gray-700 sm:text-lg">
                {isKo
                  ? "질문, 캠페인 회고, 협업 제안, 실무 인사이트를 멤버 프로필과 함께 남길 수 있습니다. 익명 대신 신뢰 가능한 업계 맥락을 중심으로 운영됩니다."
                  : "Share questions, campaign retros, partner requests, and practical insights under your verified member profile."}
              </p>
              <div className="mt-8 flex flex-wrap gap-3">
                <Link
                  href="/community/policy"
                  className="inline-flex items-center gap-2 rounded-full border dark:border-white/14 border-gray-200 dark:bg-white/6 bg-gray-50 px-5 py-3 font-mono text-[11px] font-bold uppercase tracking-[0.22em] dark:text-white text-gray-900 transition-colors hover:dark:bg-white/10 bg-gray-100"
                >
                  <Shield className="h-3.5 w-3.5" />
                  {isKo ? "운영 정책 보기" : "Read policy"}
                </Link>
                <Link
                  href="/community/members"
                  className="inline-flex items-center gap-2 rounded-full border dark:border-white/14 border-gray-200 dark:bg-black bg-white bg-white/20 px-5 py-3 font-mono text-[11px] font-bold uppercase tracking-[0.22em] dark:text-white text-gray-700 transition-colors hover:dark:bg-white/10 bg-gray-100 hover:dark:text-white text-gray-900"
                >
                  <Users className="h-3.5 w-3.5" />
                  {isKo ? "활동 멤버 보기" : "Browse members"}
                </Link>
              </div>
            </div>

            <div className="grid gap-4">
              <div className="rounded-[28px] border dark:border-white/12 border-gray-200 dark:bg-white/6 bg-gray-50 p-5 backdrop-blur tkad-neon-border">
                <p className="font-mono text-[11px] font-bold uppercase tracking-[0.22em] dark:text-white text-gray-500">
                  {isKo ? "// 작성 기준" : "// posting rules"}
                </p>
                <div className="mt-4 space-y-3 text-sm leading-relaxed dark:text-white">
                  <p>{isKo ? "실무에 도움이 되는 맥락과 숫자를 함께 적어주세요." : "Include useful context and concrete takeaways whenever possible."}</p>
                  <p>{isKo ? "광고, 도배, 개인정보 노출은 즉시 숨김 처리될 수 있습니다." : "Spam, self-promotion, or personal data exposure may be hidden immediately."}</p>
                  <p>{isKo ? "댓글과 반응은 모두 로그인한 멤버 기준으로 연결됩니다." : "Comments and reactions are tied to signed-in member identities."}</p>
                </div>
              </div>
              <div className="rounded-[28px] border dark:border-white/12 border-gray-200 bg-[linear-gradient(135deg,rgba(168,85,247,0.12),rgba(34,211,238,0.08),rgba(255,255,255,0.04))] p-5 backdrop-blur tkad-neon-border">
                <div className="flex items-start gap-3">
                  <Sparkles className="mt-0.5 h-5 w-5 dark:text-white" />
                  <div>
                    <p className="font-mono text-[11px] font-bold uppercase tracking-[0.22em] dark:text-white text-gray-500">
                      {isKo ? "// 추천 주제" : "// strong post angles"}
                    </p>
                    <p className="mt-2 text-sm leading-relaxed dark:text-white">
                      {isKo
                        ? "최근 집행 후기, 매체 운영 팁, 파트너 탐색, 지역별 반응 비교 같은 글이 잘 읽힙니다."
                        : "Recent campaign retros, media ops tips, partner requests, and local market comparisons are strong community topics."}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </NeonSection>

        <NeonSection className="pt-0 pb-20 sm:pb-24">
          <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
            <div className="rounded-[30px] border dark:border-white/12 border-gray-200 dark:bg-white/6 bg-gray-50 p-6 shadow-[0_36px_140px_rgba(0,0,0,0.72)] backdrop-blur tkad-neon-border sm:p-8">
              {me ? (
                <CommunityWriteForm
                  locale={locale}
                  currentUser={{
                    name: me.name,
                    company: me.company,
                    role: me.role,
                    communityRole: me.communityRole,
                  }}
                />
              ) : (
                <CommunityMemberRequiredPanel
                  locale={locale}
                  nextPath="/community/write"
                  title={isKo ? "글쓰기는 회원 전용입니다." : "Posting is members-only."}
                  body={
                    isKo
                      ? "커뮤니티 글, 댓글, 좋아요, 북마크는 로그인한 멤버 프로필 기반으로 운영됩니다."
                      : "Posts, comments, likes, and bookmarks are tied to signed-in member profiles."
                  }
                />
              )}
            </div>

            <aside className="grid gap-4 self-start">
              <div className="rounded-[28px] border dark:border-white/12 border-gray-200 dark:bg-white/6 bg-gray-50 p-5 backdrop-blur tkad-neon-border">
                <p className="font-mono text-[11px] font-bold uppercase tracking-[0.22em] dark:text-white text-gray-500">
                  {isKo ? "// 작성 흐름" : "// workflow"}
                </p>
                <ol className="mt-4 space-y-3 text-sm leading-relaxed dark:text-white">
                  <li>{isKo ? "1. 카테고리를 고르고 제목을 먼저 정리합니다." : "1. Pick the category and clarify the headline."}</li>
                  <li>{isKo ? "2. 배경, 실행, 결과, 배운 점 순서로 쓰면 읽기 쉽습니다." : "2. Background, execution, outcome, and learnings work well."}</li>
                  <li>{isKo ? "3. 발행 후 댓글과 반응은 멤버 프로필에 연결됩니다." : "3. Replies and reactions stay attached to your member profile."}</li>
                </ol>
              </div>
              <div className="rounded-[28px] border dark:border-white/12 border-gray-200 dark:bg-black bg-white bg-white/20 p-5 backdrop-blur">
                <p className="font-mono text-[11px] font-bold uppercase tracking-[0.22em] dark:text-white text-gray-500">
                  {isKo ? "// note" : "// note"}
                </p>
                <p className="mt-3 text-sm leading-relaxed dark:text-white">
                  {isKo
                    ? "프로필의 회사명과 역할 정보가 함께 노출될 수 있어, 업계 맥락이 드러나는 실무형 포스트에 특히 적합합니다."
                    : "Because role and company context can be shown with the post, this format is strongest for practical, industry-facing updates."}
                </p>
              </div>
            </aside>
          </div>
        </NeonSection>
      </div>
    </HomeLandingDayNight>
  );
}
