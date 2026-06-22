import { NextRequest, NextResponse } from "next/server";
import { CONTACT_EMAIL, CONTACT_MAILTO } from "@/lib/constants";
import { sendEmail, isEmailConfigured } from "@/lib/email/client";
import { catalogPriceFieldToPriceMan } from "@/lib/media-price-format";
import { requirePlannerPdfAccess } from "@/lib/require-planner-pdf-access";

type MediaItem = {
  name: string;
  price: number;
  location?: string | null;
};

type Metrics = {
  impressions?: number | null;
  reach?: number | null;
  frequency?: number | null;
};

type PlannerReportPayload = {
  userEmail: string;
  goalTitle: string;
  budgetNum?: number | null;
  periodDisplay?: string;
  regionsText?: string;
  categoriesText?: string;
  ageText?: string;
  industryText?: string;
  mediaList?: MediaItem[];
  metrics?: Metrics;
  screenshot?: string | null;
};

export async function POST(request: NextRequest) {
  if (!isEmailConfigured()) {
    return NextResponse.json(
      { error: "Email not configured" },
      { status: 503 },
    );
  }

  const pdfAccess = await requirePlannerPdfAccess();
  if (!pdfAccess.allowed) {
    return NextResponse.json(
      {
        error: pdfAccess.status === 401 ? "Login required" : "PRO required",
      },
      { status: pdfAccess.status },
    );
  }

  let body: PlannerReportPayload;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const {
    userEmail,
    goalTitle,
    budgetNum,
    periodDisplay,
    regionsText,
    categoriesText,
    ageText,
    industryText,
    mediaList = [],
    metrics = {},
    screenshot,
  } = body;

  if (!userEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(userEmail)) {
    return NextResponse.json({ error: "Invalid email" }, { status: 400 });
  }

  if (!goalTitle?.trim()) {
    return NextResponse.json({ error: "Missing goalTitle" }, { status: 400 });
  }

  const html = buildPlannerReportHtml({
    goalTitle,
    budgetNum,
    periodDisplay,
    regionsText,
    categoriesText,
    ageText,
    industryText,
    mediaList,
    metrics,
  });

  const attachments =
    typeof screenshot === "string" && screenshot.startsWith("data:image/")
      ? [
          {
            filename: "planner-report.png",
            content: screenshot.replace(/^data:image\/png;base64,/, ""),
            encoding: "base64" as const,
          },
        ]
      : [];

  try {
    await sendEmail({
      to: userEmail,
      subject: `[싱커드] 미디어 플래너 보고서 - ${goalTitle}`,
      html,
      attachments,
    });

    await sendEmail({
      to: CONTACT_EMAIL,
      subject: `[플래너 보고서 요청] ${userEmail} - ${goalTitle}`,
      html,
      attachments,
    });

    return NextResponse.json({ success: true });
  } catch (e) {
    console.error("[planner email]", e);
    return NextResponse.json(
      { error: "Failed to send email" },
      { status: 500 },
    );
  }
}

function numToLocaleString(value?: number | null): string {
  if (typeof value !== "number" || Number.isNaN(value)) return "-";
  return value.toLocaleString();
}

