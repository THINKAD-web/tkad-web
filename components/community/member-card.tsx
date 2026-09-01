import { ArrowUpRight, Building2, Calendar, PenSquare } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { type CommunityMemberListItem } from "@/lib/community/types";
import { RoleBadge } from "@/components/community/role-badge";

type Props = {
  member: CommunityMemberListItem;
  locale: string;
};

function fmtJoin(iso: string, locale: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString(locale === "ko" ? "ko-KR" : "en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export function CommunityMemberCard({ member, locale }: Props) {
  const isKo = locale === "ko";
  return (
    <Link
      href={`/community/profile/${member.id}`}
      className="group block rounded-[28px] border dark:border-white/12 border-gray-200 dark:bg-white/6 bg-gray-50 p-5 shadow-[0_30px_120px_rgba(0,0,0,0.7)] backdrop-blur transition-colors hover:dark:bg-white/10 bg-gray-100 tkad-neon-border sm:p-6"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-lg font-bold tracking-tight dark:text-white text-gray-900">
              {member.name}
            </h2>
            <RoleBadge role={member.role} locale={locale} />
          </div>
          {member.company ? (
            <p className="inline-flex items-center gap-1.5 tkad-type-label dark:text-white">
              <Building2 className="h-3.5 w-3.5" />
              {member.company}
            </p>
          ) : null}
        </div>
        <ArrowUpRight className="h-4 w-4 dark:text-white transition-transform group-hover:translate-x-1 group-hover:-translate-y-1" />
      </div>

      {member.bio ? (
        <p className="mt-4 line-clamp-3 text-sm leading-relaxed dark:text-white">
          {member.bio}
        </p>
      ) : (
        <p className="mt-4 tkad-type-label dark:text-white">
          {isKo ? "// 소개 준비 중" : "// bio coming soon"}
        </p>
      )}

      <div className="mt-5 flex flex-wrap items-center gap-4 tkad-type-label dark:text-white">
        <span className="inline-flex items-center gap-1.5">
          <Calendar className="h-3.5 w-3.5" />
          {isKo ? "가입" : "Joined"} · {fmtJoin(member.joinedAt, locale)}
        </span>
        <span className="inline-flex items-center gap-1">
          <PenSquare className="h-3 w-3" />
          {isKo ? "글" : "Posts"} · {member.postCount}
        </span>
      </div>
    </Link>
  );
}
