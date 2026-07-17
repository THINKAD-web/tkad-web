import type { ReactNode } from "react";
import { Link } from "@/i18n/navigation";
import { MediaCatalogGridCard } from "@/components/media-catalog-grid-card";
import type { MediaItem } from "@/lib/media-data";
import { getMediaCategoryBySlug, getTargetCategoryBySlug } from "@/lib/media-categories";

type FaqItem = { q: string; a: string };

export function CategoryLandingInsights({
  locale,
  slug,
  kind,
}: {
  locale: string;
  slug: string;
  kind: "media" | "target";
}) {
  const isKo = locale.startsWith("ko");
  const node =
    kind === "media"
      ? getMediaCategoryBySlug(slug)
      : getTargetCategoryBySlug(slug);
  const insight =
    kind === "media"
      ? isKo
        ? (node as ReturnType<typeof getMediaCategoryBySlug>)?.insightKo
        : (node as ReturnType<typeof getMediaCategoryBySlug>)?.insightEn
      : (node as ReturnType<typeof getTargetCategoryBySlug>)?.descriptionKo;
  const faq =
    kind === "media"
      ? isKo
        ? (node as ReturnType<typeof getMediaCategoryBySlug>)?.faqKo
        : (node as ReturnType<typeof getMediaCategoryBySlug>)?.faqEn
      : isKo
        ? (node as ReturnType<typeof getTargetCategoryBySlug>)?.faqKo
        : (node as ReturnType<typeof getTargetCategoryBySlug>)?.faqEn;

  if (!insight && (!faq || faq.length === 0)) return null;

  return (
    <section className="border-t border-border/80 bg-muted/40 py-12 sm:py-16">
      <div className="ui-container max-w-4xl">
        {insight ? (
          <div className="mb-10">
            <h2 className="text-xl font-bold tracking-tight sm:text-2xl">
              {isKo ? "카테고리 인사이트" : "Category insights"}
            </h2>
            <p className="mt-4 text-base leading-relaxed text-muted-foreground">
              {insight}
            </p>
          </div>
        ) : null}
        {faq && faq.length > 0 ? (
          <div>
            <h2 className="text-xl font-bold tracking-tight sm:text-2xl">
              {isKo ? "자주 묻는 질문" : "FAQ"}
            </h2>
            <dl className="mt-6 space-y-4">
              {faq.map((item) => (
                <div
                  key={item.q}
                  className="rounded-2xl border border-border bg-card p-5"
                >
                  <dt className="font-semibold text-foreground">{item.q}</dt>
                  <dd className="mt-2 text-sm leading-relaxed text-muted-foreground">
                    {item.a}
                  </dd>
                </div>
              ))}
            </dl>
          </div>
        ) : null}
      </div>
    </section>
  );
}

export function TargetLandingGuide({
  locale,
  slug,
}: {
  locale: string;
  slug: string;
}) {
  const isKo = locale.startsWith("ko");
  const node = getTargetCategoryBySlug(slug);
  const steps = isKo ? node?.guideStepsKo : node?.guideStepsEn;
  if (!steps?.length) return null;

  return (
    <section className="border-t border-border/80 py-12 sm:py-16">
      <div className="ui-container max-w-3xl">
        <h2 className="text-xl font-bold tracking-tight sm:text-2xl">
          {isKo ? "진행 가이드" : "How it works"}
        </h2>
        <ol className="mt-6 space-y-3">
          {steps.map((step, i) => (
            <li
              key={step}
              className="flex gap-4 rounded-2xl border border-border bg-card px-5 py-4"
            >
              <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-[color:var(--qp-accent-soft)] text-sm font-black text-cyan-700 dark:text-cyan-200">
                {i + 1}
              </span>
              <span className="text-sm font-medium leading-relaxed sm:text-base">
                {step}
              </span>
            </li>
          ))}
        </ol>
        {node?.popularTagsKo?.length && isKo ? (
          <div className="mt-8 flex flex-wrap gap-2">
            {node.popularTagsKo.map((tag) => (
              <span
                key={tag}
                className="rounded-full border border-violet-500/30 bg-violet-500/10 px-3 py-1 text-xs font-semibold text-violet-700 dark:text-violet-200"
              >
                {tag}
              </span>
            ))}
          </div>
        ) : null}
      </div>
    </section>
  );
}

export function CategoryLandingCta({
  locale,
  slug,
  kind,
  label,
}: {
  locale: string;
  slug: string;
  kind: "media" | "target";
  label: string;
}) {
  const isKo = locale.startsWith("ko");
  const href =
    kind === "media"
      ? `/contact?topic=media-category&slug=${slug}`
      : `/contact?topic=target&slug=${slug}`;

  return (
    <section className="border-t border-border/80 bg-muted py-12 sm:py-16">
      <div className="ui-container flex flex-col items-center text-center">
        <h2 className="text-xl font-bold sm:text-2xl">
          {isKo ? `${label} 견적 받기` : `Get a quote for ${label}`}
        </h2>
        <p className="mt-3 max-w-lg text-sm text-muted-foreground sm:text-base">
          {isKo
            ? "매체 선택부터 일정·소재까지 THINKAD 팀이 도와드립니다."
            : "Our team helps with media selection, scheduling, and creative."}
        </p>
        <Link
          href={href}
          className="tkad-qp-cta mt-6 inline-flex h-14 items-center justify-center rounded-[22px] px-10 text-base font-black"
        >
          {isKo ? "견적 문의" : "Contact us"}
        </Link>
      </div>
    </section>
  );
}

export function CategoryLandingMediaGrid({
  items,
  locale,
  title,
}: {
  items: MediaItem[];
  locale: string;
  title: string;
}) {
  return (
    <section className="py-12 sm:py-16">
      <div className="ui-container">
        <h2 className="text-xl font-bold tracking-tight sm:text-2xl">{title}</h2>
        <ul className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {items.map((m) => (
            <li key={m.id}>
              <MediaCatalogGridCard
                variant="link"
                media={m}
                isKo={locale.startsWith("ko")}
                imagePreparingLabel={
                  locale.startsWith("ko") ? "이미지 준비 중" : "Image preparing"
                }
              />
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

export function CategoryLandingExtraSection({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <section className="border-t border-border/80 py-10 sm:py-14">
      <div className="ui-container">
        <h2 className="text-lg font-bold sm:text-xl">{title}</h2>
        <div className="mt-4">{children}</div>
      </div>
    </section>
  );
}
