import type { BeginnerBasicsCard } from "@/lib/guides-beginner-content";

type Props = {
  cards: BeginnerBasicsCard[];
  isKo: boolean;
};

export function GuidesBeginnerBasicsGrid({ cards, isKo }: Props) {
  return (
    <div className="mt-8 grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
      {cards.map((card, i) => {
        const Icon = card.icon;
        return (
          <article
            key={card.id}
            className="rounded-[28px] border border-white/12 bg-white/6 p-6 backdrop-blur tkad-neon-border sm:p-8"
          >
            <div className="mb-4 flex items-center justify-between">
              <span className="font-mono text-[10px] font-bold uppercase tracking-[0.22em] text-white/55">
                [{String(i + 1).padStart(2, "0")}]
              </span>
              <Icon className="h-6 w-6 text-cyan-300/90" aria-hidden />
            </div>
            <h3 className="text-lg font-black text-white">
              {isKo ? card.titleKo : card.titleEn}
            </h3>
            <p className="mt-3 text-sm leading-relaxed text-white/76">
              {isKo ? card.summaryKo : card.summaryEn}
            </p>
            <ul className="mt-4 space-y-2">
              {(isKo ? card.bulletsKo : card.bulletsEn).map((b) => (
                <li
                  key={b}
                  className="flex gap-2 text-xs leading-relaxed text-white/65 before:shrink-0 before:content-['·']"
                >
                  {b}
                </li>
              ))}
            </ul>
          </article>
        );
      })}
    </div>
  );
}
