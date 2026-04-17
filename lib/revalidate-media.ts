import { revalidatePath } from "next/cache";

/**
 * Admin 매체 생성/수정/삭제 후 공개 페이지 ISR 캐시 무효화.
 *
 * - Detail(`/media/[id]`)은 `revalidate = 3600`이라 저장 직후 최신 DB 값이
 *   보이지 않는 이슈가 있어 명시적 무효화가 필요하다.
 * - List(`/media`)와 Home(`/`)도 가격·옵션 요약을 함께 보여주므로 같이 친다.
 * - `ko`/`en` 두 locale prefix 모두 무효화.
 */
export function revalidateMediaCaches(mediaId?: string): void {
  const locales = ["ko", "en"] as const;
  for (const locale of locales) {
    revalidatePath(`/${locale}`);
    revalidatePath(`/${locale}/media`);
    if (mediaId) {
      revalidatePath(`/${locale}/media/${mediaId}`);
    }
  }
}
