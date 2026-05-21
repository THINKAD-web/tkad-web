import type { BeginnerFaqItem } from "@/lib/guides-beginner-content";

type Props = {
  items: BeginnerFaqItem[];
  isKo: boolean;
};

export function GuidesBeginnerFaq({ items, isKo }: Props) {
  return (
    <div className="mx-auto mt-8 max-w-3xl space-y-3">
      {items.map((f, i) => (
        <details
          key={i}
          className="group rounded-2xl border dark:border-white/12 border-gray-200 dark:bg-white/5 bg-gray-50 px-5 py-4 backdrop-blur open:dark:bg-white/8 bg-gray-100"
        >
          <summary className="cursor-pointer list-none text-sm font-bold dark:text-white text-gray-900 marker:content-none [&::-webkit-details-marker]:hidden">
            {isKo ? f.questionKo : f.questionEn}
          </summary>
          <p className="mt-3 text-sm leading-relaxed dark:text-white">
            {isKo ? f.answerKo : f.answerEn}
          </p>
        </details>
      ))}
    </div>
  );
}
