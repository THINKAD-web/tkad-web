"use client";

import { useEffect, useState } from "react";
import { Link, useRouter } from "@/i18n/navigation";
import { useTranslations } from "next-intl";
import {
  ArrowLeft,
  CalendarDays,
  Loader2,
} from "lucide-react";

type Status = "requested" | "tentative" | "confirmed" | "cancelled" | "expired";

type Item = {
  id: string;
  status: Status;
  startsAt: string;
  endsAt: string;
  budgetWon: number | null;
  notes: string | null;
  createdAt: string;
  decidedAt: string | null;
  media: {
    id: string;
    name: string;
    nameEn: string | null;
    location: string;
    type: string;
    image: string | null;
  };
};

function fmtDate(iso: string): string {
  return new Intl.DateTimeFormat("ko-KR", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(iso));
}

function fmtBudget(won: number | null): string {
  if (won == null || won <= 0) return "-";
  return `₩${won.toLocaleString("ko-KR")}`;
}

const STATUS_STYLE: Record<Status, string> = {
  requested: "border-amber-400 bg-amber-50 text-amber-900",
  tentative: "border-bx-black bg-bx-off text-bx-black",
  confirmed: "border-emerald-500 bg-emerald-50 text-emerald-900",
  cancelled: "border-rose-400 bg-rose-50 text-rose-900",
  expired: "border-slate-300 bg-slate-50 text-slate-500",
};

