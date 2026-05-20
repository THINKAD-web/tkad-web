import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/user-session";
import {
  checkReportAccess,
  type ReportFeature,
} from "@/lib/report-access";

const FEATURES: ReportFeature[] = [
  "planner_pdf",
  "detail_data",
  "competitor",
  "api",
  "planner_result",
  "media_spec",
  "simulation_full",
  "whitelabel",
];

export async function GET(req: Request) {
  const url = new URL(req.url);
  const feature = url.searchParams.get("feature") as ReportFeature | null;
  if (!feature || !FEATURES.includes(feature)) {
    return NextResponse.json({ error: "invalid_feature" }, { status: 400 });
  }

  const user = await getCurrentUser();
  const result = await checkReportAccess(user?.id ?? null, feature);
  return NextResponse.json(result);
}
