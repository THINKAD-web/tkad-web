import { listEnabledOAuthProviders } from "@/lib/oauth/providers";
import { apiOk, apiServerError } from "@/lib/api-response";

export const runtime = "nodejs";

/**
 * GET /api/auth/providers
 * 현재 환경변수 기준으로 활성화된 소셜 로그인 공급자만 반환.
 * UI 가 버튼 노출 여부를 결정하는데 사용.
 */
export async function GET() {
  try {
    return apiOk({ providers: listEnabledOAuthProviders() });
  } catch (e) {
    return apiServerError(e, "auth/providers");
  }
}
