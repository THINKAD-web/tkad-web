import { getCurrentUser } from "@/lib/user-session";
import { apiOk, apiServerError, apiError } from "@/lib/api-response";
import {
  getPointSummary,
  getCheckInStreakDays,
  hasCheckedInToday,
} from "@/lib/points";

export const runtime = "nodejs";

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) return apiError("UNAUTHORIZED", 401);

    const [summary, streakDays, checkedInToday] = await Promise.all([
      getPointSummary(user.id),
      getCheckInStreakDays(user.id),
      hasCheckedInToday(user.id),
    ]);

    return apiOk({ ...summary, streakDays, checkedInToday });
  } catch (e) {
    return apiServerError(e, "points/balance");
  }
}
