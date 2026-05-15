import { NextResponse } from "next/server";
import { getPublicAnalyticsConfig } from "@/lib/analytics-integrations";

export const dynamic = "force-dynamic";

export async function GET() {
  const config = await getPublicAnalyticsConfig();
  const headers = new Headers();
  headers.set("Cache-Control", "no-store, private");
  return NextResponse.json(config, { headers });
}
