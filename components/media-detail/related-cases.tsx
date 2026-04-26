"use client";

import { useTranslations } from "next-intl";
import { ArrowRight, Briefcase } from "lucide-react";
import { Link } from "@/i18n/navigation";
import type { PublicSuccessCaseListItem } from "@/lib/success-case-public";

type Props = {
  cases: PublicSuccessCaseListItem[];
  isKo: boolean;
};

/**
 * 매체 상세에서 "이 매체로 진행한 캠페인" 사례 카드 그리드.
 * cases 가 0 건이면 컴포넌트는 null 반환 (호출처에서 검사하지 않아도 됨).
 */
export function RelatedCases({ cases, isKo }: Props) {
  const t = useTranslations("mediaDetail.relatedCases");
  if (cases.length === 0) return null;

  return (
    <section className="border-2 border-bx-black bg-bx-white">
      <header className="border-b-2 border-bx-black px-6 py-5">
        <div className="flex items-center gap-2 font-mono text-[10px] font-bold uppercase tracking-[0.22em] text-bx-accent">
          <Briefcase className="h-3.5 w-3.5" aria-hidden />
          [ RELATED CASES ]
        </div>
        <h2 className="mt-2 text-xl font-bold tracking-tight text-bx-black">
          {t("title")}
        </h2>
        <p className="mt-1 font-mono text-[11px] tracking-tight text-bx-gray-dim">
          {t("desc")}
        </p>
      </header>
      <div className="p-6">
        <ul className="grid grid-cols-1 gap-0 sm:grid-cols-2 lg:grid-cols-3">
          {cases.map((c) => {
            const title = isKo ? c.titleKo : c.titleEn || c.titleKo;
            return (
              <li key={c.id} className="-mt-[2px] -ml-[2px]">
                <Link
                  href={`/cases/${c.id}`}
                  className="group flex h-full flex-col gap-2 border-2 border-bx-black bg-bx-white p-4 transition-colors hover:bg-bx-off"
                >
                  <div className="flex items-start justify-between gap-2">
                    <span className="border-2 border-bx-black bg-bx-white px-2 py-0.5 font-mono text-[10px] font-bold uppercase tracking-[0.18em] text-bx-black">
                      {c.industry}
                    </span>
                    <ArrowRight
                      className="h-3.5 w-3.5 text-bx-gray-dim transition-colors group-hover:text-bx-accent"
                      aria-hidden
                    />
                  </div>
                  <p className="line-clamp-2 text-sm font-bold leading-snug tracking-tight text-bx-black">
                    {title}
                  </p>
                  <p className="line-clamp-3 font-mono text-[11px] leading-relaxed tracking-tight text-bx-gray-dim">
                    {c.summaryKo}
                  </p>
                  <p className="mt-auto font-mono text-[10px] font-bold uppercase tracking-[0.18em] text-bx-accent">
                    {`// `}
                    {c.clientName}
                  </p>
                </Link>
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
}
