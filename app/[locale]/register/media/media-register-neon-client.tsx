"use client";

import { useLocale } from "next-intl";
import ScrollAnimate from "@/components/scroll-animate";
import { NeonSection } from "@/components/landing/neon/neon-section";
import { NeonSectionHead } from "@/components/landing/neon/neon-section-head";
import { MediaRegisterForm } from "@/components/media-application/media-register-form";

export function MediaRegisterNeonClient() {
  const locale = useLocale();
  const isKo = locale === "ko";

  const steps = isKo
    ? [
        "신청자 정보",
        "매체 기본",
        "스펙",
        "노출·가격",
        "사진 3장",
        "추가 메모",
      ]
    : [
        "Applicant",
        "Media basics",
        "Specs",
        "Exposure & price",
        "3 photos",
        "Notes",
      ];

  return (
    <NeonSection innerClassName="max-w-4xl">
      <ScrollAnimate>
        <NeonSectionHead
          number="01"
          kicker={isKo ? "Media partner" : "Media partner"}
          title={
            isKo ? (
              <>
                매체 등록 <span className="tkad-home-accent-text">신청서</span>
              </>
            ) : (
              <>
                Register your{" "}
                <span className="tkad-home-accent-text">OOH media</span>
              </>
            )
          }
          meta={
            isKo
              ? "심사 · 승인 후 카탈로그 노출"
              : "review · catalog after approval"
          }
        />
      </ScrollAnimate>

      <div className="mb-8 flex flex-wrap gap-2">
        {steps.map((label, i) => (
          <span
            key={label}
            className="rounded-full border border-white/12 bg-white/6 px-3 py-1 font-mono text-[10px] font-bold uppercase tracking-[0.14em] text-white/70"
          >
            {String(i + 1).padStart(2, "0")} {label}
          </span>
        ))}
      </div>

      <div className="rounded-2xl border border-white/10 bg-white/5 p-6 shadow-[0_24px_80px_rgba(0,0,0,0.45)] backdrop-blur sm:p-8">
        <p className="font-mono text-[10px] font-bold uppercase tracking-[0.22em] text-white/55">
          [ {isKo ? "SELF REGISTRATION" : "SELF REGISTRATION"} ]
        </p>
        <p className="mt-2 text-sm leading-relaxed text-white/75">
          {isKo
            ? "신청 → 싱커드 심사 → 승인 시 THINKAD 매체 카탈로그에 노출됩니다. 정면·측면·야경 사진과 정확한 주소가 필요합니다."
            : "Apply → THINKAD review → approved listings go live in our catalog. Front, side, and night photos plus a verified address are required."}
        </p>
        <div className="mt-8">
          <MediaRegisterForm />
        </div>
      </div>
    </NeonSection>
  );
}
