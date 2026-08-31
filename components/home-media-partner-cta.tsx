import { ArrowRight, Radio } from "lucide-react";
import { Link } from "@/i18n/navigation";

/**
 * 홈 상단 매체사 CTA 배너 — 최신 네온 톤.
 * 다크 글래스 + 보라/시안/핑크 그라데이션 라이닝 + 라이트 모드에서도 가독성 유지.
 */
export function HomeMediaPartnerCta({ isKo }: { isKo: boolean }) {
  return (
    <section
      className="relative isolate overflow-hidden border-y border-gray-200 bg-gradient-to-r from-violet-50/40 via-white to-cyan-50/30 text-gray-900 dark:border-white/10 dark:bg-[#05050a] dark:text-white"
      aria-label={isKo ? "매체사 등록 안내" : "Media partner CTA"}
    >
      {/* 네온 깊이감 + 그리드 (compare / planner 동일 톤) */}
      <div aria-hidden className="absolute inset-0 hidden dark:block tkad-neon-depth" />
      <div aria-hidden className="absolute inset-0 hidden opacity-25 dark:block tkad-neon-grid" />
      <div
        aria-hidden
        className="pointer-events-none absolute -inset-y-12 left-1/2 -z-0 hidden h-[200%] w-[120%] -translate-x-1/2 bg-[radial-gradient(circle_at_30%_50%,rgba(168,85,247,0.32),transparent_55%),radial-gradient(circle_at_75%_50%,rgba(34,211,238,0.28),transparent_55%),radial-gradient(circle_at_50%_50%,rgba(236,72,153,0.18),transparent_60%)] dark:block"
      />

      <div className="relative mx-auto flex max-w-7xl flex-col gap-3 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6 sm:py-5">
        <div className="flex min-w-0 items-start gap-3 sm:items-center">
          <span
            className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full border dark:border-white/18 border-gray-300 dark:bg-white/10 bg-gray-100 dark:text-white text-gray-900 shadow-[0_8px_28px_rgba(0,0,0,0.45)] backdrop-blur"
            aria-hidden
          >
            <Radio className="h-4 w-4" />
          </span>
          <div className="min-w-0">
            <p className="tkad-type-label dark:text-white text-gray-500 sm:tkad-type-note">
              {`[ ${isKo ? "신규 매체" : "New media"} ]`}
            </p>
            <p className="mt-1 text-balance text-sm font-bold leading-snug dark:text-white text-gray-900 sm:text-base">
              {isKo ? (
                <>신규 매체가 있으신가요? 싱커드 카탈로그에 매체를 등록해 보세요.</>
              ) : (
                <>
                  Have new media to list? Register your inventory with THINKAD.
                </>
              )}
            </p>
          </div>
        </div>
        <Link
          href="/register/media"
          className="group inline-flex shrink-0 items-center gap-1.5 self-start rounded-full border border-white/22 bg-[linear-gradient(135deg,rgba(168,85,247,0.95),rgba(34,211,238,0.95),rgba(236,72,153,0.95))] px-4 py-2 tkad-type-label dark:text-white text-gray-900 shadow-[0_14px_44px_rgba(0,0,0,0.5)] transition-transform hover:-translate-y-0.5 sm:self-auto sm:px-5"
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
