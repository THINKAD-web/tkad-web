import { buildThinkadCtaEmail } from "@/lib/email/email-layout";

export type WelcomeDay = 0 | 1 | 3 | 7 | 14;

export function buildAdvertiserWelcomeEmail(
  day: WelcomeDay,
  opts: { name: string; locale: "ko" | "en"; verifiedMediaCount: string },
): { subject: string; html: string; text: string } | null {
  const isKo = opts.locale === "ko";
  const site = process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") ?? "https://tkad.co.kr";
  const name = opts.name.trim() || (isKo ? "고객" : "there");
  const count = opts.verifiedMediaCount;

  const blocks: Record<
    WelcomeDay,
    { subject: string; title: string; body: string; cta: string; href: string }
  > = isKo
    ? {
        0: {
          subject: "THINKAD 싱커드에 오신 것을 환영합니다",
          title: "환영합니다",
          body: `${name}님, 가입을 환영합니다. ${count} 검증 매체 검색, AI 플래너, 데이터 기반 견적까지 한 곳에서 이용하실 수 있습니다.`,
          cta: "플래너 시작하기",
          href: `${site}/ko/planner`,
        },
        1: {
          subject: "첫 매체 탐색 가이드 — THINKAD",
          title: "첫 매체 탐색",
          body: "지역·예산·업종으로 필터링해 비교하고, 관심 매체는 찜해 두세요.",
          cta: "매체 탐색",
          href: `${site}/ko/media`,
        },
        3: {
          subject: "무료 컨설팅 신청 안내",
          title: "무료 컨설팅",
          body: "캠페인 목표와 예산을 알려주시면 담당 컨설턴트가 맞춤 매체를 제안해 드립니다.",
          cta: "컨설팅 신청",
          href: `${site}/ko/contact`,
        },
        7: {
          subject: "지금까지 둘러보셨나요?",
          title: "피드백 요청",
          body: "서비스 이용 경험을 알려주시면 더 나은 THINKAD를 만드는 데 큰 도움이 됩니다.",
          cta: "의견 남기기",
          href: `${site}/ko/contact`,
        },
        14: {
          subject: "PRO 체험 종료 안내",
          title: "PRO 체험",
          body: "PRO 체험 기간이 곧 종료됩니다. PDF 리포트·고급 분석을 계속 이용하시려면 요금제를 확인해 주세요.",
          cta: "요금제 보기",
          href: `${site}/ko/pricing`,
        },
      }
    : {
        0: {
          subject: "Welcome to THINKAD",
          title: "Welcome",
          body: `Hi ${name}, explore ${count} verified OOH media, AI planner, and data-driven quotes.`,
          cta: "Start planner",
          href: `${site}/en/planner`,
        },
        1: {
          subject: "Your first media search guide",
          title: "Explore media",
          body: "Filter by region, budget, and format — save favorites for later.",
          cta: "Browse media",
          href: `${site}/en/media`,
        },
        3: {
          subject: "Free consultation offer",
          title: "Free consult",
          body: "Tell us your goals and budget — our team will recommend media options.",
          cta: "Contact us",
          href: `${site}/en/contact`,
        },
        7: {
          subject: "How is THINKAD working for you?",
          title: "Feedback",
          body: "We would love to hear about your experience so far.",
          cta: "Share feedback",
          href: `${site}/en/contact`,
        },
        14: {
          subject: "PRO trial ending soon",
          title: "PRO trial",
          body: "Your PRO trial is ending. See plans to keep PDF reports and advanced tools.",
          cta: "View pricing",
          href: `${site}/en/pricing`,
        },
      };

  const b = blocks[day];
  const mail = buildThinkadCtaEmail({
    eyebrow: "THINKAD",
    title: b.title,
    greeting: isKo ? `${name}님, 안녕하세요.` : `Hi ${name},`,
    paragraphs: [b.body],
    ctaLabel: b.cta,
    ctaUrl: b.href,
  });
  return { subject: b.subject, html: mail.html, text: mail.text };
}
