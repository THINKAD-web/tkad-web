import { Link } from "@/i18n/navigation";
import {
  getLocalSeoLanding,
  localSeoPath,
  type LocalSeoLanding,
} from "@/lib/local-seo-landings";
import {
  isMarketingMediaTypeSlug,
  marketingTypeDef,
  type MarketingMediaTypeSlug,
} from "@/lib/marketing-media-types";
import type { MediaItem } from "@/lib/media-data";
import { resolveLocalLandingForMedia } from "@/lib/local-seo-landings";
import { inferMarketingTypeSlug } from "@/lib/marketing-media-types";

type Pill = { href: string; label: string };

export function buildMediaDetailSeoLinks(
  media: MediaItem,
  locale: string,
): Pill[] {
  const isKo = locale === "ko" || locale.startsWith("ko");
  const pills: Pill[] = [];

  const local = resolveLocalLandingForMedia(media);
  if (local) {
    pills.push({
      href: localSeoPath(local),
      label: isKo
        ? `${local.placeKo} 옥외광고 더 보기`
        : `More OOH in ${local.placeEn}`,
    });
  }

  const mType = inferMarketingTypeSlug(media);
  if (mType) {
    const def = marketingTypeDef(mType);
    pills.push({
      href: `/type/${mType}`,
      label: isKo ? `${def.labelKo} 매체` : def.labelEn,
    });
  }

  if (media.region) {
    pills.push({
      href: `/media/region/${encodeURIComponent(media.region)}`,
      label: isKo ? `${media.region} 매체` : `${media.region} media`,
    });
  }

  return pills;
}

export function SeoContextualLinks({
  title,
  pills,
}: {
  title: string;
  pills: Pill[];
}) {
  if (pills.length === 0) return null;
  return (
    <nav
      className="rounded-2xl border border-border/80 bg-card/40 p-4"
      aria-label={title}
    >
      <p className="tkad-type-label text-muted-foreground">
        {title}
      </p>
      <ul className="mt-3 flex flex-wrap gap-2">
        {pills.map((p) => (
          <li key={p.href}>
            <Link
              href={p.href}
              className="inline-flex rounded-full border border-primary/25 bg-primary/5 px-3 py-1.5 tkad-type-title text-foreground transition-colors hover:bg-primary/10"
            >
              {p.label}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}

export function buildBlogSeoLinks(
  post: {
    relatedLocal?: { region: string; district: string }[];
    relatedTypes?: MarketingMediaTypeSlug[];
  },
  locale: string,
): Pill[] {
  const isKo = locale === "ko" || locale.startsWith("ko");
  const pills: Pill[] = [];
  for (const loc of post.relatedLocal ?? []) {
    const landing = getLocalSeoLanding(loc.region, loc.district);
    if (landing) {
      pills.push({
        href: localSeoPath(landing),
        label: isKo ? `${landing.placeKo} 매체` : landing.placeEn,
      });
    }
  }
  for (const t of post.relatedTypes ?? []) {
    if (!isMarketingMediaTypeSlug(t)) continue;
    const def = marketingTypeDef(t);
    pills.push({
      href: `/type/${t}`,
      label: isKo ? def.labelKo : def.labelEn,
    });
  }
  return pills;
}
