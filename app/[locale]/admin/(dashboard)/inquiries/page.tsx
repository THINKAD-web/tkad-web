// app/[locale]/admin/(dashboard)/inquiries/page.tsx
// 설명: Admin 문의 관리 — 최근 문의 검색/필터/우선 확인 중심 UI

import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { MessageSquareText, Search, TriangleAlert } from "lucide-react";
import AdminInquiryListItem from "@/components/admin-inquiry-list-item";
import { getPrisma, isDatabaseConfigured } from "@/lib/prisma";
import {
  parseInquiryAdminStatusCode,
  parseStoredContactInquiryMessage,
  type InquiryAdminStatusCode,
} from "@/lib/contact-inquiry-labels";

export const dynamic = "force-dynamic";

type RawSearchParams = Record<string, string | string[] | undefined>;
type Props = { searchParams: Promise<RawSearchParams> };

type InquiryTypeCode = "media" | "campaign" | "quote" | "other" | "unknown";
type BudgetCode =
  | "under_10m"
  | "10m_50m"
  | "50m_100m"
  | "over_100m"
  | "unknown";
type FocusFilter =
  | "all"
  | "today"
  | "high-budget"
  | "has-email"
  | "missing-type";
type TypeFilter = "all" | InquiryTypeCode;
type StatusFilter = "all" | InquiryAdminStatusCode;
type ViewFilter = "active" | "trash";
const UNASSIGNED_FILTER = "__unassigned__";

type InquiryItem = {
  id: string;
  company: string;
  hasCompany: boolean;
  name: string;
  phone: string;
  email: string;
  hasEmail: boolean;
  inquiryTypeCode: InquiryTypeCode;
  inquiryTypeLabel: string;
  budgetCode: BudgetCode;
  budgetLabel: string;
  adminStatusCode: InquiryAdminStatusCode;
  adminAssignee: string;
  adminNote: string;
  isTrashed: boolean;
  messageBody: string;
  createdAt: Date;
  isHighBudget: boolean;
};

const TYPE_OPTIONS: Array<{ value: TypeFilter; label: string }> = [
  { value: "all", label: "전체" },
  { value: "quote", label: "견적 요청" },
  { value: "campaign", label: "캠페인 상담" },
  { value: "media", label: "매체 문의" },
  { value: "other", label: "기타" },
  { value: "unknown", label: "미분류" },
];

const FOCUS_OPTIONS: Array<{ value: FocusFilter; label: string }> = [
  { value: "all", label: "전체 보기" },
  { value: "today", label: "오늘 접수" },
  { value: "high-budget", label: "고예산 우선" },
  { value: "has-email", label: "이메일 있음" },
  { value: "missing-type", label: "유형 미분류" },
];

const STATUS_OPTIONS: Array<{ value: StatusFilter; label: string }> = [
  { value: "all", label: "전체 상태" },
  { value: "new", label: "미처리" },
  { value: "in_progress", label: "진행중" },
  { value: "done", label: "답변완료" },
];

function firstOf(value: string | string[] | undefined): string {
  return Array.isArray(value) ? value[0] ?? "" : value ?? "";
}

function normalizeText(value: string): string {
  return value.trim().toLowerCase();
}

function dateKeyInSeoul(value: Date): string {
  return new Intl.DateTimeFormat("sv-SE", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    timeZone: "Asia/Seoul",
  }).format(value);
}

function isTodayInSeoul(value: Date): boolean {
  return dateKeyInSeoul(value) === dateKeyInSeoul(new Date());
}

function formatDateTime(value: Date): string {
  return value.toLocaleString("ko-KR", {
    year: "2-digit",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Asia/Seoul",
  });
}

function getRecencyLabel(value: Date): string {
  const today = new Date(`${dateKeyInSeoul(new Date())}T00:00:00+09:00`);
  const target = new Date(`${dateKeyInSeoul(value)}T00:00:00+09:00`);
  const diffDays = Math.round(
    (today.getTime() - target.getTime()) / (1000 * 60 * 60 * 24),
  );

  if (diffDays <= 0) return "오늘";
  if (diffDays === 1) return "어제";
  if (diffDays < 7) return `${diffDays}일 전`;
  return `${Math.floor(diffDays / 7)}주 전`;
}

