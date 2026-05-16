import { Link } from "@/i18n/navigation";
import { labelForAcademyCategory } from "@/lib/academy-article-category";
import type { RelatedAcademyRow } from "@/lib/academy-article-related";
import type { AcademyArticleCategory } from "@prisma/client";

type Props = {
  isKo: boolean;
  related: RelatedAcademyRow[];
};

function formatDate(d: Date | null, locale: string) {
  if (!d) return "—";
  return d.toLocaleDateString(locale === "ko" ? "ko-KR" : "en-US", {
    month: "short",
    day: "numeric",
  });
}

export function AcademyDetailSidebar({ isKo, related }: Props) {
  return (
    <aside className="space-y-6 lg:sticky lg:top-24 lg:self-start">
      <div className="border-2 border-black bg-[#FF6600] p-5 text-white shadow-[6px_6px_0_0_rgb(0,0,0)]">
        <p className="font-mono text-[10px] font-bold uppercase tracking-[0.22em] text-white/90">
          [ THINKAD OOH ]
        </p>
        <h2 className="mt-2 text-lg font-bold leading-snug">
          {isKo ? "매체 탐색하기" : "Explore media"}
        </h2>
        <p className="mt-2 text-sm leading-relaxed text-white/90">
          {isKo
            ? "이 가이드를 바탕으로 싱커드 매체 카탈로그에서 후보를 찾아보세요."
            : "Use this guide to browse the THINKAD media catalog."}
        </p>
        <div className="mt-4 flex flex-col gap-2">
          <Link
            href="/media"
            className="inline-flex justify-center border-2 border-black bg-black px-4 py-2.5 font-mono text-[11px] font-bold uppercase tracking-[0.16em] text-white transition-transform hover:-translate-y-0.5"
          >
            {isKo ? "매체 검색" : "Browse media"}
          </Link>
          <Link
            href="/planner"
            className="inline-flex justify-center border-2 border-black bg-white px-4 py-2.5 font-mono text-[11px] font-bold uppercase tracking-[0.16em] text-black transition-transform hover:-translate-y-0.5"
          >
            {isKo ? "AI 플래너" : "AI planner"}
          </Link>
        </div>
      </div>

      <div className="border-2 border-black bg-card p-5 shadow-[4px_4px_0_0_rgb(0,0,0)]">
        <p className="font-mono text-[10px] font-bold uppercase tracking-[0.22em] text-[#FF6600]">
          [ {isKo ? "무료 컨설팅" : "Free consult"} ]
        </p>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
          {isKo
            ? "예산·목표에 맞는 매체 믹스를 전문가가 제안해 드립니다."
            : "Get a tailored media mix recommendation from our team."}
        </p>
        <Link
          href="/contact"
          className="mt-4 inline-flex w-full justify-center border-2 border-black bg-foreground px-4 py-2.5 font-mono text-[11px] font-bold uppercase tracking-[0.16em] text-background transition-transform hover:-translate-y-0.5 hover:shadow-[4px_4px_0_0_rgb(255,102,0)]"
        >
          {isKo ? "무료 컨설팅 신청" : "Request consultation"}
        </Link>
        <Link
          href="/quote"
          className="mt-2 inline-flex w-full justify-center border-2 border-black/20 px-4 py-2 font-mono text-[10px] font-bold uppercase tracking-[0.14em] text-foreground hover:border-black"
        >
          {isKo ? "견적 요청" : "Get a quote"}
        </Link>
      </div>

      {related.length > 0 ? (
        <div className="border-2 border-black bg-card p-4 shadow-[4px_4px_0_0_rgb(0,0,0)]">
          <p className="font-mono text-[10px] font-bold uppercase tracking-[0.22em] text-[#FF6600]">
            [ {isKo ? "관련 아티클" : "Related"} ]
          </p>
          <ul className="mt-3 space-y-3">
            {related.map((r) => (
              <li key={r.slug}>
                <Link href={`/academy/${r.slug}`} className="group block">
                  <span className="font-mono text-[9px] font-bold uppercase tracking-[0.16em] text-muted-foreground">
                    {labelForAcademyCategory(r.category, isKo)} ·{" "}
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
