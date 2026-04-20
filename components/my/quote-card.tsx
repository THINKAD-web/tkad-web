import Link from "next/link";
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
    <li className="bg-card border border-border/60 rounded-xl p-4 hover:border-primary/40 hover:shadow-md hover:-translate-y-px transition-all duration-200">
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="min-w-0">
          <div className="text-sm font-semibold text-gray-900 truncate">
            {variant === "campaign"
              ? item.clientCompany ?? item.clientName
              : `제안서 #${item.id.slice(-8)}`}
          </div>
          <div className="text-xs text-gray-500 mt-0.5">
            {variant === "campaign"
              ? `${formatDate(item.startDate)} ~ ${formatDate(item.endDate)}`
              : formatDate(item.createdAt)}
            {" · "}
            {item.mediaCount}개 매체
            {variant !== "campaign" && ` · ${item.period}`}
          </div>
        </div>
        <QuoteStatusBadge status={item.status} />
      </div>
      <div className="flex items-center justify-between pt-3 border-t border-gray-100">
        <span className="text-base font-bold text-primary tabular-nums">
          {formatKRW(item.totalAmount)}
        </span>
        <div className="flex items-center gap-1.5">
          <Link
            href={`/quote/${item.id}/preview`}
            className="inline-flex items-center gap-1 text-xs font-medium px-3 py-1.5 border border-border bg-card rounded-lg text-foreground hover:bg-secondary/60 transition-colors"
          >
            상세
            <ChevronRight className="w-3 h-3" />
          </Link>
          {variant !== "campaign" && (
            <a
              href={`/api/quote/${item.id}/pdf`}
              className="inline-flex items-center gap-1 text-xs font-medium px-3 py-1.5 bg-primary text-white rounded-lg hover:opacity-90 hover:shadow-sm transition-all"
            >
              <Download className="w-3 h-3" />
              PDF
            </a>
          )}
        </div>
      </div>
    </li>
  );
}
