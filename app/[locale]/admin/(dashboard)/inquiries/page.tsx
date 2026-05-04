// app/[locale]/admin/(dashboard)/inquiries/page.tsx
// 설명: Admin 문의 관리 — 실 DB 기반 (ContactInquiry). 목업 제거

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { MessageSquareText, Mail, Phone, Building2 } from "lucide-react";
import { getPrisma, isDatabaseConfigured } from "@/lib/prisma";

export const dynamic = "force-dynamic";

function formatDateTime(d: Date): string {
  return d.toLocaleString("ko-KR", {
    year: "2-digit",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

async function loadInquiries() {
  if (!isDatabaseConfigured()) return [];
  const db = getPrisma();
  try {
    return await db.contactInquiry.findMany({
      orderBy: { createdAt: "desc" },
      take: 200,
    });
  } catch {
    return [];
  }
}

export default async function AdminInquiriesPage() {
  const items = await loadInquiries();

  return (
    <div className="space-y-6 text-foreground">
      <header>
        <p className="font-mono text-[10px] font-bold uppercase tracking-[0.22em] text-muted-foreground">
          [ INQUIRIES ]
        </p>
        <h1 className="mt-2 text-xl font-bold tracking-tight">문의 관리</h1>
        <p className="mt-1 font-mono text-[11px] tracking-tight text-muted-foreground">
          {`// `}Contact 폼으로 접수된 문의 · 최근 200건
        </p>
      </header>

      {items.length === 0 ? (
        <Card className="border-2 border-border bg-card">
          <CardContent className="py-12 text-center">
            <MessageSquareText className="mx-auto mb-3 h-10 w-10 text-muted-foreground" />
            <p className="text-sm font-bold">접수된 문의가 없습니다</p>
            <p className="mt-1 font-mono text-[11px] tracking-tight text-muted-foreground">
              {`// `}Contact 페이지에서 문의가 등록되면 여기에 표시됩니다.
            </p>
          </CardContent>
        </Card>
      ) : (
        <ul className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {items.map((inq) => (
            <li key={inq.id}>
              <Card className="h-full border-2 border-border bg-card transition-colors hover:bg-muted/50">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <CardTitle className="truncate text-base">{inq.company}</CardTitle>
                      <p className="mt-0.5 font-mono text-[11px] tracking-tight text-muted-foreground">
                        {inq.name} · {formatDateTime(inq.createdAt)}
                      </p>
                    </div>
                    {inq.inquiryType && (
                      <Badge
                        variant="outline"
                        className="flex-shrink-0 border-2 border-border bg-primary text-[10px] font-mono font-bold uppercase tracking-[0.18em] text-primary-foreground border-border"
                      >
                        {inq.inquiryType}
                      </Badge>
                    )}
                  </div>
                </CardHeader>
                <CardContent className="pt-0 space-y-2">
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1 font-mono text-[11px] tracking-tight text-muted-foreground">
                    <span className="inline-flex items-center gap-1">
                      <Phone className="h-3 w-3" />
                      <a
                        href={`tel:${inq.phone}`}
                        className="font-bold text-foreground transition-colors hover:text-primary"
                      >
                        {inq.phone}
                      </a>
                    </span>
                    {inq.email && (
                      <span className="inline-flex items-center gap-1">
                        <Mail className="h-3 w-3" />
                        <a
                          href={`mailto:${inq.email}`}
                          className="font-bold text-foreground transition-colors hover:text-primary"
                        >
                          {inq.email}
                        </a>
                      </span>
                    )}
                    {inq.budget && (
                      <span className="inline-flex items-center gap-1">
                        <Building2 className="h-3 w-3" />
                        {inq.budget}
                      </span>
                    )}
                  </div>
                  <p className="whitespace-pre-wrap border-2 border-border bg-card p-3 text-sm leading-relaxed text-foreground">
                    {inq.message}
                  </p>
                </CardContent>
              </Card>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
