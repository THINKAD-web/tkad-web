export type FeedbackAnswers = {
  name?: string;
  company?: string;
  serviceSatisfaction: number;
  nps: number;
  campaign: "yes" | "no" | "na";
  campaignResult?: number;
  campaignComment?: string;
  improvement?: string;
};

export function getFeedbackAdminEmail(params: {
  email: string;
  coupon: string;
  answers: FeedbackAnswers;
}): { subject: string; text: string; html: string } {
  const { email, coupon, answers } = params;
  const lines = [
    `New customer feedback survey`,
    `Respondent email: ${email}`,
    `Coupon issued: ${coupon}`,
    "",
    `Service satisfaction (1-5): ${answers.serviceSatisfaction}`,
    `NPS (0-10): ${answers.nps}`,
    `Campaign experience: ${answers.campaign}`,
    answers.campaign === "yes" && answers.campaignResult != null
      ? `Campaign result rating (1-5): ${answers.campaignResult}`
      : null,
    answers.campaignComment
      ? `Campaign comment: ${answers.campaignComment}`
      : null,
    answers.improvement
      ? `Improvement ideas: ${answers.improvement}`
      : null,
    answers.name ? `Name: ${answers.name}` : null,
    answers.company ? `Company: ${answers.company}` : null,
  ].filter(Boolean) as string[];

  const text = lines.join("\n");
  const html = `<pre style="font-family:system-ui,sans-serif;font-size:14px;line-height:1.5">${lines
    .map((l) =>
      l === ""
        ? "<br/>"
        : `${l.replace(/&/g, "&amp;").replace(/</g, "&lt;")}<br/>`,
    )
    .join("")}</pre>`;

  return {
    subject: `[THINKAD] Customer feedback · ${coupon}`,
    text,
    html,
  };
}