export default function MyBookingRequestsPage() {
  const t = useTranslations("myBookingRequests");
  const router = useRouter();
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [authChecked, setAuthChecked] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        // 세션 확인
        const sessRes = await fetch("/api/auth/session", { cache: "no-store" });
        const sess = await sessRes.json();
        if (cancelled) return;
        if (!sess.ok || !sess.data) {
          router.replace("/login?redirect=/my/booking-requests");
          return;
        }
        setAuthChecked(true);

        const res = await fetch("/api/my/booking-requests", {
          cache: "no-store",
        });
        if (!res.ok) {
          throw new Error(`HTTP ${res.status}`);
        }
        const j = (await res.json()) as { ok?: boolean; data?: { items: Item[] } };
        if (cancelled) return;
        setItems(j.data?.items ?? []);
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : "fetch failed");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [router]);

  if (!authChecked && loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-bx-accent" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6 lg:px-8">
      <div className="mb-6">
        <Link
          href="/my"
          className="mb-3 inline-flex items-center gap-1 border-b-2 border-bx-black pb-0.5 font-mono text-[11px] font-bold uppercase tracking-[0.18em] text-bx-black transition-colors hover:text-bx-accent hover:border-bx-accent"
        >
          <ArrowLeft className="h-4 w-4" />
          {t("backToMy")}
        </Link>
        <p className="font-mono text-[10px] font-bold uppercase tracking-[0.22em] text-bx-accent">
          [ {t("eyebrow")} ]
        </p>
        <h1 className="mt-2 text-2xl font-bold tracking-tight text-bx-black sm:text-3xl">
          <CalendarDays
            className="mr-2 inline-block h-6 w-6 text-bx-accent"
            aria-hidden
          />
          {t("title")}
        </h1>
        <p className="mt-1 text-sm text-bx-gray-dim">{t("desc")}</p>
      </div>

      {loading ? (
        <div className="flex items-center justify-center gap-2 border-2 border-bx-black bg-bx-off px-4 py-12 font-mono text-[11px] uppercase tracking-[0.18em] text-bx-gray-dim">
          <Loader2 className="h-4 w-4 animate-spin" />
          {t("loading")}
        </div>
      ) : error ? (
        <p className="border-2 border-bx-accent bg-bx-white px-4 py-3 font-mono text-[11px] tracking-tight text-bx-accent">
          {`// `}
          {t("error")}
        </p>
      ) : items.length === 0 ? (
        <div className="border-2 border-bx-black bg-bx-off p-12 text-center">
          <p className="font-mono text-[12px] uppercase tracking-[0.22em] text-bx-gray-dim">
            {`// `}
            {t("empty")}
          </p>
          <Link
            href="/media"
            className="mt-6 inline-flex items-center gap-2 border-2 border-bx-black bg-bx-black px-5 py-2.5 font-mono text-[11px] font-bold uppercase tracking-[0.22em] text-bx-white transition-colors hover:bg-bx-accent hover:border-bx-accent"
          >
            {t("browseMedia")}
          </Link>
        </div>
      ) : (
        <ul className="space-y-3">
          {items.map((it) => {
            const statusLabel = t(`status.${it.status}`);
            return (
              <li
                key={it.id}
                className="flex flex-col gap-3 border-2 border-bx-black bg-bx-white p-5 sm:flex-row sm:items-start sm:gap-5"
              >
                <Link
                  href={`/media/${it.media.id}`}
                  className="block w-full shrink-0 sm:w-32"
                  aria-label={it.media.name}
                >
                  {it.media.image ? (
                    /* eslint-disable-next-line @next/next/no-img-element */
                    <img
                      src={it.media.image}
                      alt=""
                      className="aspect-video w-full border-2 border-bx-black object-cover sm:aspect-square"
                    />
                  ) : (
                    <div className="flex aspect-video w-full items-center justify-center border-2 border-bx-black bg-bx-off font-mono text-[10px] uppercase tracking-[0.18em] text-bx-gray-dim sm:aspect-square">
                      {`// no image`}
                    </div>
                  )}
                </Link>

                <div className="min-w-0 flex-1 space-y-2">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div className="min-w-0">
                      <Link
                        href={`/media/${it.media.id}`}
                        className="line-clamp-1 text-base font-bold tracking-tight text-bx-black hover:text-bx-accent sm:text-lg"
                      >
                        {it.media.name}
                      </Link>
                      <p className="mt-0.5 line-clamp-1 font-mono text-[11px] uppercase tracking-[0.16em] text-bx-gray-dim">
                        {`// `}
                        {it.media.location}
                      </p>
                    </div>
                    <span
                      className={`shrink-0 border-2 px-2 py-0.5 font-mono text-[10px] font-bold uppercase tracking-[0.18em] ${STATUS_STYLE[it.status]}`}
                    >
                      {statusLabel}
                    </span>
                  </div>

                  <dl className="grid grid-cols-1 gap-1 text-sm sm:grid-cols-2">
                    <div className="flex gap-2">
                      <dt className="w-20 shrink-0 font-mono text-[10px] uppercase tracking-[0.16em] text-bx-gray-dim">
                        {t("period")}
                      </dt>
                      <dd className="text-bx-black">
                        {fmtDate(it.startsAt)} → {fmtDate(it.endsAt)}
                      </dd>
                    </div>
                    <div className="flex gap-2">
                      <dt className="w-20 shrink-0 font-mono text-[10px] uppercase tracking-[0.16em] text-bx-gray-dim">
                        {t("budget")}
                      </dt>
                      <dd className="text-bx-black">{fmtBudget(it.budgetWon)}</dd>
                    </div>
                    <div className="flex gap-2">
                      <dt className="w-20 shrink-0 font-mono text-[10px] uppercase tracking-[0.16em] text-bx-gray-dim">
                        {t("requestedAt")}
                      </dt>
                      <dd className="text-bx-black">{fmtDate(it.createdAt)}</dd>
                    </div>
                    {it.decidedAt ? (
                      <div className="flex gap-2">
                        <dt className="w-20 shrink-0 font-mono text-[10px] uppercase tracking-[0.16em] text-bx-gray-dim">
                          {t("decidedAt")}
                        </dt>
                        <dd className="text-bx-black">{fmtDate(it.decidedAt)}</dd>
                      </div>
                    ) : null}
                  </dl>

                  {it.notes ? (
                    <p className="border-l-4 border-bx-accent bg-bx-off px-3 py-2 text-xs text-bx-black">
                      <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-bx-gray-dim">
                        {t("note")}:
                      </span>{" "}
                      {it.notes}
                    </p>
                  ) : null}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
