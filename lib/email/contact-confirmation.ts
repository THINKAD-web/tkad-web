export type ContactConfirmationEmailParams = {
  name?: string | null;
};

export function getContactConfirmationEmail({
  name,
}: ContactConfirmationEmailParams) {
  const displayName = name?.trim() || "고객님";

  const subject = "문의가 접수되었습니다. 24시간 내 답변드리겠습니다.";

  const text = [
    `${displayName} 안녕하세요,`,
    "",
    "THINKAD 싱커드에 문의해 주셔서 감사합니다.",
    "",
    "고객님의 문의가 정상적으로 접수되었습니다.",
    "담당 컨설턴트가 내용을 확인한 뒤, 영업일 기준 24시간 이내에 답변 드리겠습니다.",
    "",
    "보다 빠른 상담이 필요하신 경우 아래 연락처로 문의 주세요.",
    "- 전화: 02-000-0000",
    `- 이메일: ${CONTACT_EMAIL}`,
    "",
    "감사합니다.",
    "THINKAD 싱커드 드림",
  ].join("\n");

  const html = `
    <div style="font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background-color: #f5f5f7; padding: 32px 16px;">
      <div style="max-width: 520px; margin: 0 auto; background-color: #ffffff; border-radius: 16px; padding: 28px 24px; box-shadow: 0 18px 45px rgba(15,23,42,0.10); border: 1px solid #e2e8f0;">
        <div style="margin-bottom: 20px;">
          <div style="font-size: 12px; font-weight: 600; letter-spacing: 0.08em; text-transform: uppercase; color: #f59e0b; margin-bottom: 4px;">
            THINKAD · Inquiry
          </div>
          <h1 style="margin: 0; font-size: 20px; line-height: 1.4; color: #0f172a;">
            문의가 접수되었습니다. 24시간 내 답변드리겠습니다.
          </h1>
        </div>

        <p style="margin: 0 0 10px 0; font-size: 14px; color: #0f172a;">
          ${displayName} 안녕하세요,
        </p>

        <p style="margin: 0 0 10px 0; font-size: 14px; color: #0f172a;">
          THINKAD 싱커드에 문의해 주셔서 감사합니다. 고객님의 문의가 정상적으로 접수되었으며,
          담당 컨설턴트가 내용을 확인한 뒤 <strong>영업일 기준 24시간 이내</strong>에 답변 드릴 예정입니다.
        </p>

        <p style="margin: 0 0 10px 0; font-size: 14px; color: #0f172a;">
          보다 빠른 상담이 필요하신 경우 아래 연락처로 문의 주시면 더욱 신속하게 도와드리겠습니다.
        </p>

        <div style="margin: 14px 0 18px 0; padding: 12px 14px; border-radius: 12px; background-color: #0f172a; color: #e5e7eb; font-size: 13px;">
          <div style="font-weight: 600; margin-bottom: 4px;">THINKAD 싱커드 연락처</div>
          <div>전화: 02-000-0000</div>
          <div>이메일: contact@tkad.co.kr</div>
        </div>

        <p style="margin: 0 0 6px 0; font-size: 13px; color: #6b7280;">
          본 메일은 문의 접수 안내를 위해 자동 발송되었습니다. 문의 내용에 대한 별도 확인 메일 또는
          전화 안내를 곧 받아보실 수 있습니다.
        </p>

        <p style="margin: 16px 0 0 0; font-size: 13px; color: #6b7280;">
          감사합니다.<br/>
          <span style="font-weight: 600; color: #0f172a;">THINKAD 싱커드 드림</span>
        </p>
      </div>

      <p style="max-width: 520px; margin: 16px auto 0 auto; font-size: 11px; color: #9ca3af; text-align: center;">
        이 메일은 발신 전용으로 회신이 불가합니다.
      </p>
    </div>
  `;

  return { subject, text, html };
}

