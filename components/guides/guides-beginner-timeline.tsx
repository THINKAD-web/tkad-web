import type { BeginnerTimelineStep } from "@/lib/guides-beginner-content";

type Props = {
  steps: BeginnerTimelineStep[];
  isKo: boolean;
};

function RoleList({
  label,
  items,
}: {
  label: string;
  items: string[];
}) {
  if (items.length === 0) return null;
  return (
    <div className="mt-3">
      <p className="font-mono text-[10px] font-bold uppercase tracking-[0.16em] dark:text-white">
        {label}
      </p>
      <ul className="mt-1.5 space-y-1">
        {items.map((item) => (
          <li
            key={item}
            className="flex gap-2 text-xs leading-relaxed dark:text-white text-gray-600 before:shrink-0 before:content-['·']"
          >
            {item}
          </li>
        ))}
      </ul>
    </div>
  );
}

export function GuidesBeginnerTimeline({ steps, isKo }: Props) {
  return (
    <ol className="relative mt-8 space-y-0">
      {steps.map((step, i) => {
        const thinkad = isKo ? step.thinkadKo : step.thinkadEn;
        const advertiser = isKo ? step.advertiserKo : step.advertiserEn;
        return (
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
            <div className="min-w-0 flex-1 rounded-2xl border dark:border-white/12 border-gray-200 dark:bg-white/5 bg-gray-50 p-5 backdrop-blur">
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="text-base font-black dark:text-white text-gray-900">
                  {isKo ? step.titleKo : step.titleEn}
                </h3>
                <span className="rounded-lg border dark:border-white/10 border-gray-200 dark:bg-black bg-white bg-white/30 px-2 py-0.5 font-mono text-[10px] font-bold uppercase tracking-[0.16em] dark:text-white text-gray-500">
                  {isKo ? step.durationKo : step.durationEn}
                </span>
              </div>
              <p className="mt-2 text-sm leading-relaxed dark:text-white">
                {isKo ? step.bodyKo : step.bodyEn}
              </p>
              <RoleList
                label={isKo ? "싱커드 담당" : "THINKAD"}
                items={thinkad ?? []}
              />
              {advertiser && advertiser.length > 0 ? (
                <RoleList
                  label={isKo ? "광고주" : "Advertiser"}
                  items={advertiser}
                />
              ) : null}
            </div>
          </li>
        );
      })}
    </ol>
  );
}
