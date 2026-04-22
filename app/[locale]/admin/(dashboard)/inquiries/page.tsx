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
    <div className="space-y-5">
      <header>
        <h1 className="text-xl font-bold text-slate-900">문의 관리</h1>
        <p className="mt-1 text-sm text-slate-500">
          Contact 폼으로 접수된 문의 · 최근 200건
        </p>
      </header>

      {items.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <MessageSquareText className="w-10 h-10 text-slate-300 mx-auto mb-3" />
            <p className="text-sm font-medium text-slate-700">접수된 문의가 없습니다</p>
            <p className="text-xs text-slate-500 mt-1">
              Contact 페이지에서 문의가 등록되면 여기에 표시됩니다.
            </p>
          </CardContent>
        </Card>
      ) : (
        <ul className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {items.map((inq) => (
            <li key={inq.id}>
              <Card className="h-full hover:border-primary/40 hover:shadow-md transition-all">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <CardTitle className="text-base truncate">{inq.company}</CardTitle>
                      <p className="text-xs text-slate-500 mt-0.5">
                        {inq.name} · {formatDateTime(inq.createdAt)}
                      </p>
                    </div>
                    {inq.inquiryType && (
                      <Badge variant="outline" className="text-[10px] flex-shrink-0">
                        {inq.inquiryType}
                      </Badge>
                    )}
                  </div>
                </CardHeader>
                <CardContent className="pt-0 space-y-2">
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-600">
                    <span className="inline-flex items-center gap-1">
                      <Phone className="w-3 h-3" />
                      <a href={`tel:${inq.phone}`} className="hover:text-primary">
                        {inq.phone}
                      </a>
                    </span>
                    {inq.email && (
                      <span className="inline-flex items-center gap-1">
                        <Mail className="w-3 h-3" />
                        <a href={`mailto:${inq.email}`} className="hover:text-primary">
                          {inq.email}
                        </a>
                      </span>
                    )}
                    {inq.budget && (
                      <span className="inline-flex items-center gap-1 text-slate-500">
                        <Building2 className="w-3 h-3" />
                        {inq.budget}
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-wrap bg-slate-50 border border-slate-100 rounded-lg p-3">
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
