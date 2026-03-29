"use client";

import { useState, useMemo, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, X, Eye, ChevronLeft, ChevronRight } from "lucide-react";

type InquiryStatus = "pending" | "processing" | "completed";

type Inquiry = {
  id: string;
  company: string;
  name: string;
  phone: string;
  email: string;
  budget: string;
  message: string;
  date: string;
  status: InquiryStatus;
};

const initialInquiries: Inquiry[] = [
  { id: "INQ-347", company: "삼성전자", name: "김영수", phone: "010-1234-5678", email: "kim@samsung.com", budget: "5,000만원 이상", message: "강남역 인근 대형 빌보드 3개월 캠페인 문의드립니다. 신제품 갤럭시 출시 관련 OOH 광고를 진행하려 합니다.", date: "2026-03-28", status: "pending" },
  { id: "INQ-346", company: "LG유플러스", name: "이미라", phone: "010-9876-5432", email: "lee@lguplus.co.kr", budget: "3,000~5,000만원", message: "전국 지하철역 디지털 사이니지 광고 견적 요청합니다. 5G 서비스 홍보 캠페인입니다.", date: "2026-03-27", status: "processing" },
  { id: "INQ-345", company: "현대자동차", name: "박진호", phone: "010-5555-1234", email: "park@hyundai.com", budget: "5,000만원 이상", message: "서울 주요 거점 빌보드 + 디지털 믹스 캠페인 제안 부탁드립니다.", date: "2026-03-26", status: "completed" },
  { id: "INQ-344", company: "카카오", name: "정수빈", phone: "010-3333-7890", email: "jung@kakao.com", budget: "1,000~3,000만원", message: "카카오T 프로모션 관련 버스 쉘터 광고를 알아보고 있습니다.", date: "2026-03-25", status: "pending" },
  { id: "INQ-343", company: "네이버", name: "최은지", phone: "010-2222-4567", email: "choi@naver.com", budget: "3,000~5,000만원", message: "네이버 쇼핑 시즌 캠페인으로 코엑스/IFC 디지털 사이니지 광고 문의합니다.", date: "2026-03-24", status: "processing" },
  { id: "INQ-342", company: "SK텔레콤", name: "한지원", phone: "010-7777-8888", email: "han@skt.com", budget: "5,000만원 이상", message: "AI 서비스 런칭 관련 명동/강남 전광판 광고 진행 문의", date: "2026-03-23", status: "completed" },
  { id: "INQ-341", company: "배달의민족", name: "오승현", phone: "010-4444-3333", email: "oh@woowa.com", budget: "1,000~3,000만원", message: "봄 시즌 프로모션 지하철 랩핑 광고 견적 요청", date: "2026-03-22", status: "pending" },
  { id: "INQ-340", company: "쿠팡", name: "서민지", phone: "010-6666-2222", email: "seo@coupang.com", budget: "3,000~5,000만원", message: "로켓배송 인지도 캠페인 전국 고속도로 빌보드 문의", date: "2026-03-21", status: "completed" },
  { id: "INQ-339", company: "토스", name: "임하늘", phone: "010-8888-1111", email: "lim@toss.im", budget: "1,000~3,000만원", message: "토스뱅크 홍보 잠실 롯데월드타워 빌보드 광고 문의합니다.", date: "2026-03-20", status: "processing" },
  { id: "INQ-338", company: "당근마켓", name: "윤서준", phone: "010-1111-9999", email: "yoon@daangn.com", budget: "1,000만원 이하", message: "당근마켓 지역 인지도 제고를 위한 버스 광고 문의", date: "2026-03-19", status: "pending" },
  { id: "INQ-337", company: "라인", name: "강예린", phone: "010-5050-6060", email: "kang@line.me", budget: "3,000~5,000만원", message: "라인 메신저 리브랜딩 캠페인 종합 OOH 제안 요청", date: "2026-03-18", status: "completed" },
  { id: "INQ-336", company: "무신사", name: "조태현", phone: "010-7070-8080", email: "cho@musinsa.com", budget: "1,000~3,000만원", message: "무신사 스탠다드 홍대입구역 지하철 광고 문의", date: "2026-03-17", status: "pending" },
];

