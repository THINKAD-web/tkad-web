import Link from "next/link";
import { notFound } from "next/navigation";
import { AdminInquiryQuotePanel } from "@/components/admin/admin-inquiry-quote-panel";
import AdminInquiryStatusControls from "@/components/admin-inquiry-status-controls";
import { getPrisma, isDatabaseConfigured } from "@/lib/prisma";
import {
  parseInquiryAdminStatusCode,
  parseStoredContactInquiryMessage,
} from "@/lib/contact-inquiry-labels";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ id: string; locale: string }> };

export default async function AdminInquiryDetailPage({ params }: Props) {
  const { id } = await params;

  if (!isDatabaseConfigured()) notFound();

  const db = getPrisma();
  const inquiry = await db.contactInquiry.findUnique({
    where: { id },
    include: {
      oohQuote: {
        select: {
          id: true,
          status: true,
          totalAmount: true,
          mediaIds: true,
          period: true,
        },
      },
    },
  });

  if (!inquiry) notFound();

  const parsed = parseStoredContactInquiryMessage(inquiry.message);
  const status = parseInquiryAdminStatusCode(parsed.adminStatusLabel) ?? "new";

  return (
    <div className="mx-auto max-w-4xl space-y-6 px-4 py-8">
      <Link
        href="/admin/inquiries"
        className="text-sm font-medium text-muted-foreground hover:text-foreground"
      >
        ← 문의 목록
      </Link>

      <div>
        <p className="tkad-type-label text-muted-foreground">
          [ INQUIRY DETAIL ]
        </p>
        <h1 className="mt-2 text-2xl font-bold tracking-tight">
          {inquiry.company || inquiry.name}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {inquiry.name} · {inquiry.phone}
          {inquiry.email ? ` · ${inquiry.email}` : ""} ·{" "}
          {inquiry.createdAt.toLocaleString("ko-KR", {
            timeZone: "Asia/Seoul",
          })}
        </p>
      </div>

      <AdminInquiryQuotePanel
        inquiryId={inquiry.id}
        quote={inquiry.oohQuote}
      />

      <div className="grid gap-6 lg:grid-cols-[320px,minmax(0,1fr)]">
        <AdminInquiryStatusControls
          inquiryId={inquiry.id}
          status={status}
          assignee={parsed.adminAssignee}
          note={parsed.adminNote}
        />
        <div className="rounded-2xl border border-border bg-card p-5">
          <p className="tkad-type-label text-muted-foreground">
            문의 내용
          </p>
          <pre className="mt-3 whitespace-pre-wrap text-sm leading-relaxed text-foreground">
            {parsed.body}
          </pre>
        </div>
      </div>
    </div>
  );
}
