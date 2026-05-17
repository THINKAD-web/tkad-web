"use client";

import { HomeLandingDayNight } from "@/components/home-landing-day-night";
import { MediaRegisterForm } from "@/components/media-application/media-register-form";
import { Radio } from "lucide-react";

export function MediaRegisterPageClient({ isKo }: { isKo: boolean }) {
  return (
    <HomeLandingDayNight>
      <div className="tkad-landing-neon tkad-planner-neon min-h-[calc(100vh-72px)]">
        <section className="tkad-home-hero tkad-neon-surface relative overflow-hidden bg-[#05050a] text-white">
          <div aria-hidden className="absolute inset-0 tkad-neon-depth" />
          <div aria-hidden className="absolute inset-0 opacity-20 tkad-neon-grid" />
          <div
            aria-hidden
            className="absolute inset-0 tkad-hero-noise opacity-[0.07] mix-blend-overlay"
          />
          <div
            aria-hidden
            className="absolute inset-0 bg-[linear-gradient(to_bottom,rgba(0,0,0,0.12),rgba(0,0,0,0.55),rgba(0,0,0,0.88))]"
          />
          <div
            aria-hidden
            className="pointer-events-none absolute -inset-y-16 left-1/2 -z-0 h-[200%] w-[110%] -translate-x-1/2 bg-[radial-gradient(circle_at_25%_40%,rgba(168,85,247,0.35),transparent_55%),radial-gradient(circle_at_75%_50%,rgba(34,211,238,0.3),transparent_55%)]"
          />

          <div className="relative mx-auto max-w-3xl px-4 pb-14 pt-16 sm:px-6 sm:pb-16 sm:pt-20">
            <div className="inline-flex items-center gap-2 rounded-full border border-white/18 bg-white/8 px-3 py-1.5 font-mono text-[10px] font-bold uppercase tracking-[0.22em] text-white/75 backdrop-blur">
              <Radio className="h-3.5 w-3.5 text-primary" aria-hidden />
              Media Partner
            </div>
            <p className="mt-5 font-mono text-[11px] font-bold uppercase tracking-[0.22em] text-white/60">
              {`// ${isKo ? "매체사 셀프 등록" : "Self-service listing"}`}
            </p>
            <h1 className="mt-3 text-balance text-[clamp(2rem,5vw,2.75rem)] font-[950] leading-[1.05] tracking-tight text-white">
              {isKo ? (
                <>
                  <span className="tkad-home-accent-text">매체 등록</span> 신청
                </>
              ) : (
                <>
                  Register your{" "}
                  <span className="tkad-home-accent-text">OOH media</span>
                </>
              )}
            </h1>
            <p className="mt-4 max-w-2xl text-base leading-relaxed text-white/82">
              {isKo
                ? "신청 → 싱커드 심사 → 승인 시 THINKAD 매체 카탈로그에 노출됩니다. 필수 사진 3장과 정확한 주소를 준비해 주세요."
                : "Apply → THINKAD review → approved media appears in our catalog. Prepare three photos and an accurate address."}
            </p>
          </div>
        </section>

        <section className="mx-auto max-w-3xl px-4 py-10 sm:px-6 sm:py-12">
          <div className="tkad-auth-card relative overflow-hidden rounded-[28px] border border-white/12 bg-black/45 p-6 shadow-[0_28px_120px_rgba(0,0,0,0.55)] backdrop-blur sm:p-8 md:p-10">
            <div
              aria-hidden
              className="pointer-events-none absolute inset-0 opacity-[0.1] tkad-neon-grid"
            />
            <div
              aria-hidden
              className="pointer-events-none absolute -inset-24 bg-[radial-gradient(circle_at_top,rgba(168,85,247,0.2),transparent_58%),radial-gradient(circle_at_bottom,rgba(34,211,238,0.16),transparent_58%)]"
            />
            <div className="relative">
              <MediaRegisterForm />
            </div>
          </div>
        </section>
      </div>
    </HomeLandingDayNight>
  );
}
