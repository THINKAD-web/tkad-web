"use client";

import { useTranslations } from "next-intl";
import { ArrowRight, Briefcase } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
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
    <Card className="border-navy/10 shadow-sm">
      <CardHeader className="space-y-1">
        <CardTitle className="flex items-center gap-2 text-navy">
          <Briefcase className="h-5 w-5 text-gold" aria-hidden />
          {t("title")}
        </CardTitle>
        <p className="text-xs text-muted-foreground">{t("desc")}</p>
      </CardHeader>
      <CardContent>
        <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {cases.map((c) => {
            const title = isKo ? c.titleKo : c.titleEn || c.titleKo;
            return (
              <li key={c.id}>
                <Link
                  href={`/cases/${c.id}`}
                  className={cn(
                    "group flex h-full flex-col gap-2 rounded-xl border border-navy/10 bg-card p-3 shadow-sm transition",
                    "hover:border-gold/40 hover:shadow-md",
                  )}
                >
                  <div className="flex items-start justify-between gap-2">
                    <Badge
                      variant="outline"
                      className="rounded-full border-navy/15 bg-slate-50 text-[10px] font-semibold text-navy/70"
                    >
                      {c.industry}
                    </Badge>
                    <ArrowRight
                      className="h-3.5 w-3.5 text-muted-foreground transition group-hover:text-gold"
                      aria-hidden
                    />
                  </div>
                  <p className="line-clamp-2 text-sm font-bold text-navy">
                    {title}
                  </p>
                  <p className="line-clamp-3 text-xs leading-relaxed text-muted-foreground">
                    {c.summaryKo}
                  </p>
                  <p className="mt-auto text-[11px] font-semibold text-gold-dark">
                    {c.clientName}
                  </p>
                </Link>
              </li>
            );
          })}
        </ul>
      </CardContent>
    </Card>
  );
}
