import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Suspense } from "react";
import { Link } from "@/i18n/navigation";
import { ArrowLeft, Loader2 } from "lucide-react";
import { TossPaymentCheckout } from "@/components/instant-booking/toss-payment-checkout";
import { getPrisma } from "@/lib/prisma";
import { resolveLocaleParam } from "@/lib/resolve-locale";

type Props = { params: Promise<{ locale: string; id: string }> };

export default async function BookingPayPage({ params }: Props) {
  const locale = await resolveLocaleParam(params);
  setRequestLocale(locale);
  const { id } = await params;

  const db = getPrisma();
  const booking = await db.booking.findUnique({
    where: { id },
    include: { media: { select: { name: true } } },
  });
  if (!booking) notFound();
  if (booking.status === "paid" || booking.status === "confirmed") {
    return (
      <main className="mx-auto max-w-lg px-4 py-16 text-center">
        <p className="text-muted-foreground">
          {(await getTranslations("instantBooking.pay"))("alreadyPaid")}
        </p>
        <Link
          href={`/bookings/${id}`}
          className="mt-4 inline-block font-mono text-sm underline"
        >
          {(await getTranslations("instantBooking"))("viewBooking")}
        </Link>
      </main>
    );
  }
  if (booking.status !== "payment_pending") notFound();

  const t = await getTranslations("instantBooking.pay");
  const start = booking.startDate.toISOString().slice(0, 10);
  const end = booking.endDate.toISOString().slice(0, 10);

  return (
    <main className="mx-auto max-w-lg px-4 py-10 sm:px-6">
      <Link
        href={`/media/${booking.mediaId}/book`}
        className="mb-6 inline-flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.2em] text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        {t("back")}
      </Link>
      <h1 className="text-2xl font-black tracking-tight">{t("title")}</h1>
      <div className="mt-6 space-y-2 rounded-[20px] border border-border bg-card p-5 text-sm">
        <p className="font-semibold">{booking.media.name}</p>
        <p>
          {start} ~ {end}
        </p>
        <p className="font-mono text-xl font-black">
          {booking.amount.toLocaleString(locale === "ko" ? "ko-KR" : "en-US")}원
        </p>
        <p className="text-xs text-muted-foreground">
          {t("methodsHint")}
        </p>
      </div>
      <div className="mt-8">
        <Suspense
          fallback={
            <p className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              {t("loadingWidget")}
            </p>
          }
        >
          <TossPaymentCheckout
            bookingId={booking.id}
            orderId={booking.orderId}
            amount={booking.amount}
            orderName={`${booking.media.name} DOOH`}
            customerName={booking.contactName}
            customerEmail={booking.contactEmail}
            locale={locale}
          />
        </Suspense>
      </div>
    </main>
  );
}
