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
          className="group rounded-2xl border border-white/12 bg-white/5 px-5 py-4 backdrop-blur open:bg-white/8"
        >
          <summary className="cursor-pointer list-none text-sm font-bold text-white marker:content-none [&::-webkit-details-marker]:hidden">
            {isKo ? f.questionKo : f.questionEn}
          </summary>
          <p className="mt-3 text-sm leading-relaxed text-white/72">
            {isKo ? f.answerKo : f.answerEn}
          </p>
        </details>
      ))}
    </div>
  );
}
