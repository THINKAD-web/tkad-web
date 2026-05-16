import { Link } from "@/i18n/navigation";

export function HomeMediaPartnerCta({ isKo }: { isKo: boolean }) {
  return (
    <section className="border-b-2 border-black bg-[#FF6600]">
      <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4 px-4 py-4 sm:px-6">
        <p className="font-mono text-[11px] font-bold uppercase tracking-[0.16em] text-white sm:text-xs">
          {isKo
            ? "매체사이신가요? 싱커드 카탈로그에 매체를 등록해 보세요."
            : "Media owner? Register your inventory with THINKAD."}
        </p>
        <Link
          href="/register/media"
          className="inline-flex border-2 border-black bg-black px-4 py-2 font-mono text-[10px] font-bold uppercase tracking-[0.14em] text-white transition-transform hover:-translate-y-0.5"
        >
          {isKo ? "매체 등록 신청하기" : "Apply to list media"}
        </Link>
      </div>
    </section>
  );
}
