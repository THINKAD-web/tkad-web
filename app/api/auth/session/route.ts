import { getCurrentUser } from "@/lib/user-session";
import { apiOk, apiServerError } from "@/lib/api-response";

export const runtime = "nodejs";

export async function GET() {
  try {
    const user = await getCurrentUser();
    return apiOk(user);
  } catch (e) {
    return apiServerError(e, "auth/session");
  }
}
