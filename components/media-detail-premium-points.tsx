import { Sparkles } from "lucide-react";
import { premiumFeatureIconForLabel } from "@/lib/media-premium-feature-icons";

export default function MediaDetailPremiumPoints({
  title,
  items,
}: {
  title: string;
  items: string[];
}) {
  return (
    <section
      aria-labelledby="media-detail-premium-heading"
      className="relative mt-10 overflow-hidden rounded-3xl border-2 border-gold-dark/50 bg-gradient-to-br from-navy/[0.03] via-gold-light/35 to-gold/25 p-1 shadow-[0_20px_50px_-12px_rgba(26,42,108,0.18)] sm:p-1.5"
    >
      <div className="rounded-[1.35rem] bg-white/95 px-5 py-7 shadow-inner ring-1 ring-navy/[0.06] sm:px-8 sm:py-9">
        <div
          className={
            items.length > 0
              ? "mb-6 flex flex-wrap items-center gap-3 border-b border-gold-dark/20 pb-5"
              : "flex flex-wrap items-center gap-3 pb-1"
          }
        >
          <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-gold to-gold-dark text-navy shadow-md ring-2 ring-gold-light/60">
            <Sparkles className="h-6 w-6" strokeWidth={1.75} aria-hidden />
          </span>
          <div>
            <h2
              id="media-detail-premium-heading"
              className="text-xl font-bold tracking-tight text-navy sm:text-2xl"
            >
              {title}
            </h2>
            <p className="mt-0.5 text-xs font-medium text-navy/55">
              THINKAD Premium Selection
            </p>
          </div>
        </div>
        {items.length === 0 ? null : (
        <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {items.map((line, i) => {
            const Icon = premiumFeatureIconForLabel(line);
            return (
              <li
                key={`${line}-${i}`}
                className="group relative flex flex-col gap-4 overflow-hidden rounded-2xl border-2 border-navy/[0.09] bg-gradient-to-br from-white via-white to-gold-light/20 p-6 shadow-[0_12px_40px_-8px_rgba(26,42,108,0.12)] ring-2 ring-gold-dark/20 transition-[box-shadow,transform,border-color] duration-200 hover:-translate-y-1 hover:border-gold-dark/35 hover:shadow-xl hover:shadow-gold-dark/15"
              >
                <span
                  className="pointer-events-none absolute -right-8 -top-8 h-32 w-32 rounded-full bg-gradient-to-br from-gold/25 to-navy/5 blur-2xl transition-opacity group-hover:opacity-100"
                  aria-hidden
                />
                <span className="relative flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-navy via-navy to-navy-light text-gold-light shadow-lg shadow-navy/25 ring-2 ring-gold-dark/30 ring-offset-2 ring-offset-white">
                  <Icon className="h-7 w-7" strokeWidth={1.6} aria-hidden />
                </span>
                <p className="relative text-base font-bold leading-snug tracking-tight text-navy">
                  {line}
                </p>
              </li>
            );
          })}
        </ul>
        )}
      </div>
    </section>
  );
}
