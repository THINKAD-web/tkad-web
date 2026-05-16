import type { Booking } from "@prisma/client";
import { siteUrl } from "@/lib/seo";

type BookingWithMedia = Booking & {
  media: { id: string; name: string };
};

export function getInstantBookingAdminEmail(booking: BookingWithMedia) {
  const url = `${siteUrl}/ko/admin/instant-bookings?id=${booking.id}`;
  const subject = `[THINKAD] 즉시 예약 결제 완료 — ${booking.media.name}`;
  const text = [
    `예약 ID: ${booking.id}`,
    `매체: ${booking.media.name}`,
    `기간: ${booking.startDate.toISOString().slice(0, 10)} ~ ${booking.endDate.toISOString().slice(0, 10)}`,
    `금액: ${booking.amount.toLocaleString("ko-KR")}원`,
    `담당: ${booking.contactName} / ${booking.contactEmail} / ${booking.contactPhone ?? ""}`,
    `소재: ${booking.creativeUrl}`,
    `어드민: ${url}`,
  ].join("\n");
  const html = `<p><strong>즉시 예약 결제 완료</strong></p><p>${booking.media.name}</p><p><a href="${url}">어드민에서 확인</a></p>`;
  return { subject, text, html };
}

export function getInstantBookingCustomerEmail(
  booking: BookingWithMedia,
  isKo: boolean,
) {
  const url = `${siteUrl}/${isKo ? "ko" : "en"}/bookings/${booking.id}`;
  const subject = isKo
    ? `[THINKAD] 예약이 확정되었습니다 — ${booking.media.name}`
    : `[THINKAD] Booking confirmed — ${booking.media.name}`;
  const text = isKo
    ? `결제가 완료되었습니다.\n매체: ${booking.media.name}\n확인: ${url}`
    : `Payment complete.\nMedia: ${booking.media.name}\nDetails: ${url}`;
  const html = isKo
    ? `<p>결제가 완료되었습니다.</p><p><strong>${booking.media.name}</strong></p><p><a href="${url}">예약 확인 페이지</a></p>`
    : `<p>Payment complete.</p><p><a href="${url}">View booking</a></p>`;
  return { subject, text, html };
}
