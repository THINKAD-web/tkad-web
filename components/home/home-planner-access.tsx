import { Link } from "@/i18n/navigation";
import { ArrowRight, BarChart3 } from "lucide-react";

type Props = { locale: string };

export function HomePlannerAccess({ locale }: Props) {
  const isKo = locale.startsWith("ko");

  return (
    <section
      className="border-b border-gray-100 py-4 dark:border-white/5"
      data-screenshot="home-planner-access"
    >
      <Link
        href="/planner"
        className="flex items-center gap-4 rounded-2xl border border-violet-500/20 bg-gradient-to-r from-violet-500/10 to-cyan-500/10 p-4 transition-colors hover:from-violet-500/15 hover:to-cyan-500/15"
      >
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-violet-500/20">
          <BarChart3 className="h-6 w-6 text-violet-500 dark:text-violet-400" aria-hidden />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-bold text-gray-900 dark:text-white">
            {isKo ? "AI 캠페인 플래너" : "AI campaign planner"}
          </p>
          <p className="mt-0.5 text-xs text-gray-500 dark:text-white/55">
            {isKo
              ? "3분 만에 매체 믹스 · 예산 · 일정"
              : "Media mix, budget & timeline in 3 minutes"}
          </p>
        </div>
        <span className="inline-flex shrink-0 items-center gap-1 text-xs font-semibold text-violet-500 dark:text-violet-400">
          {isKo ? "시작" : "Start"}
          <ArrowRight className="h-3.5 w-3.5" aria-hidden />
        </span>
      </Link>
    </section>
  );
}
