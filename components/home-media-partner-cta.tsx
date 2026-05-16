import { ArrowRight, Radio } from "lucide-react";
import { Link } from "@/i18n/navigation";

/**
 * 홈 상단 매체사 CTA 배너 — 최신 네온 톤.
 * 다크 글래스 + 보라/시안/핑크 그라데이션 라이닝 + 라이트 모드에서도 가독성 유지.
 */
export function HomeMediaPartnerCta({ isKo }: { isKo: boolean }) {
  return (
    <section
      className="relative isolate overflow-hidden border-y border-white/10 bg-[#05050a] text-white"
      aria-label={isKo ? "매체사 등록 안내" : "Media partner CTA"}
    >
      {/* 네온 깊이감 + 그리드 (compare / planner 동일 톤) */}
      <div aria-hidden className="absolute inset-0 tkad-neon-depth" />
      <div aria-hidden className="absolute inset-0 opacity-25 tkad-neon-grid" />
      <div
        aria-hidden
        className="pointer-events-none absolute -inset-y-12 left-1/2 -z-0 h-[200%] w-[120%] -translate-x-1/2 bg-[radial-gradient(circle_at_30%_50%,rgba(168,85,247,0.32),transparent_55%),radial-gradient(circle_at_75%_50%,rgba(34,211,238,0.28),transparent_55%),radial-gradient(circle_at_50%_50%,rgba(236,72,153,0.18),transparent_60%)]"
      />

      <div className="relative mx-auto flex max-w-7xl flex-col gap-3 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6 sm:py-5">
        <div className="flex min-w-0 items-start gap-3 sm:items-center">
          <span
            className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-white/18 bg-white/10 text-white shadow-[0_8px_28px_rgba(0,0,0,0.45)] backdrop-blur"
            aria-hidden
          >
            <Radio className="h-4 w-4" />
          </span>
          <div className="min-w-0">
            <p className="font-mono text-[9px] font-bold uppercase tracking-[0.28em] text-white/55 sm:text-[10px]">
              {`[ ${isKo ? "Media Partner" : "Media Partner"} ]`}
            </p>
            <p className="mt-1 text-balance text-sm font-bold leading-snug text-white sm:text-base">
              {isKo ? (
                <>
                  <span className="tkad-home-accent-text">매체사</span>이신가요? 싱커드 카탈로그에 매체를 등록해 보세요.
                </>
              ) : (
                <>
                  <span className="tkad-home-accent-text">Media owner</span>? Register your inventory with THINKAD.
                </>
              )}
            </p>
          </div>
        </div>
        <Link
          href="/register/media"
          className="group inline-flex shrink-0 items-center gap-1.5 self-start rounded-full border border-white/22 bg-[linear-gradient(135deg,rgba(168,85,247,0.95),rgba(34,211,238,0.95),rgba(236,72,153,0.95))] px-4 py-2 font-mono text-[10px] font-bold uppercase tracking-[0.18em] text-white shadow-[0_14px_44px_rgba(0,0,0,0.5)] transition-transform hover:-translate-y-0.5 sm:self-auto sm:px-5"
        >
          {isKo ? "매체 등록 신청하기" : "Apply to list media"}
          <ArrowRight
            className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5"
            aria-hidden
          />
        </Link>
      </div>
    </section>
  );
}
