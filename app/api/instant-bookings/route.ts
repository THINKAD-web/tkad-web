import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { resolveMediaForDetail } from "@/lib/public-media-catalog";
import { isInstantBookingEligible } from "@/lib/instant-booking-eligibility";
import {
  computeInstantBookingAmount,
  countBookingDays,
} from "@/lib/instant-booking-pricing";
import { generateOrderId } from "@/lib/toss-payments";
import { getCurrentUser } from "@/lib/user-session";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      mediaId?: string;
      startDate?: string;
      endDate?: string;
      creativeUrl?: string;
      creativeType?: string;
      contactName?: string;
      contactEmail?: string;
      contactPhone?: string;
    };

    const mediaId = body.mediaId?.trim();
    const startDate = body.startDate?.trim();
    const endDate = body.endDate?.trim();
    const creativeUrl = body.creativeUrl?.trim();
    const contactName = body.contactName?.trim();
    const contactEmail = body.contactEmail?.trim();
    const contactPhone = body.contactPhone?.trim();

    if (
      !mediaId ||
      !startDate ||
      !endDate ||
      !creativeUrl ||
      !contactName ||
      !contactEmail
    ) {
      return NextResponse.json(
        { error: "필수 항목을 모두 입력해 주세요." },
        { status: 400 },
      );
    }

    const start = new Date(startDate);
    const end = new Date(endDate);
    if (
      Number.isNaN(start.getTime()) ||
      Number.isNaN(end.getTime()) ||
      end < start
    ) {
      return NextResponse.json(
        { error: "유효하지 않은 기간입니다." },
        { status: 400 },
      );
    }

    const days = countBookingDays(start, end);
    if (days < 1) {
      return NextResponse.json(
        { error: "최소 1일 이상 선택해 주세요." },
        { status: 400 },
      );
    }

    const media = await resolveMediaForDetail(mediaId);
    if (!media) {
      return NextResponse.json(
        { error: "매체를 찾을 수 없습니다." },
        { status: 404 },
      );
    }

    const eligibility = isInstantBookingEligible(media);
    if (!eligibility.eligible) {
      return NextResponse.json(
        {
          error:
            eligibility.reasonKo ?? "이 매체는 즉시 예약 대상이 아닙니다.",
        },
        { status: 400 },
      );
    }

    const amount = computeInstantBookingAmount(media, start, end);

    const overlapping = await prisma.mediaBooking.findFirst({
      where: {
        mediaId,
        status: { in: ["tentative", "confirmed"] },
        startsAt: { lte: end },
        endsAt: { gte: start },
      },
    });
    if (overlapping) {
      return NextResponse.json(
        { error: "선택한 기간에 이미 예약이 있습니다." },
        { status: 409 },
      );
    }

    const user = await getCurrentUser();
    const orderId = generateOrderId();

    const booking = await prisma.booking.create({
      data: {
        mediaId,
        userId: user?.id ?? null,
        startDate: start,
        endDate: end,
        creativeUrl,
        creativeType: body.creativeType?.trim() || null,
        amount,
        status: "payment_pending",
        orderId,
        contactName,
        contactEmail,
        contactPhone: contactPhone || null,
      },
    });

    return NextResponse.json({
      id: booking.id,
      orderId: booking.orderId,
      amount: booking.amount,
    });
  } catch (e) {
    console.error("[instant-bookings POST]", e);
    return NextResponse.json(
      { error: "예약 생성에 실패했습니다." },
      { status: 500 },
    );
  }
}
