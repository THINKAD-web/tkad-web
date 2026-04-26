import { Link } from "@/i18n/navigation";
import { ChevronRight, Download } from "lucide-react";
import { QuoteStatusBadge } from "./quote-status-badge";

export type QuoteCardItem = {
  id: string;
  status: string;
  clientCompany: string | null;
  clientName: string;
  period: string;
  startDate: string | null;
  endDate: string | null;
  totalAmount: number;
  mediaCount: number;
  createdAt: string;
};

function formatKRW(v: number): string {
  return `₩${new Intl.NumberFormat("ko-KR").format(v)}`;
}
function formatDate(s: string | null): string {
  if (!s) return "-";
  return new Date(s).toLocaleDateString("ko-KR");
}

export function QuoteCard({
  item,
  variant = "list",
}: {
  item: QuoteCardItem;
  variant?: "list" | "campaign";
}) {
  return (
    <li className="-mt-[2px] border-2 border-bx-black bg-bx-white p-4 transition-colors hover:bg-bx-off">
      <div className="mb-3 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="font-mono text-[10px] font-bold uppercase tracking-[0.22em] text-bx-accent">
            [ {variant === "campaign" ? "CAMPAIGN" : "QUOTE"} / {item.id.slice(-8).toUpperCase()} ]
          </p>
          <div className="mt-1 truncate text-sm font-bold tracking-tight text-bx-black">
            {variant === "campaign"
              ? item.clientCompany ?? item.clientName
              : `견적서 #${item.id.slice(-8)}`}
          </div>
          <div className="mt-1 font-mono text-[11px] uppercase tracking-[0.18em] text-bx-gray-dim">
            {`// `}{variant === "campaign"
              ? `${formatDate(item.startDate)} ~ ${formatDate(item.endDate)}`
              : formatDate(item.createdAt)}
            {" · "}
            {item.mediaCount}개 매체
            {variant !== "campaign" && ` · ${item.period}`}
          </div>
        </div>
        <QuoteStatusBadge status={item.status} />
      </div>
      <div className="flex items-center justify-between border-t-2 border-bx-black pt-3">
        <span className="font-mono text-base font-bold tabular-nums text-bx-accent">
          {formatKRW(item.totalAmount)}
        </span>
        <div className="flex items-center gap-0">
          <Link
            href={`/quote/${item.id}/preview`}
            className="-ml-[2px] inline-flex items-center gap-1 border-2 border-bx-black bg-bx-white px-3 py-1.5 font-mono text-[11px] font-bold uppercase tracking-[0.18em] text-bx-black transition-colors hover:bg-bx-black hover:text-bx-white"
          >
            상세
            <ChevronRight className="h-3 w-3" />
          </Link>
          {variant !== "campaign" && (
            <a
              href={`/api/quote/${item.id}/pdf`}
              className="-ml-[2px] inline-flex items-center gap-1 border-2 border-bx-accent bg-bx-accent px-3 py-1.5 font-mono text-[11px] font-bold uppercase tracking-[0.18em] text-bx-white transition-colors hover:bg-bx-black hover:border-bx-black"
            >
              <Download className="h-3 w-3" />
              PDF
            </a>
          )}
        </div>
      </div>
    </li>
  );
}
