import { cookies } from "next/headers";
import {
  USER_SESSION_COOKIE,
  revokeSessionByToken,
} from "@/lib/user-session";
import { apiOk, apiServerError } from "@/lib/api-response";

export const runtime = "nodejs";

export async function POST() {
  try {
    const c = await cookies();
    const token = c.get(USER_SESSION_COOKIE)?.value;
    if (token) {
      await revokeSessionByToken(token);
    }
    const res = apiOk({ loggedOut: true });
    res.cookies.delete(USER_SESSION_COOKIE);
    return res;
  } catch (e) {
    return apiServerError(e, "auth/logout");
  }
}
