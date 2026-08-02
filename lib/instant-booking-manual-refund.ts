import { sendSlackInsightAlert } from "@/lib/insights/notifiers/slack";
import { getPrisma } from "@/lib/prisma";
import { siteUrl } from "@/lib/seo";
import { sendTelegramMessage } from "@/lib/telegram-notify";

export type InstantBookingFulfillmentFailureReason =
  | "HOLD_NOT_CONFIRMED"
  | "SELECTED_RANGE_CONFLICT";

const REASON_LABEL: Record<InstantBookingFulfillmentFailureReason, string> = {
  HOLD_NOT_CONFIRMED: "홀드 승격 실패 (tentative→confirmed 불가)",
  SELECTED_RANGE_CONFLICT: "슬롯 충돌 (다른 예약 선점)",
};

function adminInstantBookingUrl(bookingId: string): string {
  return `${siteUrl.replace(/\/$/, "")}/ko/admin/instant-bookings?id=${encodeURIComponent(bookingId)}`;
}

export async function recordInstantBookingManualRefundNeeded(opts: {
  bookingId: string;
  paymentKey: string | null | undefined;
  mediaBookingId: string | null | undefined;
  amount: number;
  orderId: string;
  contactEmail: string;
  mediaName: string;
  reason: InstantBookingFulfillmentFailureReason;
}): Promise<void> {
  const db = getPrisma();
  const reasonLabel = REASON_LABEL[opts.reason];

  await db.paymentLog.create({
    data: {
      bookingId: opts.bookingId,
      provider: "toss",
      amount: opts.amount,
      status: "needs_manual_refund",
      raw: {
        reason: opts.reason,
        reasonLabel,
        paymentKey: opts.paymentKey ?? null,
        mediaBookingId: opts.mediaBookingId ?? null,
        orderId: opts.orderId,
        contactEmail: opts.contactEmail,
        mediaName: opts.mediaName,
        recordedAt: new Date().toISOString(),
      },
    },
  });

  const adminUrl = adminInstantBookingUrl(opts.bookingId);
  const summary = [
    "즉시예약 결제는 Toss에서 *확정*됐으나 예약 홀드 승격에 실패했습니다.",
    "*수동 환불*이 필요합니다.",
    "",
    `매체: *${opts.mediaName}*`,
    `금액: ₩${opts.amount.toLocaleString("ko-KR")}`,
    `사유: ${reasonLabel}`,
    `bookingId: \`${opts.bookingId}\``,
    opts.paymentKey ? `paymentKey: \`${opts.paymentKey}\`` : "paymentKey: —",
    opts.mediaBookingId
      ? `mediaBookingId: \`${opts.mediaBookingId}\``
      : "mediaBookingId: —",
  ].join("\n");

  void sendSlackInsightAlert({
    severity: "error",
    title: "즉시예약 — 결제 확정·홀드 승격 실패 (수동 환불 필요)",
    summary,
    fields: [
      { label: "orderId", value: opts.orderId },
      { label: "담당 이메일", value: opts.contactEmail },
      { label: "사유 코드", value: opts.reason },
    ],
    adminUrl,
  }).catch((e) =>
    console.error("[instant-booking] manual refund slack", e),
  );

  void sendTelegramMessage(
    [
      "<b>⚠️ 즉시예약 — 수동 환불 필요</b>",
      "",
      "결제 확정됐으나 홀드 승격 실패.",
      `매체: ${opts.mediaName}`,
      `₩${opts.amount.toLocaleString("ko-KR")} · ${reasonLabel}`,
      `booking: <code>${opts.bookingId}</code>`,
      opts.paymentKey ? `paymentKey: <code>${opts.paymentKey}</code>` : "",
    ]
      .filter(Boolean)
      .join("\n"),
    { buttons: [{ text: "어드민에서 보기", url: adminUrl }] },
  ).catch((e) =>
    console.error("[instant-booking] manual refund telegram", e),
  );
}
