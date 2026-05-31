import type { LucideIcon } from "lucide-react";
import { Lightbulb, ShoppingBag, Sparkles, Users } from "lucide-react";
import { cn } from "@/lib/utils";

export type AboutTimelineItem = {
  year: string;
  icon: LucideIcon;
  title: string;
  description: string;
  current?: boolean;
};

type Props = {
  title: string;
  items: AboutTimelineItem[];
  currentLabel?: string;
};

export function AboutBrandTimeline({
  title,
  items,
  currentLabel = "현재",
}: Props) {
  return (
    <section className="py-16 md:py-24">
      <div className="mx-auto max-w-4xl px-4">
        <h2 className="mb-12 text-center text-2xl font-bold text-gray-900 dark:text-white md:text-3xl">
          {title}
        </h2>

        <div className="relative md:mx-auto md:max-w-3xl">
          <div
            className="absolute top-0 bottom-0 left-4 w-px bg-gray-200 dark:bg-white/15 md:left-1/2 md:-translate-x-px"
            aria-hidden
          />

          <ul className="relative space-y-8 md:space-y-12">
            {items.map((item, index) => {
              const Icon = item.icon;
              const isLeft = index % 2 === 0;

              const card = (
                <article
                  className={cn(
                    "rounded-2xl border p-5 md:max-w-sm",
                    item.current
                      ? "border-violet-500/30 bg-violet-500/10"
                      : "border-gray-100 bg-white dark:border-white/10 dark:bg-white/5",
                    isLeft ? "md:text-right" : "md:text-left",
                  )}
                >
                  <div
                    className={cn(
                      "mb-3 flex items-center gap-3",
                      isLeft ? "md:flex-row-reverse" : "",
                    )}
                  >
                    <div
                      className={cn(
                        "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl",
                        item.current
                          ? "bg-violet-500/20 text-violet-500"
                          : "bg-gray-100 text-gray-600 dark:bg-white/10 dark:text-white/70",
                      )}
                    >
                      <Icon className="h-5 w-5" aria-hidden />
                    </div>
                    <div>
                      <p
                        className={cn(
                          "text-sm font-semibold",
                          item.current
                            ? "text-violet-500 dark:text-violet-400"
                            : "text-gray-500 dark:text-white/50",
                        )}
                      >
                        {item.year}
                        {item.current ? (
                          <span className="ml-2 text-xs font-bold uppercase tracking-wide">
                            {currentLabel}
                          </span>
                        ) : null}
                      </p>
                      <h3 className="text-base font-bold text-gray-900 dark:text-white">
                        {item.title}
                      </h3>
                    </div>
                  </div>
                  <p className="text-sm leading-relaxed text-gray-600 dark:text-white/60">
                    {item.description}
                  </p>
                </article>
              );

              return (
                <li
                  key={item.year}
                  className="relative pl-12 md:grid md:grid-cols-[1fr_auto_1fr] md:items-start md:gap-6 md:pl-0"
                >
                  <span
                    className={cn(
                      "absolute top-6 left-[11px] z-10 flex h-3 w-3 rounded-full border-2 md:left-1/2 md:-translate-x-1/2",
                      item.current
                        ? "border-violet-500 bg-violet-500"
                        : "border-gray-300 bg-white dark:border-white/30 dark:bg-[#0A0A0A]",
                    )}
                    aria-hidden
                  />

                  {isLeft ? (
                    <>
                      <div className="md:flex md:justify-end">{card}</div>
                      <div className="hidden md:block" aria-hidden />
                      <div className="hidden md:block" aria-hidden />
                    </>
                  ) : (
                    <>
                      <div className="hidden md:block" aria-hidden />
                      <div className="hidden md:block" aria-hidden />
                      <div>{card}</div>
                    </>
                  )}
                </li>
              );
            })}
          </ul>
        </div>
      </div>
    </section>
  );
}

export const ABOUT_TIMELINE_ICONS = {
  lightbulb: Lightbulb,
  shoppingBag: ShoppingBag,
  users: Users,
  sparkles: Sparkles,
} as const;
