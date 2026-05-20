export const DEFAULT_CRM_EMAIL_TEMPLATES = [
  {
    slug: "followup",
    name: "팔로업",
    subject: "[THINKAD] {{company}}님, 후속 안내드립니다",
    bodyHtml:
      "<p>{{contactName}}님, 안녕하세요. THINKAD {{assignedTo}}입니다.</p><p>지난 상담 이후 진행 상황을 공유드리고자 연락드립니다. 편하신 시간에 회신 부탁드립니다.</p>",
    bodyText:
      "{{contactName}}님, 안녕하세요. THINKAD입니다. 지난 상담 이후 진행 상황을 공유드리고자 연락드립니다.",
  },
  {
    slug: "quote_expiry",
    name: "견적 만료 안내",
    subject: "[THINKAD] 견적 유효기간 안내 — {{company}}",
    bodyHtml:
      "<p>{{contactName}}님, 발송드린 견적의 유효기간이 곧 만료됩니다. 연장 또는 조건 조정이 필요하시면 알려주세요.</p><p><a href=\"{{quoteLink}}\">견적 보기</a></p>",
    bodyText: "견적 유효기간이 곧 만료됩니다. 연장이 필요하시면 연락 부탁드립니다. {{quoteLink}}",
  },
  {
    slug: "renewal",
    name: "재계약 제안",
    subject: "[THINKAD] {{company}} 재집행 제안",
    bodyHtml:
      "<p>{{contactName}}님, 이전 캠페인 성과를 바탕으로 재집행 패키지를 제안드립니다. 미팅 가능하신지 알려주세요.</p>",
    bodyText: "재집행 패키지를 제안드립니다. 미팅 가능 여부를 알려주세요.",
  },
  {
    slug: "thanks",
    name: "감사 인사",
    subject: "[THINKAD] {{company}}님, 감사드립니다",
    bodyHtml:
      "<p>{{contactName}}님, THINKAD {{assignedTo}}입니다.</p><p>항상 관심 가져주셔서 감사합니다. 추가 문의나 미팅이 필요하시면 편히 연락 주세요.</p>",
    bodyText: "{{contactName}}님, 관심 가져주셔서 감사합니다. 추가 문의는 언제든 연락 주세요.",
  },
  {
    slug: "campaign_thanks",
    name: "캠페인 완료 감사",
    subject: "[THINKAD] 캠페인 완료 감사드립니다 — {{campaignName}}",
    bodyHtml:
      "<p>{{contactName}}님, {{campaignName}} 캠페인이 성공적으로 완료되었습니다. 감사합니다. 결과 리포트는 대시보드에서 확인하실 수 있습니다.</p><p><a href=\"{{dashboardLink}}\">대시보드</a></p>",
    bodyText: "캠페인이 완료되었습니다. 감사합니다. {{dashboardLink}}",
  },
] as const;

export function renderTemplate(
  template: string,
  vars: Record<string, string>,
): string {
  let out = template;
  for (const [k, v] of Object.entries(vars)) {
    out = out.replaceAll(`{{${k}}}`, v);
  }
  return out;
}
