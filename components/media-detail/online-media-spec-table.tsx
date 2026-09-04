import type { MediaItem } from "@/lib/media-data";
import { buildOnlineDetailSpecRows } from "@/lib/online/online-detail-spec";
import { onlinePricingLabel } from "@/lib/pricing/online-performance-estimate";
import { hasOnlinePricingSpec } from "@/lib/pricing-unavailable";
import { mediaPriceOnInquiryLabel } from "@/lib/media-price-format";
import { cn } from "@/lib/utils";

type Props = {
  media: MediaItem;
  typeLabel: string;
  isKo: boolean;
  className?: string;
};

export function OnlineMediaSpecTable({ media, typeLabel, isKo, className }: Props) {
  const spec = media.onlineSpec;
  const rows = buildOnlineDetailSpecRows({
    typeLabel,
    platform: spec?.platform,
    spec,
    slug: media.slug,
    isKo,
  });

  const pricingHint =
    spec && hasOnlinePricingSpec(media)
      ? onlinePricingLabel(spec)
      : mediaPriceOnInquiryLabel(isKo ? "ko" : "en");

  return (
    <section
      className={cn("rounded-2xl border dark:border-white/10 border-gray-200 p-4 sm:p-5", className)}
      aria-label={isKo ? "매체 스펙 요약" : "Media spec summary"}
    >
      <table className="w-full text-sm">
        <tbody>
          {rows.map((row) => (
            <tr
              key={row.label}
              className="border-b border-gray-100 last:border-0 dark:border-white/10"
            >
              <th
                scope="row"
                className="w-[38%] py-2.5 pr-3 text-left font-semibold text-gray-600 dark:text-white/65"
              >
                {row.label}
              </th>
              <td className="py-2.5 font-medium dark:text-white text-gray-900">
                {row.value}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className="mt-3 text-base font-bold leading-snug text-[color:var(--qp-accent)]">
        {pricingHint}
      </p>
      {hasOnlinePricingSpec(media) ? (
        <p className="mt-1 text-xs text-gray-500 dark:text-white/55">
          {isKo
            ? "참고 단가 (CPC/CPM 시드 범위)"
            : "Reference rates (seeded CPC/CPM range)"}
        </p>
      ) : null}
    </section>
  );
}