function getInquiryTypeLabel(code: InquiryTypeCode): string {
  switch (code) {
    case "media":
      return "매체 문의";
    case "campaign":
      return "캠페인 상담";
    case "quote":
      return "견적 요청";
    case "other":
      return "기타";
    default:
      return "미분류";
  }
}

function getBudgetLabel(code: BudgetCode): string {
  switch (code) {
    case "under_10m":
      return "1천만 이하";
    case "10m_50m":
      return "1천~5천만";
    case "50m_100m":
      return "5천만~1억";
    case "over_100m":
      return "1억 이상";
    default:
      return "예산 미입력";
  }
}

function resolveInquiryTypeCode(raw: string | null | undefined): InquiryTypeCode {
  const key = normalizeText(raw ?? "");
  if (!key) return "unknown";

  if (["media", "매체 문의", "media inquiry"].includes(key)) return "media";
  if (["campaign", "캠페인 상담", "campaign consultation"].includes(key)) {
    return "campaign";
  }
  if (["quote", "견적 요청", "quote request"].includes(key)) return "quote";
  if (["other", "기타"].includes(key)) return "other";
  return "unknown";
}

function resolveBudgetCode(raw: string | null | undefined): BudgetCode {
  const key = normalizeText(raw ?? "");
  if (!key) return "unknown";

  if (["under_10m", "1천만 이하", "under ₩10m"].includes(key)) {
    return "under_10m";
  }
  if (["10m_50m", "1천~5천만", "₩10m–50m"].includes(key)) return "10m_50m";
  if (["50m_100m", "5천만~1억", "₩50m–100m"].includes(key)) {
    return "50m_100m";
  }
  if (["over_100m", "1억 이상", "over ₩100m"].includes(key)) {
    return "over_100m";
  }
  return "unknown";
}

function isHighBudget(code: BudgetCode): boolean {
  return code === "50m_100m" || code === "over_100m";
}

function buildQuery(params: {
  q?: string;
  type?: TypeFilter;
  focus?: FocusFilter;
  status?: StatusFilter;
  assignee?: string;
  view?: ViewFilter;
  open?: string;
}): string {
  const query = new URLSearchParams();

  if (params.q?.trim()) query.set("q", params.q.trim());
  if (params.type && params.type !== "all") query.set("type", params.type);
  if (params.focus && params.focus !== "all") query.set("focus", params.focus);
  if (params.status && params.status !== "all") {
    query.set("status", params.status);
  }
  if (params.assignee?.trim()) {
    query.set("assignee", params.assignee.trim());
  }
  if (params.view && params.view !== "active") {
    query.set("view", params.view);
  }
  if (params.open?.trim()) {
    query.set("open", params.open.trim());
  }

  const value = query.toString();
  return value ? `?${value}` : "?";
}

function buildTelHref(phone: string): string {
  return `tel:${phone.replace(/[^\d+]/g, "")}`;
}

function buildMailHref(email: string, name: string): string {
  const subject = encodeURIComponent("[THINKAD] 문의 주신 내용에 답변드립니다");
  const body = encodeURIComponent(
    `안녕하세요 ${name}님,\n\n문의 주셔서 감사합니다.\n빠르게 확인 후 안내드리겠습니다.\n\n`,
  );
  return `mailto:${email}?subject=${subject}&body=${body}`;
}

function getPreviewText(message: string): string {
  const compact = message.replace(/\s+/g, " ").trim();
  if (compact.length <= 120) return compact;
  return `${compact.slice(0, 120)}...`;
}

function statusPriority(code: InquiryAdminStatusCode): number {
  switch (code) {
    case "new":
      return 0;
    case "in_progress":
      return 1;
    case "done":
      return 2;
  }
}

