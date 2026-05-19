import { getTeamMembershipForUser } from "@/lib/team-context";
import { canContactOrPay } from "@/lib/team-permissions";

export async function assertUserCanContactOrPay(
  userId: string,
): Promise<{ ok: true } | { ok: false; message: string }> {
  const ctx = await getTeamMembershipForUser(userId);
  if (ctx && !canContactOrPay(ctx.role)) {
    return {
      ok: false,
      message:
        "뷰어 권한은 문의·결제 기능을 사용할 수 없습니다. 팀 관리자에게 권한 변경을 요청해 주세요.",
    };
  }
  return { ok: true };
}
