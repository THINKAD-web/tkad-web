import { Link } from "@/i18n/navigation";
import { labelForReportCategory } from "@/lib/report-category";
import type { RelatedReportRow } from "@/lib/report-related";
import type { ReportCategory } from "@prisma/client";

type Props = {
  isKo: boolean;
  category: ReportCategory;
  related: RelatedReportRow[];
};

function formatDate(d: Date | null, locale: string) {
  if (!d) return "—";
  return d.toLocaleDateString(locale === "ko" ? "ko-KR" : "en-US", {
    month: "short",
    day: "numeric",
  });
}

export function ReportDetailSidebar({ isKo, category, related }: Props) {
  return (
    <aside className="space-y-6 lg:sticky lg:top-24 lg:self-start">
      <div className="border-2 border-black bg-[#FF6600] p-5 text-white shadow-[6px_6px_0_0_rgb(0,0,0)]">
        <p className="font-mono text-[10px] font-bold uppercase tracking-[0.22em] text-white/90">
          [ THINKAD OOH ]
        </p>
        <h2 className="mt-2 text-lg font-bold leading-snug">
          {isKo ? "매체·견적 문의" : "Media & quote inquiry"}
        </h2>
        <p className="mt-2 text-sm leading-relaxed text-white/90">
          {isKo
            ? "리포트를 바탕으로 맞춤 매체 믹스와 견적을 받아보세요."
            : "Get a tailored media mix and quote based on your goals."}
        </p>
        <div className="mt-4 flex flex-col gap-2">
          <Link
            href="/quote"
            className="inline-flex justify-center border-2 border-black bg-black px-4 py-2.5 font-mono text-[11px] font-bold uppercase tracking-[0.16em] text-white transition-transform hover:-translate-y-0.5"
          >
            {isKo ? "견적 요청" : "Request quote"}
          </Link>
          <Link
            href="/planner"
            className="inline-flex justify-center border-2 border-black bg-white px-4 py-2.5 font-mono text-[11px] font-bold uppercase tracking-[0.16em] text-black transition-transform hover:-translate-y-0.5"
          >
            {isKo ? "AI 플래너" : "AI planner"}
          </Link>
          <Link
            href="/media"
            className="inline-flex justify-center border-2 border-black/30 bg-transparent px-4 py-2 font-mono text-[10px] font-bold uppercase tracking-[0.14em] text-white/95 hover:bg-white/10"
          >
            {isKo ? "매체 검색" : "Browse media"}
          </Link>
        </div>
      </div>

      {related.length > 0 ? (
        <div className="border-2 border-black bg-card p-4 shadow-[4px_4px_0_0_rgb(0,0,0)]">
          <p className="font-mono text-[10px] font-bold uppercase tracking-[0.22em] text-[#FF6600]">
            [ {isKo ? "관련 리포트" : "Related"} ]
          </p>
          <ul className="mt-3 space-y-3">
            {related.map((r) => (
              <li key={r.slug}>
                <Link
                  href={`/report/${r.slug}`}
                  className="group block"
                >
                  <span className="font-mono text-[9px] font-bold uppercase tracking-[0.16em] text-muted-foreground">
                    {labelForReportCategory(r.category, isKo)} ·{" "}
                    {formatDate(r.publishedAt, isKo ? "ko" : "en")}
                  </span>
                  <p className="mt-1 line-clamp-2 text-sm font-bold leading-snug text-foreground group-hover:text-[#FF6600]">
                    {r.title}
                  </p>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </aside>
  );
}
