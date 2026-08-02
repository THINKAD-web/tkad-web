import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { confirmTossPayment } from "@/lib/toss-payments";
import { fulfillInstantBooking } from "@/lib/instant-booking-fulfill";
import {
  findConflictingBookings,
  isPaymentPendingHoldActive,
} from "@/lib/booking-conflict";

type Params = { params: Promise<{ id: string }> };

function bookingPeriod(booking: { startDate: Date; endDate: Date }) {
  const startsAt = new Date(booking.startDate);
  startsAt.setHours(0, 0, 0, 0);
  const endsAt = new Date(booking.endDate);
  endsAt.setHours(23, 59, 59, 999);
  return { startsAt, endsAt };
}

export async function POST(request: Request, { params }: Params) {
  try {
    const { id } = await params;
    const body = (await request.json()) as {
      paymentKey?: string;
      orderId?: string;
      amount?: number;
    };

    const paymentKey = body.paymentKey?.trim();
    const orderId = body.orderId?.trim();
    const amount = body.amount;

    if (!paymentKey || !orderId || amount == null) {
      return NextResponse.json({ error: "결제 정보가 부족합니다." }, { status: 400 });
    }

    const booking = await prisma.booking.findUnique({ where: { id } });
    if (!booking) {
      return NextResponse.json({ error: "예약을 찾을 수 없습니다." }, { status: 404 });
    }

    if (booking.orderId !== orderId) {
      return NextResponse.json({ error: "주문 번호가 일치하지 않습니다." }, { status: 400 });
    }

    if (booking.status === "paid" || booking.status === "confirmed") {
      return NextResponse.json({ ok: true, id: booking.id, alreadyPaid: true });
    }

    if (booking.status !== "payment_pending") {
      return NextResponse.json(
        { error: "결제 대기 상태가 아닙니다.", code: "INVALID_STATUS" },
        { status: 400 },
      );
    }

    if (booking.amount !== amount) {
      return NextResponse.json({ error: "결제 금액이 일치하지 않습니다." }, { status: 400 });
    }

    if (!isPaymentPendingHoldActive(booking)) {
      return NextResponse.json(
        {
          error: "예약 홀드가 만료되어 결제를 진행할 수 없습니다.",
          code: "HOLD_EXPIRED",
        },
        { status: 409 },
      );
    }

    const { startsAt, endsAt } = bookingPeriod(booking);
    const conflicts = await findConflictingBookings(prisma, {
      mediaId: booking.mediaId,
      startsAt,
      endsAt,
      excludeIds: booking.mediaBookingId ? [booking.mediaBookingId] : undefined,
    });
    if (conflicts.length > 0) {
      return NextResponse.json(
        {
          error: "선택한 기간에 이미 예약이 있습니다.",
          code: "SLOT_TAKEN",
        },
        { status: 409 },
      );
    }

    const tossResult = await confirmTossPayment({
      paymentKey,
      orderId,
      amount,
    });

    await prisma.paymentLog.create({
      data: {
        bookingId: booking.id,
        provider: "toss",
        amount,
        status: "succeeded",
        raw: tossResult as object,
      },
    });

    await fulfillInstantBooking(booking.id, paymentKey);

    return NextResponse.json({ ok: true, id: booking.id });
  } catch (e) {
    console.error("[instant-bookings confirm]", e);
    const message = e instanceof Error ? e.message : "결제 승인에 실패했습니다.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
