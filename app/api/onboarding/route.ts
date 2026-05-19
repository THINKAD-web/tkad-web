import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/user-session";
import { userPreferenceDelegate } from "@/lib/user-preference";
import { rowToDto } from "@/lib/onboarding-profile";
import { profileCompletionPercent } from "@/lib/onboarding-profile";
import {
  isOnboardingBudgetRange,
  isOnboardingIndustry,
  isOnboardingRole,
  type OnboardingIndustry,
} from "@/lib/onboarding-types";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const db = userPreferenceDelegate();
  if (!db) {
    return NextResponse.json(
      { error: "onboarding_unavailable", message: "Run prisma generate && db push" },
      { status: 503 },
    );
  }

  const row = await db.findUnique({
    where: { userId: user.id },
  });

  const pref = row ? rowToDto(row) : null;
  return NextResponse.json({
    preference: pref,
    completionPercent: profileCompletionPercent(pref),
    needsOnboarding: !pref?.onboardingCompletedAt,
    displayName: user.name ?? user.email.split("@")[0],
  });
}

type Body = {
  onboardingRole?: string;
  industries?: string[];
  budgetRange?: string;
  complete?: boolean;
  skip?: boolean;
};

export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  let body: Body;
  try {
    body = (await req.json()) as Body;
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  const db = userPreferenceDelegate();
  if (!db) {
    return NextResponse.json(
      { error: "onboarding_unavailable", message: "Run prisma generate && db push" },
      { status: 503 },
    );
  }

  if (body.skip) {
    const row = await db.upsert({
      where: { userId: user.id },
      create: {
        userId: user.id,
        onboardingCompletedAt: new Date(),
      },
      update: {
        onboardingCompletedAt: new Date(),
      },
    });
    return NextResponse.json({
      preference: rowToDto(row),
      completionPercent: 100,
    });
  }

  const data: {
    onboardingRole?: string;
    industries?: string[];
    budgetRange?: string;
    onboardingCompletedAt?: Date;
  } = {};

  if (body.onboardingRole !== undefined) {
    if (!isOnboardingRole(body.onboardingRole)) {
      return NextResponse.json({ error: "invalid_role" }, { status: 400 });
    }
    data.onboardingRole = body.onboardingRole;
  }

  if (body.industries !== undefined) {
    const industries: OnboardingIndustry[] = [];
    for (const ind of body.industries) {
      if (!isOnboardingIndustry(ind)) {
        return NextResponse.json({ error: "invalid_industry" }, { status: 400 });
      }
      industries.push(ind);
    }
    data.industries = industries;
  }

  if (body.budgetRange !== undefined) {
    if (!isOnboardingBudgetRange(body.budgetRange)) {
      return NextResponse.json({ error: "invalid_budget" }, { status: 400 });
    }
    data.budgetRange = body.budgetRange;
  }

  if (body.complete) {
    data.onboardingCompletedAt = new Date();
  }

  const row = await db.upsert({
    where: { userId: user.id },
    create: {
      userId: user.id,
      ...data,
    },
    update: data,
  });

  const pref = rowToDto(row);
  return NextResponse.json({
    preference: pref,
    completionPercent: profileCompletionPercent(pref),
  });
}
