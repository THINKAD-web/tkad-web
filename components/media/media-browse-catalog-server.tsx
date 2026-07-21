import { Link } from "@/i18n/navigation";
import {
  getPrimaryMediaImageUrl,
  type MediaItem,
  typeLabels,
} from "@/lib/media-data";
import { mediaItemDetailPath } from "@/lib/media-network-types";
import { MediaPriceExclNote } from "@/components/media/media-price-excl-note";
import { formatMediaDisplayPrice } from "@/lib/media-price-format";
import { getTranslations } from "next-intl/server";

type Props = {
  catalog: MediaItem[];
  locale: string;
  /** SSR 초기 노출 건수 */
  limit?: number;
};

/**
 * /media 매체 목록 — 크롤러·no-JS용 서버 렌더.
 * 클라이언트 필터 UI가 hydrate 되면 숨김 처리됨 (#media-ssr-catalog).
 */
export async function MediaBrowseCatalogServer({
  catalog,
  locale,
  limit = 12,
}: Props) {
  const isKo = locale === "ko";
  const tMedia = await getTranslations({ locale, namespace: "media" });
  const items = catalog.slice(0, limit);

  if (items.length === 0) return null;

  return (
    <section
      id="media-ssr-catalog"
      className="border-t border-border/60 bg-card py-6 sm:py-10"
      aria-label={isKo ? "매체 목록" : "Media catalog"}
    >
      <div className="ui-container">
        <h2 className="mb-4 text-base font-semibold text-foreground sm:text-lg">
          {isKo ? "검증 매체 목록" : "Verified media"}
          <span className="ml-2 tabular-nums text-accent">{catalog.length}</span>
        </h2>
        <ul className="flex flex-col gap-2">
          {items.map((media, index) => {
            const name = isKo ? media.name : media.nameEn || media.name;
            const location = isKo
              ? media.location
              : media.locationEn || media.location;
            const typeLabel =
              typeLabels[media.type]?.[isKo ? "ko" : "en"] ?? media.type;
            const price = formatMediaDisplayPrice(media, locale);
            const href = mediaItemDetailPath(media);
            const imageSrc = getPrimaryMediaImageUrl(media);

            return (
              <li key={media.id} className="list-none">
                <Link
                  href={href}
                  className="flex gap-3 rounded-xl border border-border bg-card p-3 transition-colors hover:border-accent/40 sm:gap-4 sm:p-4"
                >
                  <div className="relative h-20 w-24 shrink-0 overflow-hidden rounded-lg border border-border bg-muted sm:h-24 sm:w-28">
                    {imageSrc ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={imageSrc}
                        alt={name}
                        className="h-full w-full object-cover"
                        loading={index < 4 ? "eager" : "lazy"}
                      />
                    ) : (
                      <span className="flex h-full items-center justify-center px-1 text-center text-[10px] text-muted-foreground">
                        {tMedia("imagePreparing")}
                      </span>
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                      {typeLabel}
                    </p>
                    <p className="mt-0.5 line-clamp-2 text-sm font-bold text-foreground sm:text-base">
                      {name}
                    </p>
                    <p className="mt-1 line-clamp-1 text-xs text-muted-foreground">
                      {location}
                    </p>
                    {price ? (
                      <>
                        <p className="mt-1.5 text-sm font-bold tabular-nums text-foreground">
                          {price}
                        </p>
                        <MediaPriceExclNote isKo={isKo} className="mt-0.5" />
                      </>
                    ) : null}
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
}
