import { signUploadParams } from "@/lib/cloudinary-sign";
import { getCurrentUser } from "@/lib/user-session";
import { apiError, apiOk, apiServerError } from "@/lib/api-response";

export const runtime = "nodejs";

/**
 * POST /api/my/creatives/upload-sign
 *
 * 로그인한 사용자에게 Cloudinary 직접 업로드용 서명을 발급.
 * 폴더는 `tkad/my-creatives/<userId>` — 사용자별 격리.
 */
export async function POST() {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return apiError("UNAUTHORIZED", 401, {
        message: "로그인이 필요합니다.",
      });
    }
    const folder = `tkad/my-creatives/${user.id}`;
    const signed = signUploadParams(folder);
    if (!signed) {
      return apiError("UPLOAD_DISABLED", 503, {
        message: "현재 소재 업로드가 비활성화돼 있습니다. 관리자에게 문의해주세요.",
      });
    }
    return apiOk(signed);
  } catch (e) {
    return apiServerError(e, "my/creatives/upload-sign");
  }
}