const statusMap: Record<
  InquiryStatus,
  { label: string; className: string }
> = {
  pending: { label: "대기", className: "bg-amber-100 text-amber-700" },
  processing: { label: "처리중", className: "bg-blue-100 text-blue-700" },
  completed: { label: "완료", className: "bg-emerald-100 text-emerald-700" },
};

const statusOptions: { value: InquiryStatus | "all"; label: string }[] = [
  { value: "all", label: "전체" },
  { value: "pending", label: "대기" },
  { value: "processing", label: "처리중" },
  { value: "completed", label: "완료" },
];

const PAGE_SIZE = 8;

export default function AdminInquiriesPage() {
  const [inquiries, setInquiries] = useState(initialInquiries);
  const [statusFilter, setStatusFilter] = useState<InquiryStatus | "all">(
    "all"
  );
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<Inquiry | null>(null);
  const [page, setPage] = useState(1);

  const filtered = useMemo(() => {
    return inquiries.filter((inq) => {
      if (statusFilter !== "all" && inq.status !== statusFilter) return false;
      if (
        search &&
        !inq.company.toLowerCase().includes(search.toLowerCase()) &&
        !inq.name.toLowerCase().includes(search.toLowerCase())
      )
        return false;
      return true;
    });
  }, [inquiries, statusFilter, search]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paginated = filtered.slice(
    (page - 1) * PAGE_SIZE,
    page * PAGE_SIZE
  );

  const updateStatus = useCallback(
    (id: string, newStatus: InquiryStatus) => {
      setInquiries((prev) =>
        prev.map((inq) =>
          inq.id === id ? { ...inq, status: newStatus } : inq
        )
      );
      if (selected?.id === id) {
        setSelected((prev) => (prev ? { ...prev, status: newStatus } : null));
      }
    },
    [selected]
  );

  return (
    <>
      <div className="space-y-4">
        {/* Filters */}
        <Card>
          <CardContent className="flex flex-col gap-3 py-0 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex flex-wrap gap-1.5">
              {statusOptions.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => {
                    setStatusFilter(opt.value);
                    setPage(1);
                  }}
                  className={`rounded-full px-3.5 py-1.5 text-xs font-semibold transition-colors ${
                    statusFilter === opt.value
                      ? "bg-navy text-white"
                      : "bg-slate-100 text-muted-foreground hover:bg-slate-200"
                  }`}
                >
                  {opt.label}
                  {opt.value !== "all" && (
                    <span className="ml-1.5 inline-flex h-4 w-4 items-center justify-center rounded-full bg-white/20 text-[10px]">
                      {
                        inquiries.filter(
                          (i) => i.status === opt.value
                        ).length
                      }
                    </span>
                  )}
                </button>
              ))}
            </div>
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="회사명 또는 담당자 검색..."
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
                className="pl-9"
              />
            </div>
          </CardContent>
        </Card>

        {/* Table */}
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-slate-50 text-left text-xs font-medium text-muted-foreground">
                    <th className="px-4 py-3">ID</th>
                    <th className="px-4 py-3">회사명</th>
                    <th className="px-4 py-3">담당자</th>
                    <th className="px-4 py-3 hidden md:table-cell">연락처</th>
                    <th className="px-4 py-3">날짜</th>
                    <th className="px-4 py-3">상태</th>
                    <th className="px-4 py-3 text-center">상세</th>
                  </tr>
                </thead>
                <tbody>
                  {paginated.length === 0 ? (
                    <tr>
                      <td
                        colSpan={7}
                        className="px-4 py-12 text-center text-muted-foreground"
                      >
                        검색 결과가 없습니다.
                      </td>
                    </tr>
                  ) : (
                    paginated.map((inq) => (
                      <tr
                        key={inq.id}
                        className="border-b last:border-0 hover:bg-slate-50/80 transition-colors"
                      >
                        <td className="px-4 py-3 font-mono text-xs text-muted-foreground">
                          {inq.id}
                        </td>
                        <td className="px-4 py-3 font-medium text-navy">
                          {inq.company}
                        </td>
                        <td className="px-4 py-3 text-muted-foreground">
                          {inq.name}
                        </td>
                        <td className="px-4 py-3 text-muted-foreground hidden md:table-cell">
                          {inq.phone}
                        </td>
                        <td className="px-4 py-3 text-muted-foreground">
                          {inq.date}
                        </td>
                        <td className="px-4 py-3">
                          <select
                            value={inq.status}
                            onChange={(e) =>
                              updateStatus(
                                inq.id,
                                e.target.value as InquiryStatus
                              )
                            }
                            className={`rounded-full border-0 px-2.5 py-1 text-xs font-semibold ${statusMap[inq.status].className}`}
                          >
                            <option value="pending">대기</option>
                            <option value="processing">처리중</option>
                            <option value="completed">완료</option>
                          </select>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <Button
                            variant="ghost"
                            size="icon-xs"
                            onClick={() => setSelected(inq)}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between border-t px-4 py-3">
                <span className="text-xs text-muted-foreground">
                  총 {filtered.length}건 중 {(page - 1) * PAGE_SIZE + 1}–
                  {Math.min(page * PAGE_SIZE, filtered.length)}
                </span>
                <div className="flex gap-1">
                  <Button
                    variant="outline"
                    size="icon-xs"
                    disabled={page === 1}
                    onClick={() => setPage((p) => p - 1)}
                  >
                    <ChevronLeft className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    variant="outline"
                    size="icon-xs"
                    disabled={page === totalPages}
                    onClick={() => setPage((p) => p + 1)}
                  >
                    <ChevronRight className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Detail Modal */}
      {selected && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/40"
            onClick={() => setSelected(null)}
          />
          <Card className="relative z-10 w-full max-w-lg animate-fade-in-up">
            <CardHeader className="flex-row items-start justify-between">
              <div>
                <CardTitle className="text-lg text-navy">
                  문의 상세 정보
                </CardTitle>
                <p className="mt-1 text-xs text-muted-foreground">
                  {selected.id}
                </p>
              </div>
              <Button
                variant="ghost"
                size="icon-xs"
                onClick={() => setSelected(null)}
              >
                <X className="h-4 w-4" />
              </Button>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <Field label="회사명" value={selected.company} />
                <Field label="담당자" value={selected.name} />
                <Field label="연락처" value={selected.phone} />
                <Field label="이메일" value={selected.email} />
                <Field label="예산" value={selected.budget || "미선택"} />
                <Field label="접수일" value={selected.date} />
              </div>
              <div>
                <span className="text-xs font-medium text-muted-foreground">
                  문의 내용
                </span>
                <p className="mt-1 rounded-lg bg-slate-50 p-3 text-sm leading-relaxed text-navy">
                  {selected.message}
                </p>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-muted-foreground">
                  상태 변경
                </span>
                <select
                  value={selected.status}
                  onChange={(e) =>
                    updateStatus(
                      selected.id,
                      e.target.value as InquiryStatus
                    )
                  }
                  className={`rounded-full border-0 px-3 py-1.5 text-xs font-semibold ${statusMap[selected.status].className}`}
                >
                  <option value="pending">대기</option>
                  <option value="processing">처리중</option>
                  <option value="completed">완료</option>
                </select>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <span className="text-xs font-medium text-muted-foreground">
        {label}
      </span>
      <p className="mt-0.5 text-sm font-medium text-navy">{value}</p>
    </div>
  );
}
