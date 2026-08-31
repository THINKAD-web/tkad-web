"use client";

import { Suspense } from "react";
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
            className="rounded-full border dark:border-white/12 border-gray-200 dark:bg-white/6 bg-gray-50 px-3 py-1 tkad-type-label dark:text-white text-gray-600"
          >
            {String(i + 1).padStart(2, "0")} {label}
          </span>
        ))}
      </div>

      <div className="rounded-2xl border dark:border-white/10 border-gray-200 dark:bg-white/5 bg-gray-50 p-6 shadow-[0_24px_80px_rgba(0,0,0,0.45)] backdrop-blur sm:p-8">
        <p className="tkad-type-label dark:text-white text-gray-500">
          [ {isKo ? "SELF REGISTRATION" : "SELF REGISTRATION"} ]
        </p>
        <p className="mt-2 text-sm leading-relaxed dark:text-white text-gray-700">
          {isKo
            ? "신청 → 싱커드 심사 → 승인 시 THINKAD 매체 카탈로그에 노출됩니다. 정면·측면·야경 사진과 정확한 주소가 필요합니다."
            : "Apply → THINKAD review → approved listings go live in our catalog. Front, side, and night photos plus a verified address are required."}
        </p>
        <div className="mt-8">
          <Suspense fallback={null}>
            <MediaRegisterForm />
          </Suspense>
        </div>
      </div>
    </NeonSection>
  );
}
