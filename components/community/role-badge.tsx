import { COMMUNITY_MEMBER_ROLE_LABELS, type CommunityMemberRole } from "@/lib/community/types";
import { cn } from "@/lib/utils";

type Props = {
  role: CommunityMemberRole | null;
  locale?: string;
  className?: string;
};

export function CommunityRoleBadge({
  role,
  locale = "ko",
  className,
}: Props) {
  if (!role) return null;
  const label = COMMUNITY_MEMBER_ROLE_LABELS[role];
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2.5 py-1 font-display text-xs font-medium uppercase tracking-[0.18em]",
        label.surfaceClassName,
        className,
      )}
    >
      {locale === "ko" ? label.ko : label.en}
    </span>
  );
}

/** 커뮤니티 멤버 역할 뱃지 (`<RoleBadge role="AGENCY" />`). */
export const RoleBadge = CommunityRoleBadge;
