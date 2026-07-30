"use client";

import { MessageSquareQuote } from "lucide-react";
import { useMemo } from "react";
import type { HomePrecisionExample } from "@/lib/home-precision-examples";

type ColumnLabels = {
  region: string;
  target: string;
  goal: string;
  budget: string;
};

type Props = {
  examples: HomePrecisionExample[];
  exampleLabel: string;
  hint: string;
  columnLabels: ColumnLabels;
};

function pickRandomExample(examples: HomePrecisionExample[]): HomePrecisionExample {
  return examples[Math.floor(Math.random() * examples.length)] ?? examples[0]!;
}

export function HomePrecisionExamplePanel({
  examples,
  exampleLabel,
  hint,
  columnLabels,
}: Props) {
  const example = useMemo(() => pickRandomExample(examples), [examples]);

  const rows: Array<{ key: keyof ColumnLabels; value: string }> = [
    { key: "region", value: example.region },
    { key: "target", value: example.target },
    { key: "goal", value: example.goal },
    { key: "budget", value: example.budget },
  ];

  return (
    <div className="min-w-0 flex-1">
      <div className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm ring-1 ring-black/[0.04] dark:border-white/10 dark:bg-white/[0.03] dark:ring-white/10">
        <div className="flex items-start gap-2.5 border-b border-gray-100 bg-gray-50/90 px-3 py-3 dark:border-white/10 dark:bg-white/[0.05] sm:px-4">
          <MessageSquareQuote
            className="mt-0.5 h-4 w-4 shrink-0 text-hermes"
            aria-hidden
          />
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-[0.08em] text-gray-500 dark:text-white/45">
              {exampleLabel}
            </p>
            <p className="mt-1 font-medium leading-snug text-gray-900 dark:text-white">
              &ldquo;{example.query}&rdquo;
            </p>
          </div>
        </div>

        <table className="w-full text-left text-sm">
          <tbody>
            {rows.map((row, index) => (
              <tr
                key={row.key}
                className={
                  index < rows.length - 1
                    ? "border-b border-gray-100 dark:border-white/[0.06]"
                    : undefined
                }
              >
                <th
                  scope="row"
                  className="w-[28%] whitespace-nowrap px-3 py-2.5 text-xs font-semibold text-gray-500 dark:text-white/45 sm:w-24 sm:px-4 sm:text-sm"
                >
                  {columnLabels[row.key]}
                </th>
                <td className="px-3 py-2.5 font-medium text-gray-900 dark:text-white sm:px-4">
                  {row.value}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p className="mt-3 text-sm leading-relaxed text-gray-600 dark:text-white/60">
        {hint}
      </p>
    </div>
  );
}
