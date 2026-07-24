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
import {
  createInstantPaymentHold,
  isInstantHoldConflictError,
} from "@/lib/instant-booking-hold";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      mediaId?: string;
      startDate?: string;
      endDate?: string;
      creativeUrl?: string;
      creativeType?: string;
      /** 광고주 라이브러리에서 선택한 Creative.id (옵션) */
      creativeId?: string;
      /** 플레이리스트로 보낸 경우 그 id (옵션) */
      playlistId?: string;
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

    const user = await getCurrentUser();
    if (user) {
      const { assertUserCanContactOrPay } = await import(
        "@/lib/team-access-guard"
      );
      const guard = await assertUserCanContactOrPay(user.id);
      if (!guard.ok) {
        return NextResponse.json({ error: guard.message }, { status: 403 });
      }
    }
    const orderId = generateOrderId();

    // 라이브러리/플레이리스트 ID 가 들어왔다면 본인 소유 여부 검증 후에만 링크
    let linkedCreativeId: string | null = null;
    let linkedPlaylistId: string | null = null;
    if (user) {
      const candidateCreativeId = body.creativeId?.trim();
      if (candidateCreativeId) {
        const owned = await prisma.creative.findFirst({
          where: { id: candidateCreativeId, userId: user.id, deletedAt: null },
          select: { id: true },
        });
        if (owned) linkedCreativeId = owned.id;
      }
      const candidatePlaylistId = body.playlistId?.trim();
      if (candidatePlaylistId) {
        const ownedPl = await prisma.creativePlaylist.findFirst({
          where: { id: candidatePlaylistId, userId: user.id, deletedAt: null },
          select: { id: true },
        });
        if (ownedPl) linkedPlaylistId = ownedPl.id;
      }
    }

    const startsAt = new Date(start);
    startsAt.setHours(0, 0, 0, 0);
    const endsAt = new Date(end);
    endsAt.setHours(23, 59, 59, 999);

    const booking = await prisma.$transaction(async (tx) => {
      const created = await tx.booking.create({
        data: {
          mediaId,
          userId: user?.id ?? null,
          startDate: start,
          endDate: end,
          creativeUrl,
          creativeType: body.creativeType?.trim() || null,
          creativeId: linkedCreativeId,
          playlistId: linkedPlaylistId,
          amount,
          status: "payment_pending",
          orderId,
          contactName,
          contactEmail,
          contactPhone: contactPhone || null,
        },
      });

      await createInstantPaymentHold(tx, {
        bookingId: created.id,
        mediaId,
        mediaName: media.name,
        startsAt,
        endsAt,
        contactName,
        contactEmail,
        contactPhone: contactPhone || null,
        userId: user?.id ?? null,
        amount,
      });

      return tx.booking.findUniqueOrThrow({ where: { id: created.id } });
    });

    return NextResponse.json({
      id: booking.id,
      orderId: booking.orderId,
      amount: booking.amount,
      mediaBookingId: booking.mediaBookingId,
    });
  } catch (e) {
    if (isInstantHoldConflictError(e)) {
      return NextResponse.json(
        { error: "선택한 기간에 이미 예약이 있습니다." },
        { status: 409 },
      );
    }
    console.error("[instant-bookings POST]", e);
    return NextResponse.json(
      { error: "예약 생성에 실패했습니다." },
      { status: 500 },
    );
  }
}
