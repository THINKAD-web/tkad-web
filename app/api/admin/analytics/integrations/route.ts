import { ZodError } from "zod";
import { NextRequest } from "next/server";
import {
  AnalyticsStorageUnavailableError,
  getAnalyticsSettingsForAdmin,
  parseAnalyticsSettingsInput,
  saveAnalyticsSettings,
} from "@/lib/analytics-integrations";
import { adminDbUnavailable, assertAdmin, json } from "@/lib/admin-guard";
import { isDatabaseConfigured } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const deny = assertAdmin(request);
  if (deny) return deny;

  const settings = await getAnalyticsSettingsForAdmin();
  return json(settings);
}

export async function PUT(request: NextRequest) {
  const deny = assertAdmin(request);
  if (deny) return deny;
  if (!isDatabaseConfigured()) return adminDbUnavailable();

  try {
    const body = await request.json();
    const input = parseAnalyticsSettingsInput(body);
    const settings = await saveAnalyticsSettings(input);
    return json(settings);
  } catch (error) {
    if (error instanceof ZodError) {
      return json(
        {
          error: "Invalid analytics settings payload",
          issues: error.issues,
        },
        400,
      );
    }

    if (error instanceof AnalyticsStorageUnavailableError) {
      return json({ error: error.message }, 503);
    }

    console.error("[admin analytics integrations] save failed", error);
    return json({ error: "Failed to save analytics settings" }, 500);
  }
}
