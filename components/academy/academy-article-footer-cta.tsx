import { Link } from "@/i18n/navigation";

export function AcademyArticleFooterCta({ isKo }: { isKo: boolean }) {
  return (
    <section className="mt-12 grid gap-4 border-t-2 border-black pt-10 sm:grid-cols-2">
      <div className="border-2 border-black bg-card p-6 shadow-[4px_4px_0_0_rgb(0,0,0)]">
        <p className="font-mono text-[10px] font-bold uppercase tracking-[0.22em] text-[#FF6600]">
          [ {isKo ? "다음 단계" : "Next step"} ]
        </p>
        <h2 className="mt-2 text-lg font-bold">
          {isKo
            ? "이 내용을 바탕으로 매체 탐색하기"
            : "Explore media with this guide"}
        </h2>
        <p className="mt-2 text-sm text-muted-foreground">
          {isKo
            ? "싱커드 카탈로그에서 지역·포맷·예산에 맞는 매체를 찾아보세요."
            : "Find formats and regions that match your plan in the catalog."}
        </p>
        <Link
          href="/media"
          className="mt-4 inline-flex border-2 border-black bg-[#FF6600] px-5 py-2.5 font-mono text-[11px] font-bold uppercase tracking-[0.16em] text-white transition-transform hover:-translate-y-0.5"
        >
          {isKo ? "매체 검색" : "Browse media"}
        </Link>
      </div>
      <div className="border-2 border-black bg-foreground p-6 text-background shadow-[4px_4px_0_0_rgb(255,102,0)]">
        <p className="font-mono text-[10px] font-bold uppercase tracking-[0.22em] text-white/80">
          [ {isKo ? "전문가 상담" : "Expert help"} ]
        </p>
        <h2 className="mt-2 text-lg font-bold">
          {isKo ? "무료 컨설팅 신청" : "Free consultation"}
        </h2>
        <p className="mt-2 text-sm text-white/85">
          {isKo
            ? "목표·예산에 맞는 OOH 믹스를 THINKAD 팀이 제안해 드립니다."
            : "Our team will propose an OOH mix for your goals and budget."}
        </p>
        <Link
          href="/contact"
          className="mt-4 inline-flex border-2 border-black bg-white px-5 py-2.5 font-mono text-[11px] font-bold uppercase tracking-[0.16em] text-black transition-transform hover:-translate-y-0.5"
        >
          {isKo ? "컨설팅 신청" : "Apply now"}
        </Link>
      </div>
    </section>
  );
}
