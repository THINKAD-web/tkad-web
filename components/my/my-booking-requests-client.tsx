"use client";

import { useEffect, useState } from "react";
import { Link, useRouter } from "@/i18n/navigation";
import { useTranslations } from "next-intl";
import { ArrowLeft, CalendarDays, Loader2 } from "lucide-react";
import { FullPageSpinner } from "@/components/ui/spinner";
import { cn } from "@/lib/utils";

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

const glassCard =
  "rounded-2xl border dark:border-white/12 border-gray-200 dark:bg-white/5 bg-gray-50 shadow-[0_12px_40px_rgba(0,0,0,0.35)] backdrop-blur";

const STATUS_STYLE: Record<Status, string> = {
  requested:
    "border-amber-400/40 bg-amber-500/15 text-amber-900 dark:text-amber-200",
  tentative:
    "border-white/20 bg-white/10 text-gray-900 dark:text-white/90",
  confirmed:
    "border-emerald-400/40 bg-emerald-500/15 text-emerald-900 dark:text-emerald-200",
  cancelled:
    "border-rose-400/40 bg-rose-500/15 text-rose-900 dark:text-rose-200",
  expired:
    "border-white/15 bg-white/5 text-gray-500 dark:text-white/50",
};

export function MyBookingRequestsClient() {
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
        const j = (await res.json()) as {
          ok?: boolean;
          data?: { items: Item[] };
        };
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
    return <FullPageSpinner label={t("loading")} />;
  }

  return (
      <div className="relative mx-auto max-w-5xl">
          <Link
            href="/my"
            className="mb-6 inline-flex items-center gap-2 text-[12px] dark:text-white text-gray-500 transition-colors hover:dark:text-white text-gray-900"
          >
            <ArrowLeft className="h-4 w-4" />
            {t("backToMy")}
          </Link>

          <header className="mb-8">
            <p className="font-display text-xs font-medium uppercase tracking-[0.22em] dark:text-white text-gray-500">
              [ {t("eyebrow")} ]
            </p>
            <h1 className="mt-2 flex items-center gap-2 text-2xl font-black dark:text-white text-gray-900 sm:text-3xl">
              <CalendarDays className="h-7 w-7 text-cyan-300" aria-hidden />
              {t("title")}
            </h1>
            <p className="mt-2 text-sm dark:text-white text-gray-600">{t("desc")}</p>
          </header>

          {loading ? (
            <div
              className={cn(
                glassCard,
                "flex items-center justify-center gap-2 px-4 py-12 font-display text-xs font-medium uppercase tracking-[0.18em] dark:text-white text-gray-500",
              )}
            >
              <Loader2 className="h-4 w-4 animate-spin" />
              {t("loading")}
            </div>
          ) : error ? (
            <p
              className={cn(
                glassCard,
                "border-rose-400/30 px-4 py-3 text-[12px] tracking-tight text-rose-700 dark:text-rose-200",
              )}
            >
              {`// `}
              {t("error")}
            </p>
          ) : items.length === 0 ? (
            <div className={cn(glassCard, "p-12 text-center")}>
              <p className="font-display text-[12px] uppercase tracking-[0.22em] dark:text-white text-gray-500">
                {`// `}
                {t("empty")}
              </p>
              <Link
                href="/media"
                className="mt-6 inline-flex items-center gap-2 rounded-xl border dark:border-white/15 border-gray-200 bg-[linear-gradient(135deg,rgba(168,85,247,0.85),rgba(34,211,238,0.85))] px-5 py-2.5 font-display text-xs font-semibold uppercase tracking-[0.18em] text-white shadow-[0_12px_40px_rgba(0,0,0,0.35)] transition-transform hover:-translate-y-0.5"
              >
                {t("browseMedia")}
              </Link>
            </div>
          ) : (
            <ul className="space-y-4">
              {items.map((it) => {
                const statusLabel = t(`status.${it.status}`);
                return (
                  <li
                    key={it.id}
                    className={cn(
                      glassCard,
                      "flex flex-col gap-4 p-5 sm:flex-row sm:items-start sm:gap-5",
                    )}
                  >
                    <Link
                      href={`/media/${it.media.id}`}
                      className="block w-full shrink-0 overflow-hidden rounded-xl border dark:border-white/10 border-gray-200 sm:w-32"
                      aria-label={it.media.name}
                    >
                      {it.media.image ? (
                        /* eslint-disable-next-line @next/next/no-img-element */
                        <img
                          src={it.media.image}
                          alt=""
                          className="aspect-video w-full object-cover sm:aspect-square"
                        />
                      ) : (
                        <div className="flex aspect-video w-full items-center justify-center bg-white/5 font-display text-xs font-medium uppercase tracking-[0.18em] dark:text-white text-gray-500 sm:aspect-square">
                          {`// no image`}
                        </div>
                      )}
                    </Link>

                    <div className="min-w-0 flex-1 space-y-3">
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <div className="min-w-0">
                          <Link
                            href={`/media/${it.media.id}`}
                            className="line-clamp-1 text-base font-bold tracking-tight dark:text-white text-gray-900 transition-colors hover:text-cyan-300 sm:text-lg"
                          >
                            {it.media.name}
                          </Link>
                          <p className="mt-0.5 line-clamp-1 font-display text-xs font-medium uppercase tracking-[0.16em] dark:text-white text-gray-500">
                            {`// `}
                            {it.media.location}
                          </p>
                        </div>
                        <span
                          className={cn(
                            "shrink-0 rounded-full border px-3 py-1 font-display text-[10px] font-semibold uppercase tracking-[0.16em]",
                            STATUS_STYLE[it.status],
                          )}
                        >
                          {statusLabel}
                        </span>
                      </div>

                      <dl className="grid grid-cols-1 gap-2 text-sm sm:grid-cols-2">
                        <div className="flex gap-2">
                          <dt className="w-20 shrink-0 font-display text-xs font-medium uppercase tracking-[0.16em] dark:text-white text-gray-500">
                            {t("period")}
                          </dt>
                          <dd className="dark:text-white text-gray-800">
                            {fmtDate(it.startsAt)} → {fmtDate(it.endsAt)}
                          </dd>
                        </div>
                        <div className="flex gap-2">
                          <dt className="w-20 shrink-0 font-display text-xs font-medium uppercase tracking-[0.16em] dark:text-white text-gray-500">
                            {t("budget")}
                          </dt>
                          <dd className="dark:text-white text-gray-800">
                            {fmtBudget(it.budgetWon)}
                          </dd>
                        </div>
                        <div className="flex gap-2">
                          <dt className="w-20 shrink-0 font-display text-xs font-medium uppercase tracking-[0.16em] dark:text-white text-gray-500">
                            {t("requestedAt")}
                          </dt>
                          <dd className="dark:text-white text-gray-800">
                            {fmtDate(it.createdAt)}
                          </dd>
                        </div>
                        {it.decidedAt ? (
                          <div className="flex gap-2">
                            <dt className="w-20 shrink-0 font-display text-xs font-medium uppercase tracking-[0.16em] dark:text-white text-gray-500">
                              {t("decidedAt")}
                            </dt>
                            <dd className="dark:text-white text-gray-800">
                              {fmtDate(it.decidedAt)}
                            </dd>
                          </div>
                        ) : null}
                      </dl>

                      {it.notes ? (
                        <p className="rounded-xl border-l-4 border-cyan-400/50 bg-white/5 px-3 py-2 text-xs dark:text-white text-gray-700">
                          <span className="font-display text-xs font-medium uppercase tracking-[0.16em] dark:text-white text-gray-500">
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
