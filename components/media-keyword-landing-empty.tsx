import { Link } from "@/i18n/navigation";
import { ArrowRight } from "lucide-react";

/**
 * 키워드 랜딩에서 카탈로그 0건일 때 — `tkad-planner-neon` 하위 카드 톤과 맞춤.
 */
export function MediaKeywordLandingEmpty({
  message,
  ctaLabel,
  ctaHref = "/media",
}: {
  message: string;
  ctaLabel: string;
  ctaHref?: string;
}) {
  return (
    <section className="tkad-media-browse-main border-t border-border/60 bg-card py-12 sm:py-16">
      <div className="ui-container">
        <div className="rounded-[28px] border-2 border-border bg-muted/40 p-10 text-center backdrop-blur-sm sm:p-14">
          <p className="mx-auto max-w-2xl font-mono text-xs uppercase leading-relaxed tracking-[0.18em] text-muted-foreground sm:text-sm">
            {`// ${message}`}
          </p>
          <Link
            href={ctaHref}
            className="mt-8 inline-flex h-14 items-center justify-center gap-2 rounded-[22px] bg-primary px-10 text-sm font-black text-primary-foreground shadow-md transition-transform hover:-translate-y-0.5 hover:opacity-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 sm:text-base"
          >
            {ctaLabel}
            <ArrowRight className="h-4 w-4" aria-hidden />
          </Link>
        </div>
      </div>
    </section>
  );
}
