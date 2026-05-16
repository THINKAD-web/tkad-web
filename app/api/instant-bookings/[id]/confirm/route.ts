import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { confirmTossPayment } from "@/lib/toss-payments";
import { fulfillInstantBooking } from "@/lib/instant-booking-fulfill";

type Params = { params: Promise<{ id: string }> };

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

    if (booking.amount !== amount) {
      return NextResponse.json({ error: "결제 금액이 일치하지 않습니다." }, { status: 400 });
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
