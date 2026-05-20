import { NextRequest } from "next/server";
import { assertAdminDb, json } from "@/lib/admin-guard";
import {
  computePipelineForecast,
  quarterlyRevenueSeries,
  stageProbabilitiesForUi,
} from "@/lib/crm-forecast";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const deny = assertAdminDb(request);
  if (deny) return deny;

  const [forecast, quarterly] = await Promise.all([
    computePipelineForecast(),
    quarterlyRevenueSeries(),
  ]);

  return json({
    forecast,
    quarterly,
    probabilities: stageProbabilitiesForUi(),
  });
}
