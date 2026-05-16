"use client";

import type { ReactNode } from "react";
import { usePathname } from "next/navigation";
import { Link } from "@/i18n/navigation";
import { HomeLandingDayNight } from "@/components/home-landing-day-night";
import { ArrowLeft, BookOpen, Film, ListMusic, Upload } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * `/creatives/*` 모든 페이지가 공유하는 네온 셸 (히어로 + 좌측 네브).
 *
 * 디자인:
 *  - 다크 히어로 + `tkad-neon-depth/grid` (compare/planner 와 동일)
 *  - 본문은 라이트 모드에서도 라이트 카드로 변환되도록 `tkad-glass-surface` 사용
 *  - 하위 페이지마다 title/eyebrow/right slot 지정
 */
export function CreativesShell({
  eyebrow,
  title,
  description,
  rightSlot,
  children,
  showBackToLibrary = false,
  isKo = true,
}: {
  eyebrow: string;
  title: ReactNode;
  description?: ReactNode;
  rightSlot?: ReactNode;
  children: ReactNode;
  showBackToLibrary?: boolean;
  isKo?: boolean;
}) {
  return (
    <HomeLandingDayNight>
      <div className="tkad-landing-neon tkad-planner-neon tkad-media-page min-h-[calc(100vh-72px)]">
        <section className="tkad-home-hero tkad-neon-surface relative overflow-hidden bg-[#05050a] text-white">
          <div aria-hidden className="absolute inset-0 tkad-neon-depth" />
          <div aria-hidden className="absolute inset-0 opacity-20 tkad-neon-grid" />
          <div
            aria-hidden
            className="absolute inset-0 bg-[linear-gradient(to_bottom,rgba(0,0,0,0.12),rgba(0,0,0,0.55),rgba(0,0,0,0.92))]"
          />
          <div className="relative mx-auto max-w-7xl px-4 pb-12 pt-12 sm:px-6 sm:pb-16 sm:pt-16 lg:px-8 lg:pb-20 lg:pt-20">
            {showBackToLibrary ? (
              <Link
                href="/creatives"
                className="inline-flex items-center gap-1.5 font-mono text-[10px] font-bold uppercase tracking-[0.22em] text-white/70 transition-colors hover:text-white"
              >
                <ArrowLeft className="h-3.5 w-3.5" aria-hidden /> {isKo ? "라이브러리로" : "Library"}
              </Link>
            ) : null}
            <p className={cn("font-mono text-[10px] font-bold uppercase tracking-[0.28em] text-white/65", showBackToLibrary ? "mt-3" : null)}>
              {eyebrow}
            </p>
            <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between sm:gap-6">
              <h1 className="text-balance text-3xl font-black tracking-[-0.04em] text-white sm:text-4xl lg:text-5xl">
                {title}
              </h1>
              {rightSlot ? <div className="shrink-0">{rightSlot}</div> : null}
            </div>
            {description ? (
              <p className="mt-4 max-w-2xl text-sm leading-relaxed text-white/75 sm:text-base">
                {description}
              </p>
            ) : null}

            <CreativesSubNav className="mt-6" />
          </div>
        </section>

        <section className="bg-card py-10 sm:py-14">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">{children}</div>
        </section>
      </div>
    </HomeLandingDayNight>
  );
}

const SUBNAV: Array<{
  href: string;
  label: string;
  icon: typeof Film;
}> = [
  { href: "/creatives", label: "라이브러리", icon: Film },
  { href: "/creatives/upload", label: "업로드", icon: Upload },
  { href: "/creatives/playlists", label: "플레이리스트", icon: ListMusic },
  { href: "/creatives/guide", label: "규격 가이드", icon: BookOpen },
];

function CreativesSubNav({ className }: { className?: string }) {
  const pathname = usePathname();
  // pathname 은 /ko/creatives/... 또는 /en/creatives/... 형태 — locale 제거 후 비교
  const stripped = pathname?.replace(/^\/[a-z]{2}/, "") || "";

  return (
    <nav className={cn("flex flex-wrap gap-2", className)} aria-label="크리에이티브 메뉴">
      {SUBNAV.map((item) => {
        const isActive =
          item.href === "/creatives"
            ? stripped === "/creatives"
            : stripped.startsWith(item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 font-mono text-[11px] font-bold uppercase tracking-[0.18em] transition-all",
              isActive
                ? "border-white/30 bg-white/14 text-white shadow-[0_12px_36px_rgba(0,0,0,0.45)]"
                : "border-white/14 bg-white/5 text-white/70 hover:border-white/25 hover:text-white",
            )}
          >
            <item.icon className="h-3.5 w-3.5" aria-hidden />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
