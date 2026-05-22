import { NextRequest } from "next/server";
import { getCurrentUser } from "@/lib/user-session";
import {
  apiError,
  apiOk,
  apiServerError,
  apiZodError,
  readJson,
} from "@/lib/api-response";
import { awardDailyCheckIn } from "@/lib/points";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) return apiError("UNAUTHORIZED", 401);

    const result = await awardDailyCheckIn(user.id);
    if (result.alreadyChecked) {
      return apiError("ALREADY_CHECKED", 409, {
        message: "오늘은 이미 출석 체크를 완료했습니다.",
      });
    }

    const earned =
      (result.daily?.awarded ? result.daily.amount : 0) +
      (result.streakBonus?.awarded ? result.streakBonus.amount : 0);
    const balance = result.streakBonus?.balance ?? result.daily?.balance ?? 0;

    return apiOk({
      earned,
      balance,
      streakDays: result.streakDays,
      daily: result.daily,
      streakBonus: result.streakBonus,
      points: result.daily?.awarded
        ? {
            amount: earned,
            balance,
            label: result.streakBonus?.awarded
              ? "출석 + 연속 보너스"
              : result.daily.label,
          }
        : undefined,
    });
  } catch (e) {
    return apiServerError(e, "points/check-in");
  }
}