function escapeHtml(str: string | undefined | null): string {
  if (!str) return "";
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function buildPlannerReportHtml(data: {
  goalTitle: string;
  budgetNum?: number | null;
  periodDisplay?: string;
  regionsText?: string;
  categoriesText?: string;
  ageText?: string;
  industryText?: string;
  mediaList: MediaItem[];
  metrics: Metrics;
  screenshot?: string | null;
}): string {
  const hasMedia = data.mediaList && data.mediaList.length > 0;
  const { impressions, reach, frequency } = data.metrics || {};

  const mediaRows = hasMedia
    ? data.mediaList
        .map(
          (m) => `
            <tr>
              <td style="padding: 8px 12px; border-bottom: 1px solid #e2e8f0;">
                ${escapeHtml(m.name)}
              </td>
              <td style="padding: 8px 12px; border-bottom: 1px solid #e2e8f0; text-align: right;">
                ${typeof m.price === "number" ? numToLocaleString(Math.round(catalogPriceFieldToPriceMan(m.price))) + "만원" : "-"}
              </td>
              <td style="padding: 8px 12px; border-bottom: 1px solid #e2e8f0;">
                ${escapeHtml(m.location ?? "")}
              </td>
            </tr>
          `,
        )
        .join("")
    : `
        <tr>
          <td colspan="3" style="padding: 12px; text-align: center; color: #64748b;">
            선택된 매체가 없습니다.
          </td>
        </tr>
      `;

  const screenshotSection =
    typeof data.screenshot === "string" && data.screenshot.startsWith("data:image/")
      ? `
        <h3 style="color: #0f172a; margin: 28px 0 12px; font-size: 16px;">화면 캡처</h3>
        <div style="border-radius: 12px; overflow: hidden; border: 1px solid #e2e8f0; background: #020617;">
          <img src="${data.screenshot}" alt="Planner screenshot" style="display: block; width: 100%; max-height: 720px; object-fit: contain; background: #020617;" />
        </div>
      `
      : "";

  return `
    <div style="font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 640px; margin: 0 auto; background: #f1f5f9;">
      <div style="background: linear-gradient(135deg, #0d1b2e, #b21f1f, #fdbb2d); color: white; padding: 24px 20px; text-align: center;">
        <h1 style="margin: 0; font-size: 24px; letter-spacing: 0.04em;">THINKAD 미디어 플래너</h1>
        <p style="margin: 8px 0 0; opacity: 0.9; font-size: 14px;">캠페인 보고서</p>
      </div>

      <div style="padding: 24px 20px 32px; background: #f8fafc;">
        <h2 style="color: #0f172a; margin: 0 0 16px; font-size: 20px;">${escapeHtml(
          data.goalTitle,
        )}</h2>

        <table style="width: 100%; border-collapse: collapse; font-size: 14px; background: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 1px 2px rgba(15, 23, 42, 0.06);">
          <tbody>
            <tr>
              <td style="padding: 10px 14px; border-bottom: 1px solid #e2e8f0; background: #f9fafb; width: 30%;"><strong>예산</strong></td>
              <td style="padding: 10px 14px; border-bottom: 1px solid #e2e8f0;">${numToLocaleString(
                data.budgetNum ?? undefined,
              )}만원</td>
            </tr>
            <tr>
              <td style="padding: 10px 14px; border-bottom: 1px solid #e2e8f0; background: #f9fafb;"><strong>기간</strong></td>
              <td style="padding: 10px 14px; border-bottom: 1px solid #e2e8f0;">${escapeHtml(
                data.periodDisplay,
              )}</td>
            </tr>
            <tr>
              <td style="padding: 10px 14px; border-bottom: 1px solid #e2e8f0; background: #f9fafb;"><strong>지역</strong></td>
              <td style="padding: 10px 14px; border-bottom: 1px solid #e2e8f0;">${escapeHtml(
                data.regionsText,
              )}</td>
            </tr>
            <tr>
              <td style="padding: 10px 14px; border-bottom: 1px solid #e2e8f0; background: #f9fafb;"><strong>카테고리</strong></td>
              <td style="padding: 10px 14px; border-bottom: 1px solid #e2e8f0;">${escapeHtml(
                data.categoriesText,
              )}</td>
            </tr>
            <tr>
              <td style="padding: 10px 14px; border-bottom: 1px solid #e2e8f0; background: #f9fafb;"><strong>타겟</strong></td>
              <td style="padding: 10px 14px; border-bottom: 1px solid #e2e8f0;">${escapeHtml(
                data.ageText,
              )}</td>
            </tr>
            <tr>
              <td style="padding: 10px 14px; background: #f9fafb;"><strong>업종</strong></td>
              <td style="padding: 10px 14px;">${escapeHtml(data.industryText)}</td>
            </tr>
          </tbody>
        </table>

        <h3 style="color: #0f172a; margin: 24px 0 12px; font-size: 16px;">선택 매체</h3>
        <table style="width: 100%; border-collapse: collapse; font-size: 13px; background: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 1px 2px rgba(15, 23, 42, 0.06);">
          <thead>
            <tr style="background: #0f172a; color: #e5e7eb;">
              <th style="padding: 8px 12px; text-align: left; font-weight: 500;">매체명</th>
              <th style="padding: 8px 12px; text-align: right; font-weight: 500;">집행 금액</th>
              <th style="padding: 8px 12px; text-align: left; font-weight: 500;">비고</th>
            </tr>
          </thead>
          <tbody>
            ${mediaRows}
          </tbody>
        </table>

        <h3 style="color: #0f172a; margin: 24px 0 12px; font-size: 16px;">예상 효과</h3>
        <table style="width: 100%; border-collapse: collapse; font-size: 14px; background: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 1px 2px rgba(15, 23, 42, 0.06);">
          <tbody>
            <tr>
              <td style="padding: 10px 14px; border-bottom: 1px solid #e2e8f0; background: #f9fafb;"><strong>노출 수 (Impressions)</strong></td>
              <td style="padding: 10px 14px; border-bottom: 1px solid #e2e8f0;">${
                impressions != null
                  ? numToLocaleString(impressions) + "회"
                  : "예상치 없음"
              }</td>
            </tr>
            <tr>
              <td style="padding: 10px 14px; border-bottom: 1px solid #e2e8f0; background: #f9fafb;"><strong>도달 수 (Reach)</strong></td>
              <td style="padding: 10px 14px; border-bottom: 1px solid #e2e8f0;">${
                reach != null
                  ? numToLocaleString(reach) + "명"
                  : "예상치 없음"
              }</td>
            </tr>
            <tr>
              <td style="padding: 10px 14px; background: #f9fafb;"><strong>빈도 (Frequency)</strong></td>
              <td style="padding: 10px 14px;">${
                typeof frequency === "number"
                  ? frequency.toFixed(1) + "회/인"
                  : "예상치 없음"
              }</td>
            </tr>
          </tbody>
        </table>

        ${screenshotSection}

        <div style="margin-top: 28px; padding: 16px 14px; background: #fffbeb; border-radius: 10px; border: 1px solid #f97316; text-align: center;">
          <p style="margin: 0; color: #92400e; font-size: 13px;">
            자세한 상담은 <a href="${CONTACT_MAILTO}" style="color: #b45309; font-weight: 600; text-decoration: none;">${CONTACT_EMAIL}</a> 로 연락주세요.
          </p>
        </div>

        <p style="margin-top: 20px; font-size: 11px; color: #94a3b8; text-align: center;">
          본 메일은 THINKAD 미디어 플래너에서 자동 생성된 보고서입니다.
        </p>
      </div>
    </div>
  `;
}

