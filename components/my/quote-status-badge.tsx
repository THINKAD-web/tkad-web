type Props = { status: string };

const MAP: Record<
  string,
  { label: string; className: string }
> = {
  draft: {
    label: "초안",
    className: "border-border bg-card text-foreground",
  },
  booking_requested: {
    label: "예약 요청",
    className: "border-border bg-muted text-foreground",
  },
  booking_confirmed: {
    label: "예약 확정",
    className: "border-border bg-hero-void text-hero-fg",
  },
  invoice_sent: {
    label: "청구서 발송",
    className: "border-accent bg-card text-accent",
  },
  payment_confirmed: {
    label: "결제 완료",
    className: "border-accent bg-accent text-accent-foreground",
  },
  contract_confirmed: {
    label: "계약 확정",
    className: "border-accent bg-accent text-accent-foreground",
  },
  cancelled: {
    label: "취소",
    className: "border-border bg-card text-muted-foreground",
  },
};

export function QuoteStatusBadge({ status }: Props) {
  const m = MAP[status] ?? {
    label: status,
    className: "border-border bg-card text-foreground",
  };
  return (
    <span
      className={`inline-flex items-center border-2 px-2 py-0.5 font-mono text-[10px] font-bold uppercase tracking-[0.18em] ${m.className}`}
    >
      [ {m.label} ]
    </span>
  );
}
