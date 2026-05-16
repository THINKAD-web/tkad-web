import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

type Params = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: Params) {
  const { id } = await params;
  const booking = await prisma.booking.findUnique({
    where: { id },
    include: {
      media: {
        select: {
          id: true,
          name: true,
          location: true,
          image: true,
        },
      },
    },
  });

  if (!booking) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json({
    id: booking.id,
    mediaId: booking.mediaId,
    mediaName: booking.media.name,
    mediaLocation: booking.media.location,
    mediaImageUrl: booking.media.image,
    startDate: booking.startDate.toISOString(),
    endDate: booking.endDate.toISOString(),
    creativeUrl: booking.creativeUrl,
    creativeType: booking.creativeType,
    amount: booking.amount,
    status: booking.status,
    orderId: booking.orderId,
    contactName: booking.contactName,
    contactEmail: booking.contactEmail,
    paidAt: booking.paidAt?.toISOString() ?? null,
    executionConfirmedAt: booking.executionConfirmedAt?.toISOString() ?? null,
  });
}
