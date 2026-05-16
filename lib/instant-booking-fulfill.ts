import { getPrisma } from "@/lib/prisma";
import { sendEmail, isEmailConfigured } from "@/lib/email/client";
import {
  getInstantBookingAdminEmail,
  getInstantBookingCustomerEmail,
} from "@/lib/email/instant-booking-notify";

/** 결제 완료 후 MediaBooking 생성 + 상태 갱신 */
export async function fulfillInstantBooking(
  bookingId: string,
  paymentId?: string,
) {
  const db = getPrisma();
  const booking = await db.booking.findUnique({
    where: { id: bookingId },
    include: { media: { select: { id: true, name: true } } },
  });
  if (!booking) throw new Error("Booking not found");
  if (booking.status === "paid" || booking.status === "confirmed") {
    return booking;
  }
  if (booking.status !== "payment_pending") {
    throw new Error("Invalid booking status for fulfillment");
  }

  const start = new Date(booking.startDate);
  start.setHours(0, 0, 0, 0);
  const end = new Date(booking.endDate);
  end.setHours(23, 59, 59, 999);

  const mediaBooking = await db.mediaBooking.create({
    data: {
      mediaId: booking.mediaId,
      title: `[즉시예약] ${booking.media.name}`,
      startsAt: start,
      endsAt: end,
      status: "confirmed",
      notes: `Instant booking ${booking.id}\nCreative: ${booking.creativeUrl}`,
      requestedByUserId: booking.userId,
      requesterName: booking.contactName,
      requesterEmail: booking.contactEmail,
      requesterPhone: booking.contactPhone,
      budgetWon: booking.amount,
      decidedAt: new Date(),
    },
  });

  const updated = await db.booking.update({
    where: { id: bookingId },
    data: {
      status: "paid",
      paidAt: new Date(),
      paymentId: paymentId ?? undefined,
      mediaBookingId: mediaBooking.id,
    },
    include: { media: { select: { id: true, name: true } } },
  });

  if (isEmailConfigured()) {
    const alertTo =
      process.env.CONTACT_ALERT_EMAIL?.trim() || "sales@tkad.co.kr";
    const admin = getInstantBookingAdminEmail(updated);
    const customer = getInstantBookingCustomerEmail(updated, true);
    try {
      await sendEmail({
        to: alertTo,
        subject: admin.subject,
        text: admin.text,
        html: admin.html,
      });
    } catch (e) {
      console.error("[instant-booking] admin email", e);
    }
    try {
      await sendEmail({
        to: booking.contactEmail,
        subject: customer.subject,
        text: customer.text,
        html: customer.html,
      });
    } catch (e) {
      console.error("[instant-booking] customer email", e);
    }
  }

  return updated;
}

export async function markBookingExecutionConfirmed(bookingId: string) {
  const db = getPrisma();
  return db.booking.update({
    where: { id: bookingId },
    data: {
      status: "confirmed",
      executionConfirmedAt: new Date(),
    },
  });
}
