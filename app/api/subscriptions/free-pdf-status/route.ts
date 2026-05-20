import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/user-session";
import { canUseFreePlannerPdf, checkReportAccess } from "@/lib/report-access";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ eligible: false, loggedIn: false });
  }

  const access = await checkReportAccess(user.id, "planner_pdf");
  if (access.allowed) {
    return NextResponse.json({ eligible: true, pro: true });
  }

  const eligible = await canUseFreePlannerPdf(user.id);
  return NextResponse.json({ eligible, pro: false });
}
