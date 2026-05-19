"use client";

import { useCallback, useEffect, useState } from "react";
import type { TeamMemberRole } from "@prisma/client";

export type TeamPermissionsState = {
  loaded: boolean;
  hasTeam: boolean;
  role: TeamMemberRole | null;
  canManageTeam: boolean;
  canChangeRoles: boolean;
  canInvite: boolean;
  canUsePlanner: boolean;
  canContactOrPay: boolean;
  teamName: string | null;
};

const defaultState: TeamPermissionsState = {
  loaded: false,
  hasTeam: false,
  role: null,
  canManageTeam: false,
  canChangeRoles: false,
  canInvite: false,
  canUsePlanner: true,
  canContactOrPay: true,
  teamName: null,
};

export function useTeamPermissions() {
  const [state, setState] = useState<TeamPermissionsState>(defaultState);

  const refresh = useCallback(async () => {
    try {
      const res = await fetch("/api/my/team", { cache: "no-store" });
      const data = await res.json();
      if (!data?.ok) {
        setState({ ...defaultState, loaded: true });
        return;
      }
      const p = data.data.permissions as {
        canManageTeam: boolean;
        canChangeRoles: boolean;
        canInvite: boolean;
        canUsePlanner: boolean;
        canContactOrPay: boolean;
      };
      setState({
        loaded: true,
        hasTeam: true,
        role: data.data.myRole as TeamMemberRole,
        canManageTeam: p.canManageTeam,
        canChangeRoles: p.canChangeRoles,
        canInvite: p.canInvite,
        canUsePlanner: p.canUsePlanner,
        canContactOrPay: p.canContactOrPay,
        teamName: data.data.team.name as string,
      });
    } catch {
      setState({ ...defaultState, loaded: true });
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return { ...state, refresh };
}
