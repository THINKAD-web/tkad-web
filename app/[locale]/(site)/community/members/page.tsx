import type { Metadata } from "next";
import { setRequestLocale } from "next-intl/server";
import { resolveLocaleParam } from "@/lib/resolve-locale";
import { buildShareMetadata, pageAlternates } from "@/lib/seo";
import {
  getCommunityMemberDirectoryStats,
  listCommunityMembersPaginated,
} from "@/lib/community/queries";
import { CommunityMemberCard } from "@/components/community/member-card";
import { HomeLandingDayNight } from "@/components/home-landing-day-night";
import { NeonSection } from "@/components/landing/neon/neon-section";
import { NeonSectionHead } from "@/components/landing/neon/neon-section-head";
import { Link } from "@/i18n/navigation";
import {
  COMMUNITY_DIRECTORY_REGION_OPTIONS,
  COMMUNITY_MEMBER_ROLE_LABELS,
  COMMUNITY_MEMBER_ROLES,
  normalizeCommunityMemberRole,
  type CommunityMemberRole,
} from "@/lib/community/types";
import { ArrowLeft, Building2, ChevronLeft, ChevronRight, MessageSquare, PenSquare, Users } from "lucide-react";
import { cn } from "@/lib/utils";

type Props = {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ role?: string; region?: string; page?: string }>;
};

export const dynamic = "force-dynamic";

function directoryHref(opts: {
  role?: CommunityMemberRole | null;
  region?: string | null;
  page?: number;
}): string {
  const p = new URLSearchParams();
  if (opts.role) p.set("role", opts.role);
  if (opts.region) p.set("region", opts.region);
  if (opts.page && opts.page > 1) p.set("page", String(opts.page));
  const qs = p.toString();
  return qs ? `/community/members?${qs}` : "/community/members";
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const locale = await resolveLocaleParam(params);
  const isKo = locale === "ko";
  const title = isKo ? "OOH 업계 멤버" : "OOH industry members";
  const description = isKo
    ? "광고주·매체사·대행사·프리랜서가 모여 있습니다."
    : "Advertisers, media, agencies, and freelancers in one directory.";
  return {
    title,
    description,
    alternates: pageAlternates(locale, "/community/members"),
    ...buildShareMetadata({
      locale,
      title,
      description,
      path: "/community/members",
    }),
  };
}

