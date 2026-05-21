import { buildThinkadCtaEmail } from "@/lib/email/email-layout";
import { siteUrl } from "@/lib/seo";

function registerUrl(ref?: string): string {
  const base = `${siteUrl.replace(/\/$/, "")}/ko/register/media`;
  return ref ? `${base}?ref=${encodeURIComponent(ref)}` : base;
}

export type OnboardingEmailDay = 0 | 1 | 3 | 7;

export function buildMediaOwnerOnboardingEmail(
  day: OnboardingEmailDay,
  opts: { name: string; referralCode?: string },
): { subject: string; html: string; text: string } | null {
  const cta = registerUrl(opts.referralCode);
  const name = opts.name || "파트너";

  const templates: Record<
    OnboardingEmailDay,
    { subject: string; title: string; paragraphs: string[]; ctaLabel: string }
  > = {
    0: {
      subject: "[THINKAD] 매체사 가입을 환영합니다",
      title: "환영합니다 — 매체 등록 가이드",
      paragraphs: [
        "THINKAD 매체사 포털에 오신 것을 환영합니다.",
        "첫 매체를 등록하시면 광고주 검색·AI 추천·견적 문의 파이프라인에 노출됩니다.",
        "사진 3장(주간/측면/야간)과 월 단가만 준비하시면 약 5분이면 제출 가능합니다.",
        "첫 등록 매체사에게는 첫 달 PRO 혜택이 자동 적용됩니다.",
      ],
      ctaLabel: "매체 등록 시작",
    },
    1: {
      subject: "[THINKAD] 첫 매체 등록을 도와드릴까요?",
      title: "첫 매체 등록, 함께해요",
      paragraphs: [
        "어제 가입해 주셨는데 아직 매체 등록이 완료되지 않았습니다.",
        "입력이 막히는 항목이 있으면 담당자가 검토 단계에서 보완해 드립니다.",
        "지금 등록하시면 검증 후 1~2영업일 내 노출이 시작됩니다.",
      ],
      ctaLabel: "지금 매체 등록",
    },
    3: {
      subject: "[THINKAD] 이미 등록한 매체사 사례",
      title: "다른 매체사들은 이렇게 시작했어요",
      paragraphs: [
        "강남·홍대·성수 등 상권의 옥외·디지털 매체사가 THINKAD에 등록해 광고주 문의를 받고 있습니다.",
        "검증 배지가 붙은 매체는 플래너·AI 추천 결과 상단에 더 자주 노출됩니다.",
        "매체 5개 이상 등록 시 평생 PRO 등급 혜택도 제공됩니다.",
      ],
      ctaLabel: "매체 등록하기",
    },
    7: {
      subject: "[THINKAD] 등록이 어려우신가요?",
      title: "어려운 점이 있으신가요?",
      paragraphs: [
        "일주일이 지났는데 아직 매체 등록이 없으셔서 안내드립니다.",
        "사진·가격·주소만 있으면 나머지는 운영팀이 보완할 수 있습니다.",
        "회신 주시면 전화로 등록을 함께 진행해 드리겠습니다.",
      ],
      ctaLabel: "무료 등록 (5분)",
    },
  };

  const t = templates[day];
  const { html, text } = buildThinkadCtaEmail({
    eyebrow: "매체사 온보딩",
    title: t.title,
    greeting: `${name}님,`,
    paragraphs: t.paragraphs,
    ctaLabel: t.ctaLabel,
    ctaUrl: cta,
  });

  return { subject: t.subject, html, text };
}
