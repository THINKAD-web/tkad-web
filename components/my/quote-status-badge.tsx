type Props = { status: string };

const MAP: Record<
  string,
  { label: string; className: string }
> = {
  draft: {
    label: "초안",
    className: "border-bx-black bg-bx-white text-bx-black",
  },
  booking_requested: {
    label: "예약 요청",
    className: "border-bx-black bg-bx-off text-bx-black",
  },
  booking_confirmed: {
    label: "예약 확정",
    className: "border-bx-black bg-bx-black text-bx-white",
  },
  invoice_sent: {
    label: "청구서 발송",
    className: "border-bx-accent bg-bx-white text-bx-accent",
  },
  payment_confirmed: {
    label: "결제 완료",
    className: "border-bx-accent bg-bx-accent text-bx-white",
  },
  contract_confirmed: {
    label: "계약 확정",
    className: "border-bx-accent bg-bx-accent text-bx-white",
  },
  cancelled: {
    label: "취소",
    className: "border-bx-black bg-bx-white text-bx-gray-dim",
  },
};

export function QuoteStatusBadge({ status }: Props) {
  const m = MAP[status] ?? {
    label: status,
    className: "border-bx-black bg-bx-white text-bx-black",
  };
  return (
    <span
      className={`inline-flex items-center border-2 px-2 py-0.5 font-mono text-[10px] font-bold uppercase tracking-[0.18em] ${m.className}`}
    >
      [ {m.label} ]
    </span>
  );
}