export default async function CommunityMembersPage({ params, searchParams }: Props) {
  const locale = await resolveLocaleParam(params);
  setRequestLocale(locale);
  const isKo = locale === "ko";
  const sp = await searchParams;

  const roleFilter = sp.role ? normalizeCommunityMemberRole(sp.role) : null;
  const regionRaw = sp.region?.trim();
  const regionFilter =
    regionRaw &&
    regionRaw !== "전체" &&
    regionRaw !== "all" &&
    (COMMUNITY_DIRECTORY_REGION_OPTIONS as readonly string[]).includes(regionRaw)
      ? regionRaw
      : null;

  const pageRaw = Number(sp.page ?? "1");
  const page = Number.isFinite(pageRaw) && pageRaw >= 1 ? Math.floor(pageRaw) : 1;

  const [{ members, total, pageSize }, stats] = await Promise.all([
    listCommunityMembersPaginated({
      role: roleFilter,
      region: regionFilter,
      page,
    }),
    getCommunityMemberDirectoryStats(),
  ]);

  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  const tabCls = (active: boolean) =>
    cn(
      "inline-flex items-center justify-center rounded-full border px-4 py-2 tkad-type-label transition-colors",
      active
        ? "border-white/22 bg-white/12 dark:text-white text-gray-900"
        : "dark:border-white/10 border-gray-200 dark:bg-black bg-white/20 dark:text-white hover:border-white/16 hover:dark:text-white text-gray-700",
    );

  const regionTabCls = (active: boolean) =>
    cn(
      "inline-flex items-center justify-center rounded-full border px-3 py-2 tkad-type-label transition-colors sm:px-4",
      active
        ? "border-hermes/40 bg-hermes/10 text-hermes"
        : "dark:border-white/10 border-gray-200 dark:bg-black bg-white/20 dark:text-white hover:border-white/16 hover:dark:text-white text-gray-700",
    );

  return (
    <HomeLandingDayNight>
      <div className="tkad-landing-neon tkad-planner-neon">
        <NeonSection tone="qp" className="pb-10 pt-16 sm:pt-20 lg:pt-24">
          <Link
            href="/community"
            className="inline-flex items-center gap-2 tkad-type-label dark:text-white transition-colors hover:dark:text-white text-gray-900"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            {isKo ? "커뮤니티 홈" : "Community home"}
          </Link>

          <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1.2fr)_360px]">
            <div className="rounded-[30px] border dark:border-white/12 border-gray-200 dark:bg-white/6 bg-gray-50 p-6 shadow-[0_36px_140px_rgba(0,0,0,0.72)] backdrop-blur tkad-neon-border sm:p-8">
              <NeonSectionHead
                number="08"
                kicker="Members"
                title={
                  isKo ? (
                    <>
                      <span className="tkad-home-accent-text">OOH 업계</span> 멤버
                    </>
                  ) : (
                    <>
                      <span className="tkad-home-accent-text">OOH industry</span> members
                    </>
                  )
                }
                meta="community directory"
                className="mb-0"
              />
              <p className="mt-6 max-w-3xl text-base leading-relaxed dark:text-white text-gray-700 sm:text-lg">
                {isKo
                  ? "광고주·매체사·대행사·프리랜서가 모여 있습니다"
                  : "Advertisers, media owners, agencies, and freelancers — all in one place."}
              </p>
            </div>

            <div className="grid gap-4">
              {[
                {
                  icon: Users,
                  label: isKo ? "전체 멤버" : "Members",
                  value: stats.totalMembers.toLocaleString(),
                },
                {
                  icon: PenSquare,
                  label: isKo ? "글 작성 멤버" : "Authors",
                  value: stats.activeAuthors.toLocaleString(),
                },
                {
                  icon: MessageSquare,
                  label: isKo ? "댓글 활동 멤버" : "Discussants",
                  value: stats.activeDiscussants.toLocaleString(),
                },
                {
                  icon: Building2,
                  label: isKo ? "소속 회사" : "Companies",
                  value: stats.companies.toLocaleString(),
                },
              ].map((item) => (
                <div
                  key={item.label}
                  className="rounded-[24px] border dark:border-white/12 border-gray-200 dark:bg-white/6 bg-gray-50 p-5 backdrop-blur tkad-neon-border"
                >
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="tkad-type-label dark:text-white text-gray-500">
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
            </div>
          </div>
        </NeonSection>

        <NeonSection tone="qp" className="pt-0 pb-20 sm:pb-24">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="tkad-type-label dark:text-white text-gray-500">
                {isKo ? "// directory" : "// directory"}
              </p>
              <h2 className="mt-2 text-2xl font-black tracking-[-0.05em] dark:text-white text-gray-900 sm:text-3xl">
                {isKo ? "멤버 찾기" : "Browse members"}
              </h2>
            </div>
            <Link
              href="/community/write"
              className="inline-flex items-center gap-2 rounded-full border border-hermes/40 bg-hermes/15 px-5 py-3 tkad-type-label dark:text-white text-gray-900 transition-colors hover:bg-hermes/20"
            >
              {isKo ? "글쓰기 시작" : "Start posting"}
            </Link>
          </div>

          <div className="mt-6 space-y-4">
            <div>
              <p className="mb-2 tkad-type-label dark:text-white">
                {isKo ? "역할" : "Role"}
              </p>
              <div className="flex flex-wrap gap-2">
                <Link href={directoryHref({ region: regionFilter, page: 1 })} className={tabCls(!roleFilter)}>
                  {isKo ? "전체" : "All"}
                </Link>
                {COMMUNITY_MEMBER_ROLES.map((role) => (
                  <Link
                    key={role}
                    href={directoryHref({ role, region: regionFilter, page: 1 })}
                    className={tabCls(roleFilter === role)}
                  >
                    {isKo ? COMMUNITY_MEMBER_ROLE_LABELS[role].ko : COMMUNITY_MEMBER_ROLE_LABELS[role].en}
                  </Link>
                ))}
              </div>
            </div>

            <div>
              <p className="mb-2 tkad-type-label dark:text-white">
                {isKo ? "지역" : "Region"}
              </p>
              <div className="flex flex-wrap gap-2">
                <Link href={directoryHref({ role: roleFilter, page: 1 })} className={regionTabCls(!regionFilter)}>
                  {isKo ? "전체" : "All"}
                </Link>
                {COMMUNITY_DIRECTORY_REGION_OPTIONS.map((r) => (
                  <Link
                    key={r}
                    href={directoryHref({ role: roleFilter, region: r, page: 1 })}
                    className={regionTabCls(regionFilter === r)}
                  >
                    {r}
                  </Link>
                ))}
              </div>
            </div>
          </div>

          {members.length === 0 ? (
            <div className="mt-6 rounded-[28px] border dark:border-white/12 border-gray-200 dark:bg-white/6 bg-gray-50 p-12 text-center backdrop-blur tkad-neon-border">
              <p className="font-display tkad-type-meta uppercase tracking-[0.22em] dark:text-white">
                {isKo ? "// 조건에 맞는 멤버가 없습니다." : "// no members match these filters"}
              </p>
            </div>
          ) : (
            <>
              <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
                {members.map((member) => (
                  <CommunityMemberCard key={member.id} member={member} locale={locale} />
                ))}
              </div>

              {totalPages > 1 ? (
                <div className="mt-8 flex flex-wrap items-center justify-center gap-3 tkad-type-caption dark:text-white">
                  <Link
                    href={directoryHref({
                      role: roleFilter,
                      region: regionFilter,
                      page: Math.max(1, page - 1),
                    })}
                    aria-disabled={page <= 1}
                    className={cn(
                      "inline-flex items-center gap-1 rounded-full border dark:border-white/12 border-gray-200 px-4 py-2 transition-colors",
                      page <= 1 ? "pointer-events-none opacity-40" : "hover:dark:bg-white/10 bg-gray-100",
                    )}
                  >
                    <ChevronLeft className="h-4 w-4" />
                    {isKo ? "이전" : "Prev"}
                  </Link>
                  <span className="tabular-nums dark:text-white text-gray-500">
                    {page} / {totalPages}
                  </span>
                  <Link
                    href={directoryHref({
                      role: roleFilter,
                      region: regionFilter,
                      page: Math.min(totalPages, page + 1),
                    })}
                    aria-disabled={page >= totalPages}
                    className={cn(
                      "inline-flex items-center gap-1 rounded-full border dark:border-white/12 border-gray-200 px-4 py-2 transition-colors",
                      page >= totalPages ? "pointer-events-none opacity-40" : "hover:dark:bg-white/10 bg-gray-100",
                    )}
                  >
                    {isKo ? "다음" : "Next"}
                    <ChevronRight className="h-4 w-4" />
                  </Link>
                </div>
              ) : null}
            </>
          )}
        </NeonSection>
      </div>
    </HomeLandingDayNight>
  );
}
