import type {
  SpecialFaqItem,
  SpecialGuideStep,
  SpecialHotspot,
} from "@/lib/special-media-landings";
import { MediaCatalogGridCard } from "@/components/media-catalog-grid-card";
import type { MediaItem } from "@/lib/media-data";
import { SpecialHotspotMap } from "@/components/special/special-hotspot-map";
import { Link } from "@/i18n/navigation";

export function SpecialMediaGridSection({
  title,
  items,
  locale,
  emptyMessage,
  ctaHref,
  ctaLabel,
}: {
  title: string;
  items: MediaItem[];
  locale: string;
  emptyMessage: string;
  ctaHref: string;
  ctaLabel: string;
}) {
  const isKo = locale.startsWith("ko");
  if (items.length === 0) {
    return (
      <section className="py-12 sm:py-16">
        <div className="ui-container text-center">
          <h2 className="text-xl font-bold sm:text-2xl">{title}</h2>
          <p className="mt-4 text-muted-foreground">{emptyMessage}</p>
          <Link href={ctaHref} className="tkad-neon-cta mt-6 inline-flex h-12 items-center rounded-[18px] px-8 text-sm font-bold">
            {ctaLabel}
          </Link>
        </div>
      </section>
    );
  }

  return (
    <section className="py-12 sm:py-16">
      <div className="ui-container">
        <h2 className="text-xl font-bold tracking-tight sm:text-2xl">
          {title}{" "}
          <span className="text-accent tabular-nums">{items.length}</span>
        </h2>
        <ul className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {items.map((m) => (
            <li key={m.id}>
              <MediaCatalogGridCard
                variant="link"
                media={m}
                isKo={isKo}
                imagePreparingLabel={isKo ? "이미지 준비 중" : "Image preparing"}
              />
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

export function SpecialMapSection({
  title,
  hotspots,
  isKo,
}: {
  title: string;
  hotspots: SpecialHotspot[];
  isKo: boolean;
}) {
  return (
    <section className="border-t border-border/80 bg-muted/30 py-12 sm:py-16">
      <div className="ui-container">
        <h2 className="text-xl font-bold tracking-tight sm:text-2xl">{title}</h2>
        <div className="mt-8">
          <SpecialHotspotMap hotspots={hotspots} isKo={isKo} />
        </div>
      </div>
    </section>
  );
}

export function SpecialGuideSection({
  title,
  steps,
  isKo,
}: {
  title: string;
  steps: SpecialGuideStep[];
  isKo: boolean;
}) {
  return (
    <section className="py-12 sm:py-16">
      <div className="ui-container max-w-3xl">
        <h2 className="text-xl font-bold tracking-tight sm:text-2xl">{title}</h2>
        <ol className="mt-8 space-y-4">
          {steps.map((step, i) => (
            <li
              key={step.titleKo}
              className="flex gap-4 rounded-2xl border border-border bg-card p-5 shadow-sm"
            >
              <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-violet-500/20 to-pink-500/20 text-sm font-black text-violet-700 dark:text-violet-200">
                {i + 1}
              </span>
              <div>
                <p className="font-bold text-foreground">
                  {isKo ? step.titleKo : step.titleEn}
                </p>
                <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
                  {isKo ? step.bodyKo : step.bodyEn}
                </p>
              </div>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}

export function SpecialFaqSection({
  title,
  items,
  isKo,
}: {
  title: string;
  items: SpecialFaqItem[];
  isKo: boolean;
}) {
  return (
    <section className="border-t border-border/80 bg-muted/40 py-12 sm:py-16">
      <div className="ui-container max-w-3xl">
        <h2 className="text-xl font-bold tracking-tight sm:text-2xl">{title}</h2>
        <dl className="mt-8 space-y-4">
          {items.map((item) => (
            <div
              key={item.qKo}
              className="rounded-2xl border border-border bg-card p-5"
            >
              <dt className="font-semibold text-foreground">
                {isKo ? item.qKo : item.qEn}
              </dt>
              <dd className="mt-2 text-sm leading-relaxed text-muted-foreground">
                {isKo ? item.aKo : item.aEn}
              </dd>
            </div>
          ))}
        </dl>
      </div>
    </section>
  );
}

export function SpecialBottomCta({
  isKo,
  href,
}: {
  isKo: boolean;
  href: string;
}) {
  return (
    <section className="border-t border-border/80 py-14 sm:py-20">
      <div className="ui-container flex flex-col items-center text-center">
        <h2 className="text-xl font-bold sm:text-2xl">
          {isKo ? "팬덤 광고, 지금 시작하세요" : "Start your fandom campaign"}
        </h2>
        <p className="mt-3 max-w-lg text-sm text-muted-foreground sm:text-base">
          {isKo
            ? "매체 선택부터 소재·일정까지 THINKAD가 함께합니다."
            : "From media to creative and scheduling — we've got you."}
        </p>
        <Link
          href={href}
          className="tkad-neon-cta mt-6 inline-flex h-14 items-center justify-center rounded-[22px] px-10 text-base font-black"
        >
          {isKo ? "무료 견적 받기" : "Get a free quote"}
        </Link>
      </div>
    </section>
  );
}
