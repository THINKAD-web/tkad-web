import type { BeginnerTimelineStep } from "@/lib/guides-beginner-content";

type Props = {
  steps: BeginnerTimelineStep[];
  isKo: boolean;
};

export function GuidesBeginnerTimeline({ steps, isKo }: Props) {
  return (
    <ol className="relative mt-8 space-y-0">
      {steps.map((step, i) => (
        <li key={step.step} className="relative flex gap-4 pb-10 last:pb-0">
          {i < steps.length - 1 ? (
            <span
              aria-hidden
              className="absolute left-[1.125rem] top-10 bottom-0 w-px bg-gradient-to-b from-cyan-400/50 to-transparent"
            />
          ) : null}
          <div className="relative z-10 flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-cyan-400/40 bg-cyan-500/15 font-mono text-xs font-black text-cyan-200">
            {step.step}
          </div>
          <div className="min-w-0 flex-1 rounded-2xl border border-white/12 bg-white/5 p-5 backdrop-blur">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="text-base font-black text-white">
                {isKo ? step.titleKo : step.titleEn}
              </h3>
              <span className="rounded-lg border border-white/10 bg-black/30 px-2 py-0.5 font-mono text-[10px] font-bold uppercase tracking-[0.16em] text-white/55">
                {isKo ? step.durationKo : step.durationEn}
              </span>
            </div>
            <p className="mt-2 text-sm leading-relaxed text-white/72">
              {isKo ? step.bodyKo : step.bodyEn}
            </p>
          </div>
        </li>
      ))}
    </ol>
  );
}
