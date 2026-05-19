import { randomBytes } from "crypto";

export function createTeamInviteToken(): string {
  return randomBytes(32).toString("hex");
}

export const TEAM_INVITE_TTL_DAYS = 7;
