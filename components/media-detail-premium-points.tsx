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
      className="relative mt-10 border-2 border-border bg-card"
    >
      <div className="px-6 py-7 sm:px-8 sm:py-9">
        <div
          className={
            items.length > 0
              ? "mb-6 flex flex-wrap items-center gap-4 border-b-2 border-border pb-5"
              : "flex flex-wrap items-center gap-4 pb-1"
          }
        >
          <span className="flex h-12 w-12 items-center justify-center border-2 border-border bg-accent text-accent-foreground">
            <Sparkles className="h-6 w-6" strokeWidth={2} aria-hidden />
          </span>
          <div>
            <p className="font-display text-xs font-medium uppercase tracking-[0.22em] text-muted-foreground">
              [ THINKAD PREMIUM SELECTION ]
            </p>
            <h2
              id="media-detail-premium-heading"
              className="mt-1 text-xl font-bold tracking-tight text-foreground sm:text-2xl"
            >
              {title}
            </h2>
          </div>
        </div>
        {items.length === 0 ? null : (
          <ul className="grid grid-cols-1 gap-0 sm:grid-cols-2 xl:grid-cols-3">
            {items.map((line, i) => {
              const Icon = premiumFeatureIconForLabel(line);
              return (
                <li
                  key={`${line}-${i}`}
                  className="group relative -mt-[2px] -ml-[2px] flex items-start gap-4 border-2 border-border bg-card p-6 transition-colors hover:bg-foreground hover:text-background"
                >
                  <span className="flex h-12 w-12 shrink-0 items-center justify-center border-2 border-border bg-hero-void text-accent transition-colors group-hover:bg-accent group-hover:text-background">
                    <Icon className="h-6 w-6" strokeWidth={1.75} aria-hidden />
                  </span>
                  <div className="min-w-0 flex-1">
                    <span className="font-display text-xs font-medium uppercase tracking-[0.22em] text-muted-foreground group-hover:text-hero-fg/60">
                      [{String(i + 1).padStart(2, "0")}]
                    </span>
                    <p className="mt-1 text-base font-bold leading-snug tracking-tight text-foreground group-hover:text-background">
                      {line}
                    </p>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </section>
  );
}
