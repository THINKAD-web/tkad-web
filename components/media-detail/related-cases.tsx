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
    <section className="overflow-hidden rounded-[28px] border border-border/80 bg-card/80 shadow-sm backdrop-blur">
      <header className="border-b border-border/70 px-6 py-5">
        <div className="flex items-center gap-2 font-display text-xs font-medium uppercase tracking-[0.22em] text-accent">
          <Briefcase className="h-3.5 w-3.5" aria-hidden />
          [ RELATED CASES ]
        </div>
        <h2 className="mt-2 text-xl font-bold tracking-tight text-foreground">
          {t("title")}
        </h2>
        <p className="mt-1 text-[11px] tracking-tight text-muted-foreground">
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
                  className="group flex h-full flex-col gap-2 rounded-[22px] border border-border/80 bg-card/80 p-4 shadow-xs backdrop-blur transition-colors hover:bg-muted/50"
                >
                  <div className="flex items-start justify-between gap-2">
                    <span className="rounded-xl border border-border/80 bg-card/70 px-2.5 py-1 font-display text-[10px] font-black uppercase tracking-[0.18em] text-foreground shadow-xs backdrop-blur">
                      {c.industry}
                    </span>
                    <ArrowRight
                      className="h-3.5 w-3.5 text-muted-foreground transition-colors group-hover:text-accent"
                      aria-hidden
                    />
                  </div>
                  <p className="line-clamp-2 text-sm font-bold leading-snug tracking-tight text-foreground">
                    {title}
                  </p>
                  <p className="line-clamp-3 text-[11px] leading-relaxed tracking-tight text-muted-foreground">
                    {c.summaryKo}
                  </p>
                  <p className="mt-auto font-display text-xs font-medium uppercase tracking-[0.18em] text-accent">
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
