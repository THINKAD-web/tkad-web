import { Link } from "@/i18n/navigation";
import { ArrowRight, MessageCircle, Sparkles } from "lucide-react";
import type { BeginnerTrustMetric } from "@/lib/guides-beginner-content";

type Props = {
  isKo: boolean;
  title: string;
  mediaCta: string;
  plannerCta: string;
  contactCta: string;
  trustMetrics: BeginnerTrustMetric[];
};

export function GuidesBeginnerCta({
  isKo,
  title,
  mediaCta,
  plannerCta,
  contactCta,
  trustMetrics,
}: Props) {
  return (
    <section className="relative overflow-hidden rounded-[32px] border dark:border-white/12 border-gray-200 dark:bg-white/6 bg-gray-50 px-6 py-12 text-center backdrop-blur tkad-neon-border sm:px-10 sm:py-16">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(168,85,247,0.2),transparent_55%),radial-gradient(circle_at_50%_100%,rgba(34,211,238,0.16),transparent_55%)]"
      />
      <div className="relative">
        <p className="font-display text-xs font-medium uppercase tracking-[0.22em] text-cyan-300/90">
          [ {isKo ? "시작하기" : "GET STARTED"} ]
        </p>
        <h2 className="mt-3 text-2xl font-black dark:text-white text-gray-900 sm:text-3xl">{title}</h2>

        <ul className="mx-auto mt-8 grid max-w-2xl grid-cols-1 gap-3 sm:grid-cols-3">
          {trustMetrics.map((m) => (
            <li
              key={m.labelKo}
              className="rounded-2xl border dark:border-white/12 border-gray-200 dark:bg-black bg-white/25 px-4 py-4"
            >
              <p className="text-2xl font-black text-cyan-200">
                {isKo ? m.valueKo : m.valueEn}
              </p>
              <p className="mt-1 text-xs font-semibold leading-snug dark:text-white text-gray-600">
                {isKo ? m.labelKo : m.labelEn}
              </p>
            </li>
          ))}
        </ul>

        <div className="mt-8 flex flex-col items-stretch justify-center gap-3 sm:flex-row sm:flex-wrap">
          <Link
            href="/media"
            className="tkad-neon-cta-clean inline-flex h-12 items-center justify-center gap-2 rounded-[18px] px-6 text-sm font-black dark:text-white text-gray-900"
          >
            {mediaCta}
            <ArrowRight className="h-4 w-4" aria-hidden />
          </Link>
          <Link
            href="/planner"
            className="inline-flex h-12 items-center justify-center gap-2 rounded-[18px] border dark:border-white/14 border-gray-200 dark:bg-white/8 bg-gray-100 px-6 text-sm font-bold dark:text-white text-gray-900 hover:bg-white/12"
          >
            <Sparkles className="h-4 w-4 text-pink-300" aria-hidden />
            {plannerCta}
          </Link>
          <Link
            href="/contact"
            className="inline-flex h-12 items-center justify-center gap-2 rounded-[18px] border dark:border-white/14 border-gray-200 dark:bg-white/8 bg-gray-100 px-6 text-sm font-bold dark:text-white text-gray-900 hover:bg-white/12"
          >
            <MessageCircle className="h-4 w-4 text-cyan-300" aria-hidden />
            {contactCta}
          </Link>
        </div>
      </div>
    </section>
  );
}
