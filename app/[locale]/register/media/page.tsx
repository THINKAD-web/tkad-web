import { setRequestLocale } from "next-intl/server";
import { resolveLocaleParam } from "@/lib/resolve-locale";
import { MediaRegisterForm } from "@/components/media-application/media-register-form";
import type { Metadata } from "next";
import { pageAlternates } from "@/lib/seo";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const locale = await resolveLocaleParam(params);
  const isKo = locale === "ko";
  return {
    title: isKo
      ? "매체 등록 신청 | THINKAD"
      : "Register your media | THINKAD",
    description: isKo
      ? "매체사 셀프 등록 신청 — 싱커드 심사 후 카탈로그에 노출됩니다."
      : "Submit your OOH media for THINKAD review and catalog listing.",
    alternates: pageAlternates(locale, "/register/media"),
    robots: { index: true, follow: true },
  };
}

export default async function MediaRegisterPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const locale = await resolveLocaleParam(params);
  setRequestLocale(locale);
  const isKo = locale === "ko";

  return (
    <div className="min-h-screen bg-background">
      <section className="border-b-2 border-black bg-hero-void py-12 sm:py-16">
        <div className="mx-auto max-w-3xl px-4 sm:px-6">
          <p className="font-mono text-[11px] font-bold uppercase tracking-[0.22em] text-[#FF6600]">
            [ Media partner ] / Self registration
          </p>
          <h1 className="mt-4 text-3xl font-extrabold tracking-tight text-hero-fg sm:text-4xl">
            {isKo ? "매체 등록 신청" : "Register your OOH media"}
          </h1>
          <p className="mt-4 text-base leading-relaxed text-hero-fg/85">
            {isKo
              ? "신청 → 싱커드 심사 → 승인 시 THINKAD 매체 카탈로그에 노출됩니다. 필수 사진 3장과 정확한 주소를 준비해 주세요."
              : "Apply → THINKAD review → approved media appears in our catalog."}
          </p>
        </div>
      </section>

      <section className="mx-auto max-w-3xl px-4 py-12 sm:px-6 lg:py-16">
        <MediaRegisterForm />
      </section>
    </div>
  );
}
