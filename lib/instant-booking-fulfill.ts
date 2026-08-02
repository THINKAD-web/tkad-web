import { getPrisma } from "@/lib/prisma";
import { sendEmail, isEmailConfigured } from "@/lib/email/client";
import {
  getInstantBookingAdminEmail,
  getInstantBookingCustomerEmail,
} from "@/lib/email/instant-booking-notify";
import {
  confirmInstantPaymentHold,
  createInstantPaymentHold,
  isInstantHoldConflictError,
} from "@/lib/instant-booking-hold";
import { findConflictingBookings } from "@/lib/booking-conflict";
import {
  recordInstantBookingManualRefundNeeded,
  type InstantBookingFulfillmentFailureReason,
} from "@/lib/instant-booking-manual-refund";

type FulfillmentBooking = {
  id: string;
  mediaId: string;
  mediaBookingId: string | null;
  amount: number;
  orderId: string;
  contactName: string;
  contactEmail: string;
  contactPhone: string | null;
  userId: string | null;
  startDate: Date;
  endDate: Date;
  status: string;
  media: { id: string; name: string };
};

async function abortFulfillment(
  booking: FulfillmentBooking,
  paymentId: string | undefined,
  reason: InstantBookingFulfillmentFailureReason,
  mediaBookingId?: string | null,
): Promise<never> {
  await recordInstantBookingManualRefundNeeded({
    bookingId: booking.id,
    paymentKey: paymentId ?? null,
    mediaBookingId: mediaBookingId ?? booking.mediaBookingId,
    amount: booking.amount,
    orderId: booking.orderId,
    contactEmail: booking.contactEmail,
    mediaName: booking.media.name,
    reason,
  });
  throw new Error(reason);
}

/** 결제 완료 후 MediaBooking 생성/승격 + 상태 갱신 */
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

  if (booking.mediaBookingId) {
    const confirmed = await confirmInstantPaymentHold(
      db,
      booking.mediaBookingId,
      booking.id,
    );
    if (!confirmed) {
      await abortFulfillment(booking, paymentId, "HOLD_NOT_CONFIRMED");
    }
  } else {
    const conflicts = await findConflictingBookings(db, {
      mediaId: booking.mediaId,
      startsAt: start,
      endsAt: end,
    });
    if (conflicts.length > 0) {
      await abortFulfillment(booking, paymentId, "SELECTED_RANGE_CONFLICT");
    }
    try {
      await createInstantPaymentHold(db, {
        bookingId: booking.id,
        mediaId: booking.mediaId,
        mediaName: booking.media.name,
        startsAt: start,
        endsAt: end,
        contactName: booking.contactName,
        contactEmail: booking.contactEmail,
        contactPhone: booking.contactPhone,
        userId: booking.userId,
        amount: booking.amount,
      });
      const refreshed = await db.booking.findUniqueOrThrow({
        where: { id: bookingId },
        select: { mediaBookingId: true },
      });
      if (refreshed.mediaBookingId) {
        const confirmed = await confirmInstantPaymentHold(
          db,
          refreshed.mediaBookingId,
          booking.id,
        );
        if (!confirmed) {
          await abortFulfillment(
            booking,
            paymentId,
            "HOLD_NOT_CONFIRMED",
            refreshed.mediaBookingId,
          );
        }
      }
    } catch (e) {
      if (isInstantHoldConflictError(e)) {
        await abortFulfillment(booking, paymentId, "SELECTED_RANGE_CONFLICT");
      }
      throw e;
    }
  }

  const updated = await db.booking.update({
    where: { id: bookingId },
    data: {
      status: "paid",
      paidAt: new Date(),
      paymentId: paymentId ?? undefined,
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
