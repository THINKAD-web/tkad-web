import { ArrowUpRight, Building2, MessageSquare, PenSquare } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { type CommunityMemberListItem } from "@/lib/community/types";
import { CommunityRoleBadge } from "@/components/community/role-badge";

type Props = {
  member: CommunityMemberListItem;
  locale: string;
};

export function CommunityMemberCard({ member, locale }: Props) {
  const isKo = locale === "ko";
  return (
    <Link
      href={`/community/profile/${member.id}`}
      className="group block rounded-[28px] border border-white/12 bg-white/6 p-5 shadow-[0_30px_120px_rgba(0,0,0,0.7)] backdrop-blur transition-colors hover:bg-white/10 tkad-neon-border sm:p-6"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-lg font-bold tracking-tight text-white">
              {member.name}
            </h2>
            <CommunityRoleBadge role={member.role} locale={locale} />
          </div>
          {member.company ? (
            <p className="inline-flex items-center gap-1.5 font-mono text-[11px] uppercase tracking-[0.18em] text-white/58">
              <Building2 className="h-3.5 w-3.5" />
              {member.company}
            </p>
          ) : null}
        </div>
        <ArrowUpRight className="h-4 w-4 text-white/45 transition-transform group-hover:translate-x-1 group-hover:-translate-y-1" />
      </div>

      {member.bio ? (
        <p className="mt-4 line-clamp-3 text-sm leading-relaxed text-white/72">
          {member.bio}
        </p>
      ) : (
        <p className="mt-4 font-mono text-[11px] uppercase tracking-[0.18em] text-white/52">
          {isKo ? "// 소개 준비 중" : "// bio coming soon"}
        </p>
      )}

      <div className="mt-5 flex flex-wrap items-center gap-3 font-mono text-[11px] uppercase tracking-[0.18em] text-white/58">
        <span className="inline-flex items-center gap-1">
          <PenSquare className="h-3 w-3" />
          {member.postCount}
        </span>
        <span className="inline-flex items-center gap-1">
          <MessageSquare className="h-3 w-3" />
          {member.commentCount}
        </span>
      </div>
    </Link>
  );
}
