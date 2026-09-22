import type { AdminMediaDto } from "@/lib/admin-media-dto";
import { adminMediaDtoToMediaItem } from "@/lib/admin-quote-lines";
import { matchesMediaTextQuery } from "@/lib/media-data";

export function matchesAdminMediaDtoTextQuery(
  m: AdminMediaDto,
  queryLower: string,
): boolean {
  return matchesMediaTextQuery(adminMediaDtoToMediaItem(m), queryLower);
}
