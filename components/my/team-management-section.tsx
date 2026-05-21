"use client";

import { useCallback, useEffect, useState } from "react";
import { useLocale } from "next-intl";
import { Link } from "@/i18n/navigation";
import { Mail, Trash2, Users } from "lucide-react";
import { Spinner, EmptyState } from "@/components/ui/spinner";
import { useAppToast } from "@/lib/use-toast";
import type { TeamMemberRole } from "@prisma/client";
import { TEAM_ROLE_LABEL } from "@/lib/team-permissions";
import {
  myHubGlassCard,
  myHubGlassPanel,
  myHubInput,
  myHubOutlineBtn,
  myHubPrimaryBtn,
  myHubSelect,
} from "@/lib/my-hub-ui";
import { cn } from "@/lib/utils";

type Member = {
  userId: string;
  name: string;
  email: string;
  role: TeamMemberRole;
  joinedAt: string;
  isOwner: boolean;
};

type TeamData = {
  id: string;
  name: string;
  ownerId: string;
};

type Perms = {
  canManageTeam: boolean;
  canChangeRoles: boolean;
  canInvite: boolean;
};

const INVITE_ROLES: TeamMemberRole[] = ["ADMIN", "PLANNER", "VIEWER"];

export function TeamManagementSection() {
  const locale = useLocale();
  const isKo = locale === "ko";
  const toast = useAppToast();

  const [loading, setLoading] = useState(true);
  const [team, setTeam] = useState<TeamData | null>(null);
  const [members, setMembers] = useState<Member[]>([]);
  const [perms, setPerms] = useState<Perms | null>(null);
  const [teamName, setTeamName] = useState("");
  const [savingName, setSavingName] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<TeamMemberRole>("PLANNER");
  const [inviting, setInviting] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/my/team", { cache: "no-store" });
      const data = await res.json();
      if (!data?.ok) return;
      setTeam(data.data.team);
      setTeamName(data.data.team.name);
      setMembers(data.data.members);
      setPerms(data.data.permissions);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function saveTeamName() {
    if (!team || !perms?.canManageTeam) return;
    setSavingName(true);
    try {
      const res = await fetch("/api/my/team", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: teamName.trim() }),
      });
      const data = await res.json();
      if (data?.ok) {
        setTeam((t) => (t ? { ...t, name: data.data.team.name } : t));
        toast.success(isKo ? "팀 이름을 저장했습니다." : "Team name saved.");
      } else {
        toast.error(data?.message ?? (isKo ? "저장 실패" : "Save failed"));
      }
    } finally {
      setSavingName(false);
    }
  }

  async function sendInvite(e: React.FormEvent) {
    e.preventDefault();
    if (!perms?.canInvite || !inviteEmail.trim()) return;
    setInviting(true);
    try {
      const res = await fetch("/api/my/team/invite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: inviteEmail.trim(),
          role: inviteRole,
          locale,
        }),
      });
      const data = await res.json();
      if (data?.ok) {
        toast.success(
          data.data.emailSent
            ? isKo
              ? "초대 메일을 발송했습니다."
              : "Invitation email sent."
            : isKo
              ? `초대 링크: ${data.data.joinUrl}`
              : `Invite link: ${data.data.joinUrl}`,
        );
        setInviteEmail("");
      } else {
        toast.error(data?.message ?? (isKo ? "초대 실패" : "Invite failed"));
      }
    } finally {
      setInviting(false);
    }
  }

  async function changeRole(userId: string, role: TeamMemberRole) {
    const res = await fetch(`/api/my/team/members/${userId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ role }),
    });
    const data = await res.json();
    if (data?.ok) {
      setMembers((prev) =>
        prev.map((m) => (m.userId === userId ? { ...m, role } : m)),
      );
    } else {
      toast.error(data?.message ?? (isKo ? "역할 변경 실패" : "Role update failed"));
    }
  }

  async function removeMember(userId: string, name: string) {
    if (!confirm(isKo ? `${name}님을 팀에서 제거할까요?` : `Remove ${name} from the team?`)) {
      return;
    }
    const res = await fetch(`/api/my/team/members/${userId}`, { method: "DELETE" });
    const data = await res.json();
    if (data?.ok) {
      setMembers((prev) => prev.filter((m) => m.userId !== userId));
      toast.warning(isKo ? "팀원을 제거했습니다." : "Member removed.");
    } else {
      toast.error(data?.message ?? (isKo ? "제거 실패" : "Remove failed"));
    }
  }

  if (loading) {
    return (
      <div className="py-16 text-center">
        <Spinner size="md" label={isKo ? "팀 정보 불러오는 중…" : "Loading team…"} />
      </div>
    );
  }

  if (!team) {
    return (
      <EmptyState
        icon="👥"
        title={isKo ? "팀을 불러올 수 없습니다" : "Could not load team"}
        description={isKo ? "잠시 후 다시 시도해 주세요." : "Please try again later."}
      />
    );
  }

  return (
    <section aria-labelledby="my-team-heading" className="space-y-6">
      <h2 id="my-team-heading" className="sr-only">
        {isKo ? "팀 관리" : "Team"}
      </h2>

      <div className={myHubGlassCard}>
        <div className="mb-4 flex items-center gap-2">
          <Users className="h-5 w-5 text-primary" />
          <p className="font-mono text-[11px] font-bold uppercase tracking-[0.22em] text-primary">
            {isKo ? "팀 설정" : "Team settings"}
          </p>
        </div>
        <label className="block text-sm font-semibold text-foreground">
          {isKo ? "팀 이름" : "Team name"}
        </label>
        <div className="mt-2 flex flex-col gap-2 sm:flex-row">
          <input
            value={teamName}
            onChange={(e) => setTeamName(e.target.value)}
            disabled={!perms?.canManageTeam}
            className={myHubInput}
          />
          {perms?.canManageTeam ? (
            <button
              type="button"
              onClick={() => void saveTeamName()}
              disabled={savingName || !teamName.trim()}
              className={myHubPrimaryBtn}
            >
              {isKo ? "저장" : "Save"}
            </button>
          ) : null}
        </div>
      </div>

      {perms?.canInvite ? (
        <form onSubmit={sendInvite} className={myHubGlassCard}>
          <p className="mb-3 font-mono text-[11px] font-bold uppercase tracking-[0.22em] text-primary">
            {isKo ? "팀원 초대" : "Invite member"}
          </p>
          <div className="flex flex-col gap-3 sm:flex-row">
            <input
              type="email"
              required
              value={inviteEmail}
              onChange={(e) => setInviteEmail(e.target.value)}
              placeholder={isKo ? "이메일 주소" : "Email address"}
              className={myHubInput}
            />
            <select
              value={inviteRole}
              onChange={(e) => setInviteRole(e.target.value as TeamMemberRole)}
              className={cn(myHubSelect, "sm:min-w-[10rem]")}
            >
              {INVITE_ROLES.map((r) => (
                <option key={r} value={r}>
                  {isKo ? TEAM_ROLE_LABEL[r].ko : TEAM_ROLE_LABEL[r].en}
                </option>
              ))}
            </select>
            <button type="submit" disabled={inviting} className={myHubPrimaryBtn}>
              <Mail className="h-4 w-4" />
              {inviting ? (isKo ? "발송 중…" : "Sending…") : isKo ? "초대" : "Invite"}
            </button>
          </div>
        </form>
      ) : null}

      <div className={cn(myHubGlassPanel, "p-5 sm:p-6 lg:p-8")}>
        <p className="mb-5 font-mono text-[11px] font-bold uppercase tracking-[0.22em] text-muted-foreground">
          {isKo ? `팀원 (${members.length})` : `Members (${members.length})`}
        </p>
        <div className="overflow-x-auto rounded-[20px] border border-border/60 dark:border-white/10 border-gray-200">
          <table className="w-full min-w-[640px] border-collapse text-left text-sm">
            <thead>
              <tr className="border-b border-border/60 bg-muted/40 dark:border-white/10 border-gray-200 dark:bg-white/5 bg-gray-50">
                <th className="px-4 py-3.5 font-mono text-[10px] font-bold uppercase tracking-[0.18em] text-muted-foreground">
                  {isKo ? "이름" : "Name"}
                </th>
                <th className="px-4 py-3.5 font-mono text-[10px] font-bold uppercase tracking-[0.18em] text-muted-foreground">
                  {isKo ? "이메일" : "Email"}
                </th>
                <th className="px-4 py-3.5 font-mono text-[10px] font-bold uppercase tracking-[0.18em] text-muted-foreground">
                  {isKo ? "가입일" : "Joined"}
                </th>
                <th className="px-4 py-3.5 font-mono text-[10px] font-bold uppercase tracking-[0.18em] text-muted-foreground">
                  {isKo ? "역할" : "Role"}
                </th>
                <th className="px-4 py-3.5 text-right font-mono text-[10px] font-bold uppercase tracking-[0.18em] text-muted-foreground">
                  {isKo ? "관리" : "Actions"}
                </th>
              </tr>
            </thead>
            <tbody>
              {members.map((m) => (
                <tr
                  key={m.userId}
                  className="border-b border-border/40 last:border-0 dark:border-white/8"
                >
                  <td className="px-4 py-4 font-semibold text-foreground">{m.name}</td>
                  <td className="px-4 py-4 text-muted-foreground">{m.email}</td>
                  <td className="px-4 py-4 font-mono text-xs tabular-nums text-muted-foreground">
                    {new Date(m.joinedAt).toLocaleDateString(isKo ? "ko-KR" : "en-US")}
                  </td>
                  <td className="px-4 py-4">
                    {perms?.canChangeRoles && !m.isOwner ? (
                      <select
                        value={m.role}
                        onChange={(e) =>
                          void changeRole(m.userId, e.target.value as TeamMemberRole)
                        }
                        className={cn(myHubSelect, "min-h-10 text-xs")}
                      >
                        {INVITE_ROLES.map((r) => (
                          <option key={r} value={r}>
                            {isKo ? TEAM_ROLE_LABEL[r].ko : TEAM_ROLE_LABEL[r].en}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <span className="inline-flex rounded-full border border-primary/30 bg-primary/10 px-2.5 py-0.5 text-[10px] font-semibold text-primary">
                        {isKo ? TEAM_ROLE_LABEL[m.role].ko : TEAM_ROLE_LABEL[m.role].en}
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-4 text-right">
                    {perms?.canManageTeam && !m.isOwner ? (
                      <button
                        type="button"
                        onClick={() => void removeMember(m.userId, m.name)}
                        className={cn(myHubOutlineBtn, "px-3 py-2")}
                        aria-label={isKo ? "제거" : "Remove"}
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    ) : (
                      <span className="text-xs text-muted-foreground">—</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <p className="text-center text-sm text-muted-foreground">
        <Link href="/my/notifications" className="font-semibold text-primary hover:underline">
          {isKo ? "알림 센터" : "Notifications"}
        </Link>
      </p>
    </section>
  );
}
