import { Heart, Rocket, FileText } from "lucide-react";

type Props = {
  favorites: number;
  inProgress: number;
  totalQuotes: number;
};

const cards = [
  {
    key: "favorites" as const,
    label: "FAVORITES",
    labelKo: "관심 매체",
    icon: Heart,
  },
  {
    key: "inProgress" as const,
    label: "IN PROGRESS",
    labelKo: "진행 캠페인",
    icon: Rocket,
  },
  {
    key: "totalQuotes" as const,
    label: "QUOTES",
    labelKo: "전체 견적서",
    icon: FileText,
  },
];

export function SummaryCards({ favorites, inProgress, totalQuotes }: Props) {
  const values = { favorites, inProgress, totalQuotes };
  return (
    <section className="mb-8 grid grid-cols-2 gap-0 sm:grid-cols-3">
      {cards.map((c) => {
        const Icon = c.icon;
        return (
          <article
            key={c.key}
            className="-mt-[2px] -ml-[2px] border-2 border-border bg-card p-4 transition-colors hover:bg-muted"
          >
            <div className="mb-3 flex items-center justify-between">
              <span className="font-display text-xs font-medium uppercase tracking-[0.22em] text-accent">
                [ {c.label} ]
              </span>
              <span className="flex h-8 w-8 items-center justify-center border-2 border-border bg-accent text-accent-foreground">
                <Icon className="h-4 w-4" strokeWidth={2.5} />
              </span>
            </div>
            <p className="text-xs text-muted-foreground mb-1">{c.labelKo}</p>
            <div className="font-display text-3xl font-bold tabular-nums text-foreground">
              {values[c.key]}
            </div>
          </article>
        );
      })}
    </section>
  );
}
