"use client";

import { HOME_HUB_EXTRA_SECTION } from "@/lib/navigation/home-hub-grid-config";
import { Link } from "@/i18n/navigation";

type Props = {
  locale: string;
};

export function HomeHubMoreLinks({ locale }: Props) {
  const isKo = locale === "ko";
  const items = HOME_HUB_EXTRA_SECTION.items;

  return (
    <section
      className="mx-auto w-full max-w-6xl px-4 py-4 sm:px-6"
      data-screenshot="home-more-links"
    >
      <p className="text-sm font-medium text-gray-500 dark:text-white/50">
        {isKo ? "더 보기" : "More"}
      </p>
      <div className="mt-2 flex flex-wrap items-center gap-x-1 gap-y-2">
        {items.map((item, index) => (
          <span key={item.id} className="inline-flex items-center">
            {index > 0 ? (
              <span className="mx-2 text-gray-300 dark:text-white/20" aria-hidden>
                ·
              </span>
            ) : null}
            <Link
              href={item.href}
              className="text-sm text-gray-400 underline-offset-2 transition hover:text-gray-700 hover:underline dark:text-white/40 dark:hover:text-white"
            >
              {isKo ? item.labelKo : item.labelEn}
            </Link>
          </span>
        ))}
      </div>
    </section>
  );
}
