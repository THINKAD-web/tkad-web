import type { AppUserRole } from "@prisma/client";
import type { CommunityMemberRole } from "@/lib/community/types";
import {
  ONBOARDING_ROLES,
  type OnboardingRole,
} from "@/lib/onboarding-types";

export type SignupStartRole = OnboardingRole;

export const SIGNUP_START_ROLES = ONBOARDING_ROLES;

export type SignupStartRoleOption = {
  value: SignupStartRole;
  labelKey:
    | "roleAdvertiser"
    | "roleAgency"
    | "roleMedia"
    | "roleBrowser";
  descKey:
    | "roleAdvertiserDesc"
    | "roleAgencyDesc"
    | "roleMediaDesc"
    | "roleBrowserDesc";
};

export const SIGNUP_START_ROLE_OPTIONS: SignupStartRoleOption[] = [
  {
    value: "ADVERTISER",
    labelKey: "roleAdvertiser",
    descKey: "roleAdvertiserDesc",
  },
  {
    value: "AGENCY",
    labelKey: "roleAgency",
    descKey: "roleAgencyDesc",
  },
  {
    value: "MEDIA",
    labelKey: "roleMedia",
    descKey: "roleMediaDesc",
  },
  {
    value: "BROWSER",
    labelKey: "roleBrowser",
    descKey: "roleBrowserDesc",
  },
];

/** OAuth legacy value */
export function normalizeSignupStartRole(value: string): SignupStartRole | null {
  if (value === "MEDIA_OWNER") return "MEDIA";
  if ((SIGNUP_START_ROLES as readonly string[]).includes(value)) {
    return value as SignupStartRole;
  }
  return null;
}

export function resolveSignupStartRole(startRole: SignupStartRole): {
  communityRole: CommunityMemberRole;
  appRole: AppUserRole;
  onboardingRole: SignupStartRole;
} {
  switch (startRole) {
    case "MEDIA":
      return {
        communityRole: "MEDIA",
        appRole: "owner",
        onboardingRole: "MEDIA",
      };
    case "AGENCY":
      return {
        communityRole: "AGENCY",
        appRole: "agency",
        onboardingRole: "AGENCY",
      };
    case "BROWSER":
      return {
        communityRole: "ADVERTISER",
        appRole: "advertiser",
        onboardingRole: "BROWSER",
      };
    default:
      return {
        communityRole: "ADVERTISER",
        appRole: "advertiser",
        onboardingRole: "ADVERTISER",
      };
  }
}