async function loadInquiryData(): Promise<{
  status: "ok" | "unavailable" | "error";
  items: InquiryItem[];
}> {
  if (!isDatabaseConfigured()) {
    return { status: "unavailable", items: [] };
  }

  const db = getPrisma();

  try {
    const rows = await db.contactInquiry.findMany({
      orderBy: { createdAt: "desc" },
      take: 200,
      select: {
        id: true,
        company: true,
        name: true,
        phone: true,
        email: true,
        inquiryType: true,
        budget: true,
        message: true,
        createdAt: true,
      },
    });

    return {
      status: "ok",
      items: rows.map((row) => {
        const meta = parseStoredContactInquiryMessage(row.message);
        const inquiryTypeCode = resolveInquiryTypeCode(
          row.inquiryType ?? meta.inquiryLabel,
        );
        const budgetCode = resolveBudgetCode(row.budget ?? meta.budgetLabel);
        const adminStatusCode =
          parseInquiryAdminStatusCode(meta.adminStatusLabel) ?? "new";
        const company = row.company.trim();
        const email = row.email?.trim() ?? "";
        const messageBody = meta.body || row.message.trim();

        return {
          id: row.id,
          company,
          hasCompany: company !== "",
          name: row.name.trim(),
          phone: row.phone.trim(),
          email,
          hasEmail: email !== "",
          inquiryTypeCode,
          inquiryTypeLabel: getInquiryTypeLabel(inquiryTypeCode),
          budgetCode,
          budgetLabel: getBudgetLabel(budgetCode),
          adminStatusCode,
          adminAssignee: meta.adminAssignee,
          adminNote: meta.adminNote,
          isTrashed: meta.adminTrashed,
          messageBody,
          createdAt: row.createdAt,
          isHighBudget: isHighBudget(budgetCode),
        };
      }),
    };
  } catch {
    return { status: "error", items: [] };
  }
}

