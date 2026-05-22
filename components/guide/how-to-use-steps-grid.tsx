import { Link } from "@/i18n/navigation";
import type { HowToUseStep } from "@/lib/guide-how-to-use-content";
import { ArrowRight } from "lucide-react";

type Props = {
  steps: HowToUseStep[];
  isKo: boolean;
};

export function HowToUseStepsGrid({ steps, isKo }: Props) {
  return (
    <div className="mt-10 grid gap-5 sm:grid-cols-2">
      {steps.map((item) => (
        <article
          key={item.step}
          className="tkad-glass-surface tkad-neon-border flex h-full flex-col rounded-[24px] border p-6 backdrop-blur"
        >
          <div className="flex items-start justify-between gap-3">
            <span className="font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-primary">
              STEP {item.step}
            </span>
            <span className="text-2xl" aria-hidden>
              {item.icon}
            </span>
          </div>
          <h3 className="mt-3 text-lg font-black tracking-tight dark:text-white text-gray-900">
            {isKo ? item.titleKo : item.titleEn}
          </h3>
          <ul className="mt-4 flex-1 space-y-2">
            {(isKo ? item.bulletsKo : item.bulletsEn).map((line) => (
              <li
                key={line}
                className="flex gap-2 text-sm leading-relaxed text-muted-foreground dark:text-white/75"
              >
                <span className="text-primary" aria-hidden>
                  ·
                </span>
                <span>{line}</span>
              </li>
            ))}
          </ul>
          <Link
            href={item.href}
            className="mt-5 inline-flex items-center gap-1.5 font-mono text-xs font-bold uppercase tracking-[0.14em] text-primary transition-opacity hover:opacity-80"
          >
            {isKo ? item.ctaKo : item.ctaEn}
            <ArrowRight className="h-3.5 w-3.5" aria-hidden />
          </Link>
        </article>
      ))}
    </div>
  );
}
