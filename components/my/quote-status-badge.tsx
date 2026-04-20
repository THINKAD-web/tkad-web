type Props = { status: string };

const MAP: Record<
  string,
  { label: string; className: string }
> = {
  draft: { label: "초안", className: "bg-gray-100 text-gray-700 border-gray-200" },
  booking_requested: {
    label: "예약 요청",
    className: "bg-blue-50 text-blue-700 border-blue-200",
  },
  booking_confirmed: {
    label: "예약 확정",
    className: "bg-indigo-50 text-indigo-700 border-indigo-200",
  },
  invoice_sent: {
    label: "청구서 발송",
    className: "bg-purple-50 text-purple-700 border-purple-200",
  },
  payment_confirmed: {
    label: "결제 완료",
    className: "bg-emerald-50 text-emerald-700 border-emerald-200",
  },
  contract_confirmed: {
    label: "계약 확정",
    className: "bg-amber-50 text-amber-800 border-amber-200",
  },
  cancelled: {
    label: "취소",
    className: "bg-red-50 text-red-700 border-red-200",
  },
};

export function QuoteStatusBadge({ status }: Props) {
  const m = MAP[status] ?? { label: status, className: "bg-gray-100 text-gray-700 border-gray-200" };
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded-full border text-[11px] font-medium ${m.className}`}
    >
      {m.label}
    </span>
  );
}