export default async function AdminInquiriesPage({ searchParams }: Props) {
  const rawParams = await searchParams;
  const q = firstOf(rawParams.q).trim();
  const openItemId = firstOf(rawParams.open).trim();
  const selectedAssignee = firstOf(rawParams.assignee).trim();
  const selectedView = firstOf(rawParams.view) === "trash" ? "trash" : "active";
  const selectedType = (
    TYPE_OPTIONS.some((option) => option.value === firstOf(rawParams.type))
      ? firstOf(rawParams.type)
      : "all"
  ) as TypeFilter;
  const selectedFocus = (
    FOCUS_OPTIONS.some((option) => option.value === firstOf(rawParams.focus))
      ? firstOf(rawParams.focus)
      : "all"
  ) as FocusFilter;
  const selectedStatus = (
    STATUS_OPTIONS.some((option) => option.value === firstOf(rawParams.status))
      ? firstOf(rawParams.status)
      : "all"
  ) as StatusFilter;

  const data = await loadInquiryData();
  const allItems = data.items;
  const queryNeedle = normalizeText(q);
  const viewScopedItems = allItems.filter((item) =>
    selectedView === "trash" ? item.isTrashed : !item.isTrashed,
  );
  const assigneeOptions = Array.from(
    new Set(
      viewScopedItems
        .map((item) => item.adminAssignee.trim())
        .filter((assignee) => assignee !== ""),
    ),
  ).sort((a, b) => a.localeCompare(b, "ko"));

  const items = allItems.filter((item) => {
    if (selectedType !== "all" && item.inquiryTypeCode !== selectedType) {
      return false;
    }
    if (selectedStatus !== "all" && item.adminStatusCode !== selectedStatus) {
      return false;
    }
    if (selectedView === "active" && item.isTrashed) {
      return false;
    }
    if (selectedView === "trash" && !item.isTrashed) {
      return false;
    }
    if (
      selectedAssignee === UNASSIGNED_FILTER &&
      item.adminAssignee.trim() !== ""
    ) {
      return false;
    }
    if (
      selectedAssignee !== "" &&
      selectedAssignee !== UNASSIGNED_FILTER &&
      item.adminAssignee.trim() !== selectedAssignee
    ) {
      return false;
    }

    if (selectedFocus === "today" && !isTodayInSeoul(item.createdAt)) return false;
    if (selectedFocus === "high-budget" && !item.isHighBudget) return false;
    if (selectedFocus === "has-email" && !item.hasEmail) return false;
    if (selectedFocus === "missing-type" && item.inquiryTypeCode !== "unknown") {
      return false;
    }

    if (!queryNeedle) return true;

    const haystack = normalizeText(
      [
        item.company,
        item.name,
        item.phone,
        item.email,
        item.inquiryTypeLabel,
        item.budgetLabel,
        item.adminAssignee,
        item.adminNote,
        item.messageBody,
      ].join(" "),
    );

    return haystack.includes(queryNeedle);
  }).sort((a, b) => {
    const statusGap = statusPriority(a.adminStatusCode) - statusPriority(b.adminStatusCode);
    if (statusGap !== 0) return statusGap;
    return b.createdAt.getTime() - a.createdAt.getTime();
  });

  const stats = {
    total: items.length,
    new: items.filter((item) => item.adminStatusCode === "new").length,
    inProgress: items.filter((item) => item.adminStatusCode === "in_progress")
      .length,
    done: items.filter((item) => item.adminStatusCode === "done").length,
    active: allItems.filter((item) => !item.isTrashed).length,
    trash: allItems.filter((item) => item.isTrashed).length,
  };

  const hasActiveFilter =
    q !== "" ||
    selectedAssignee !== "" ||
    selectedView !== "active" ||
    selectedType !== "all" ||
    selectedFocus !== "all" ||
    selectedStatus !== "all";

  const newItems = items.filter((item) => item.adminStatusCode === "new");
  const inProgressItems = items.filter(
    (item) => item.adminStatusCode === "in_progress",
  );
  const doneItems = items.filter((item) => item.adminStatusCode === "done");

  const renderInquiryList = (list: InquiryItem[]) => (
    <ul className="space-y-2">
      {list.map((item) => (
        <AdminInquiryListItem
          key={item.id}
          initiallyOpen={item.id === openItemId}
          item={{
            id: item.id,
            company: item.company,
            hasCompany: item.hasCompany,
            name: item.name,
            phone: item.phone,
            phoneHref: buildTelHref(item.phone),
            email: item.email,
            emailHref: buildMailHref(item.email, item.name),
            hasEmail: item.hasEmail,
            inquiryTypeCode: item.inquiryTypeCode,
            inquiryTypeLabel: item.inquiryTypeLabel,
            budgetLabel: item.budgetLabel,
            adminStatusCode: item.adminStatusCode,
            adminAssignee: item.adminAssignee,
            adminNote: item.adminNote,
            isTrashed: item.isTrashed,
            messageBody: item.messageBody,
            previewText: getPreviewText(item.messageBody),
            createdAtLabel: formatDateTime(item.createdAt),
            recencyLabel: getRecencyLabel(item.createdAt),
            isHighBudget: item.isHighBudget,
          }}
        />
      ))}
    </ul>
  );

  return (
    <div className="space-y-6 text-foreground">
      <header className="space-y-2">
        <p className="font-mono text-[10px] font-bold uppercase tracking-[0.22em] text-muted-foreground">
          [ INQUIRIES ]
        </p>
        <h1 className="text-xl font-bold tracking-tight">문의 관리</h1>
        <p className="font-mono text-[11px] tracking-tight text-muted-foreground">
          {`// `}최근 200건 기준으로 빠르게 검색하고, 고예산/오늘 접수 문의를 우선 확인할 수 있습니다.
        </p>
      </header>

      {data.status === "unavailable" ? (
        <Card className="border-2 border-border bg-card">
          <CardContent className="py-12 text-center">
            <TriangleAlert className="mx-auto mb-3 h-10 w-10 text-muted-foreground" />
            <p className="text-sm font-bold">DB 연결이 필요합니다</p>
            <p className="mt-1 font-mono text-[11px] tracking-tight text-muted-foreground">
              {`// `}문의 데이터베이스가 설정되면 최근 문의가 이 화면에 표시됩니다.
            </p>
          </CardContent>
        </Card>
      ) : data.status === "error" ? (
        <Card className="border-2 border-border bg-card">
          <CardContent className="py-12 text-center">
            <TriangleAlert className="mx-auto mb-3 h-10 w-10 text-destructive" />
            <p className="text-sm font-bold">문의 목록을 불러오지 못했습니다</p>
            <p className="mt-1 font-mono text-[11px] tracking-tight text-muted-foreground">
              {`// `}잠시 후 다시 시도하거나 DB 상태를 확인해 주세요.
            </p>
          </CardContent>
        </Card>
      ) : (
        <>
          <section className="grid grid-cols-2 gap-3 xl:grid-cols-4">
            {[
              { label: "현재 보기", value: `${stats.total}건` },
              { label: "미처리", value: `${stats.new}건` },
              { label: "진행중", value: `${stats.inProgress}건` },
              { label: "답변완료", value: `${stats.done}건` },
            ].map((stat) => (
              <div key={stat.label} className="border-2 border-border bg-card p-4">
                <p className="font-mono text-[10px] font-bold uppercase tracking-[0.22em] text-muted-foreground">
                  [ {stat.label} ]
                </p>
                <p className="mt-2 text-2xl font-bold tabular-nums">{stat.value}</p>
              </div>
            ))}
          </section>

          <section className="space-y-4 border-2 border-border bg-card p-4">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <form method="get" className="flex flex-1 flex-col gap-2 sm:flex-row">
                {selectedType !== "all" ? (
                  <input type="hidden" name="type" value={selectedType} />
                ) : null}
                {selectedFocus !== "all" ? (
                  <input type="hidden" name="focus" value={selectedFocus} />
                ) : null}
                {selectedStatus !== "all" ? (
                  <input type="hidden" name="status" value={selectedStatus} />
                ) : null}
                {selectedAssignee !== "" ? (
                  <input type="hidden" name="assignee" value={selectedAssignee} />
                ) : null}
                {selectedView !== "active" ? (
                  <input type="hidden" name="view" value={selectedView} />
                ) : null}
                <div className="relative flex-1">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <input
                    type="search"
                    name="q"
                    defaultValue={q}
                    placeholder="회사명, 담당자, 전화번호, 문의 내용을 검색"
                    className="h-11 w-full border-2 border-border bg-background pl-10 pr-3 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none"
                  />
                </div>
                <button
                  type="submit"
                  className="inline-flex h-11 items-center justify-center border-2 border-border bg-foreground px-4 font-mono text-[11px] font-bold uppercase tracking-[0.18em] text-background transition-colors hover:bg-primary hover:border-primary hover:text-primary-foreground"
                >
                  검색 적용
                </button>
              </form>
              <Link
                href={buildQuery({ view: selectedView })}
                className="inline-flex h-11 items-center justify-center border-2 border-border px-4 font-mono text-[11px] font-bold uppercase tracking-[0.18em] text-foreground transition-colors hover:bg-muted/50"
              >
                필터 초기화
              </Link>
            </div>

            <div className="space-y-2">
              <p className="font-mono text-[10px] font-bold uppercase tracking-[0.22em] text-muted-foreground">
                [ 보기 ]
              </p>
              <div className="flex flex-wrap gap-2">
                {[
                  { value: "active" as ViewFilter, label: "활성 문의", count: stats.active },
                  { value: "trash" as ViewFilter, label: "휴지통", count: stats.trash },
                ].map((option) => (
                  <Link
                    key={option.value}
                    href={buildQuery({
                      q,
                      type: selectedType,
                      focus: selectedFocus,
                      status: selectedStatus,
                      assignee: selectedAssignee,
                      view: option.value,
                    })}
                    className={[
                      "inline-flex items-center gap-2 border-2 px-3 py-2 font-mono text-[11px] font-bold uppercase tracking-[0.18em] transition-colors",
                      selectedView === option.value
                        ? "border-primary bg-primary text-primary-foreground"
                        : "border-border bg-background text-foreground hover:bg-muted/50",
                    ].join(" ")}
                  >
                    <span>{option.label}</span>
                    <span className="tabular-nums opacity-80">{option.count}</span>
                  </Link>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <p className="font-mono text-[10px] font-bold uppercase tracking-[0.22em] text-muted-foreground">
                [ 문의 유형 ]
              </p>
              <div className="flex flex-wrap gap-2">
                {TYPE_OPTIONS.map((option) => {
                  const count =
                    option.value === "all"
                      ? viewScopedItems.length
                      : viewScopedItems.filter(
                          (item) => item.inquiryTypeCode === option.value,
                        ).length;
                  const active = selectedType === option.value;

                  return (
                    <Link
                      key={option.value}
                      href={buildQuery({
                        q,
                        type: option.value,
                        focus: selectedFocus,
                        status: selectedStatus,
                        assignee: selectedAssignee,
                        view: selectedView,
                      })}
                      className={[
                        "inline-flex items-center gap-2 border-2 px-3 py-2 font-mono text-[11px] font-bold uppercase tracking-[0.18em] transition-colors",
                        active
                          ? "border-primary bg-primary text-primary-foreground"
                          : "border-border bg-background text-foreground hover:bg-muted/50",
                      ].join(" ")}
                    >
                      <span>{option.label}</span>
                      <span className="tabular-nums opacity-80">{count}</span>
                    </Link>
                  );
                })}
              </div>
            </div>

            <div className="space-y-2">
              <p className="font-mono text-[10px] font-bold uppercase tracking-[0.22em] text-muted-foreground">
                [ 처리 상태 ]
              </p>
              <div className="flex flex-wrap gap-2">
                {STATUS_OPTIONS.map((option) => {
                  const count =
                    option.value === "all"
                      ? viewScopedItems.length
                      : viewScopedItems.filter(
                          (item) => item.adminStatusCode === option.value,
                        ).length;
                  const active = selectedStatus === option.value;

                  return (
                    <Link
                      key={option.value}
                      href={buildQuery({
                        q,
                        type: selectedType,
                        focus: selectedFocus,
                        status: option.value,
                        assignee: selectedAssignee,
                        view: selectedView,
                      })}
                      className={[
                        "inline-flex items-center gap-2 border-2 px-3 py-2 font-mono text-[11px] font-bold uppercase tracking-[0.18em] transition-colors",
                        active
                          ? "border-primary bg-primary text-primary-foreground"
                          : "border-border bg-background text-foreground hover:bg-muted/50",
                      ].join(" ")}
                    >
                      <span>{option.label}</span>
                      <span className="tabular-nums opacity-80">{count}</span>
                    </Link>
                  );
                })}
              </div>
            </div>

            <div className="space-y-2">
              <p className="font-mono text-[10px] font-bold uppercase tracking-[0.22em] text-muted-foreground">
                [ 담당자 ]
              </p>
              <div className="flex flex-wrap gap-2">
                <Link
                  href={buildQuery({
                    q,
                    type: selectedType,
                    focus: selectedFocus,
                    status: selectedStatus,
                    view: selectedView,
                  })}
                  className={[
                    "inline-flex items-center gap-2 border-2 px-3 py-2 font-mono text-[11px] font-bold uppercase tracking-[0.18em] transition-colors",
                    selectedAssignee === ""
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-border bg-background text-foreground hover:bg-muted/50",
                  ].join(" ")}
                >
                  <span>전체 담당</span>
                  <span className="tabular-nums opacity-80">{viewScopedItems.length}</span>
                </Link>

                <Link
                  href={buildQuery({
                    q,
                    type: selectedType,
                    focus: selectedFocus,
                    status: selectedStatus,
                    assignee: UNASSIGNED_FILTER,
                    view: selectedView,
                  })}
                  className={[
                    "inline-flex items-center gap-2 border-2 px-3 py-2 font-mono text-[11px] font-bold uppercase tracking-[0.18em] transition-colors",
                    selectedAssignee === UNASSIGNED_FILTER
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-border bg-background text-foreground hover:bg-muted/50",
                  ].join(" ")}
                >
                  <span>미지정</span>
                  <span className="tabular-nums opacity-80">
                    {
                      allItems.filter((item) => item.adminAssignee.trim() === "")
                        .filter((item) =>
                          selectedView === "trash" ? item.isTrashed : !item.isTrashed,
                        )
                        .length
                    }
                  </span>
                </Link>

                {assigneeOptions.map((assignee) => (
                  <Link
                    key={assignee}
                    href={buildQuery({
                      q,
                      type: selectedType,
                      focus: selectedFocus,
                      status: selectedStatus,
                      assignee,
                      view: selectedView,
                    })}
                    className={[
                      "inline-flex items-center gap-2 border-2 px-3 py-2 font-mono text-[11px] font-bold uppercase tracking-[0.18em] transition-colors",
                      selectedAssignee === assignee
                        ? "border-primary bg-primary text-primary-foreground"
                        : "border-border bg-background text-foreground hover:bg-muted/50",
                    ].join(" ")}
                  >
                    <span>{assignee}</span>
                    <span className="tabular-nums opacity-80">
                      {
                        allItems.filter(
                          (item) => item.adminAssignee.trim() === assignee,
                        ).filter((item) =>
                          selectedView === "trash" ? item.isTrashed : !item.isTrashed,
                        ).length
                      }
                    </span>
                  </Link>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <p className="font-mono text-[10px] font-bold uppercase tracking-[0.22em] text-muted-foreground">
                [ 우선 보기 ]
              </p>
              <div className="flex flex-wrap gap-2">
                {FOCUS_OPTIONS.map((option) => {
                  const active = selectedFocus === option.value;

                  return (
                    <Link
                      key={option.value}
                      href={buildQuery({
                        q,
                        type: selectedType,
                        focus: option.value,
                        status: selectedStatus,
                        assignee: selectedAssignee,
                        view: selectedView,
                      })}
                      className={[
                        "inline-flex items-center gap-2 border-2 px-3 py-2 font-mono text-[11px] font-bold uppercase tracking-[0.18em] transition-colors",
                        active
                          ? "border-primary bg-primary text-primary-foreground"
                          : "border-border bg-background text-foreground hover:bg-muted/50",
                      ].join(" ")}
                    >
                      {option.label}
                    </Link>
                  );
                })}
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 font-mono text-[11px] tracking-tight text-muted-foreground">
              <span>{`// `}최근 200건 중 {items.length}건 표시</span>
              {hasActiveFilter ? (
                <span className="text-primary">필터 적용 중</span>
              ) : (
                <span>전체 보기</span>
              )}
            </div>
          </section>

          {items.length === 0 ? (
            <Card className="border-2 border-border bg-card">
              <CardContent className="py-12 text-center">
                <MessageSquareText className="mx-auto mb-3 h-10 w-10 text-muted-foreground" />
                <p className="text-sm font-bold">조건에 맞는 문의가 없습니다</p>
                <p className="mt-1 font-mono text-[11px] tracking-tight text-muted-foreground">
                  {`// `}검색어 또는 필터를 조정하면 다른 문의를 확인할 수 있습니다.
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-6">
              {selectedView === "trash" ? (
                <section className="space-y-2">
                  <div className="flex items-center justify-between gap-3">
                    <h2 className="font-mono text-[11px] font-bold uppercase tracking-[0.22em] text-muted-foreground">
                      [ 휴지통 ]
                    </h2>
                    <span className="font-mono text-[11px] tabular-nums text-muted-foreground">
                      {items.length}건
                    </span>
                  </div>
                  {renderInquiryList(items)}
                </section>
              ) : null}

              {selectedView === "active" && newItems.length > 0 ? (
                <section className="space-y-2">
                  <div className="flex items-center justify-between gap-3">
                    <h2 className="font-mono text-[11px] font-bold uppercase tracking-[0.22em] text-rose-700">
                      [ 미처리 우선 ]
                    </h2>
                    <span className="font-mono text-[11px] tabular-nums text-muted-foreground">
                      {newItems.length}건
                    </span>
                  </div>
                  {renderInquiryList(newItems)}
                </section>
              ) : null}

              {selectedView === "active" && inProgressItems.length > 0 ? (
                <section className="space-y-2">
                  <div className="flex items-center justify-between gap-3">
                    <h2 className="font-mono text-[11px] font-bold uppercase tracking-[0.22em] text-amber-700">
                      [ 진행중 ]
                    </h2>
                    <span className="font-mono text-[11px] tabular-nums text-muted-foreground">
                      {inProgressItems.length}건
                    </span>
                  </div>
                  {renderInquiryList(inProgressItems)}
                </section>
              ) : null}

              {selectedView === "active" && doneItems.length > 0 ? (
                <details
                  className="space-y-2"
                  open={
                    selectedStatus === "done" ||
                    doneItems.some((item) => item.id === openItemId)
                  }
                >
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-3">
                    <h2 className="font-mono text-[11px] font-bold uppercase tracking-[0.22em] text-emerald-700">
                      [ 답변완료 ]
                    </h2>
                    <span className="font-mono text-[11px] tabular-nums text-muted-foreground">
                      {doneItems.length}건
                    </span>
                  </summary>
                  <div className="pt-2">{renderInquiryList(doneItems)}</div>
                </details>
              ) : null}
            </div>
          )}
        </>
      )}
    </div>
  );
}
