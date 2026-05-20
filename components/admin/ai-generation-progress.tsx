"use client";

type LogLine = { id: string; text: string; tone?: "default" | "ok" | "error" };

export function AiGenerationProgress({
  lines,
  busy,
}: {
  lines: LogLine[];
  busy: boolean;
}) {
  if (lines.length === 0 && !busy) return null;
  return (
    <div
      className="rounded-xl border border-cyan-500/25 bg-cyan-500/5 p-3 font-mono text-[11px]"
      aria-live="polite"
    >
      <p className="mb-2 font-bold uppercase tracking-[0.18em] text-cyan-400/90">
        {busy ? "[ 생성 중… ]" : "[ 생성 로그 ]"}
      </p>
      <ul className="max-h-40 space-y-1 overflow-y-auto text-muted-foreground">
        {lines.map((line) => (
          <li
            key={line.id}
            className={
              line.tone === "error"
                ? "text-red-400"
                : line.tone === "ok"
                  ? "text-emerald-400"
                  : undefined
            }
          >
            {`// ${line.text}`}
          </li>
        ))}
      </ul>
    </div>
  );
}
