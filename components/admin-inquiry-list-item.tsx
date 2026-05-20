"use client";

import { useEffect, useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import {
  ArrowUpRight,
  Building2,
  ChevronDown,
  Clock3,
  FileText,
  Mail,
  Phone,
  Send,
  Trash2,
  UserRound,
} from "lucide-react";
import { Link } from "@/i18n/navigation";
import AdminInquiryStatusControls from "@/components/admin-inquiry-status-controls";
import type { InquiryAdminStatusCode } from "@/lib/contact-inquiry-labels";

export type AdminInquiryListItemData = {
  id: string;
  company: string;
  hasCompany: boolean;
  name: string;
  phone: string;
  phoneHref: string;
  email: string;
  emailHref: string;
  hasEmail: boolean;
  inquiryTypeCode: "media" | "campaign" | "quote" | "other" | "unknown";
  inquiryTypeLabel: string;
  budgetLabel: string;
  adminStatusCode: InquiryAdminStatusCode;
  adminAssignee: string;
  adminNote: string;
  isTrashed: boolean;
  messageBody: string;
  previewText: string;
  createdAtLabel: string;
  recencyLabel: string;
  isHighBudget: boolean;
  oohQuoteId?: string | null;
  oohQuoteStatus?: string | null;
  oohQuoteAmount?: number | null;
};

type Props = {
  item: AdminInquiryListItemData;
  initiallyOpen?: boolean;
};

const STATUS_LABELS: Record<InquiryAdminStatusCode, string> = {
  new: "미처리",
  in_progress: "진행중",
  done: "답변완료",
};

function typeBadgeClass(
  code: AdminInquiryListItemData["inquiryTypeCode"],
): string {
  switch (code) {
    case "quote":
      return "border-emerald-200 bg-emerald-50 text-emerald-700";
    case "campaign":
      return "border-violet-200 bg-violet-50 text-violet-700";
    case "media":
      return "border-sky-200 bg-sky-50 text-sky-700";
    case "other":
      return "border-slate-200 bg-slate-100 text-slate-700";
    default:
      return "border-amber-200 bg-amber-50 text-amber-700";
  }
}

function statusBadgeClass(code: InquiryAdminStatusCode): string {
  switch (code) {
    case "new":
      return "border-rose-200 bg-rose-50 text-rose-700";
    case "in_progress":
      return "border-amber-200 bg-amber-50 text-amber-700";
    case "done":
      return "border-emerald-200 bg-emerald-50 text-emerald-700";
  }
}

export default function AdminInquiryListItem({
  item,
  initiallyOpen = false,
}: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [open, setOpen] = useState(initiallyOpen);
  const [adminStatusCode, setAdminStatusCode] = useState(item.adminStatusCode);
  const [adminAssignee, setAdminAssignee] = useState(item.adminAssignee);
  const [adminNote, setAdminNote] = useState(item.adminNote);
  const [actionBusy, setActionBusy] = useState(false);
  const [actionError, setActionError] = useState("");
  const [confirmTrashOpen, setConfirmTrashOpen] = useState(false);
  const [quoteSendBusy, setQuoteSendBusy] = useState(false);

  useEffect(() => {
    setOpen(initiallyOpen);
  }, [initiallyOpen]);

  const title = item.hasCompany ? item.company : item.name;
  const metaLine = useMemo(
    () =>
      [item.hasCompany ? item.name : null, `#${item.id.slice(-6)}`, item.createdAtLabel, item.recencyLabel]
        .filter(Boolean)
        .join(" · "),
    [item.createdAtLabel, item.hasCompany, item.id, item.name, item.recencyLabel],
  );

  const toggleOpen = (nextOpen: boolean) => {
    setOpen(nextOpen);

    if (!pathname) return;

    const sp = new URLSearchParams(searchParams.toString());
    if (nextOpen) sp.set("open", item.id);
    else if (sp.get("open") === item.id) sp.delete("open");
    const q = sp.toString();
    router.replace(q ? `${pathname}?${q}` : pathname, { scroll: false });
  };

  const clearOpenQuery = () => {
    const sp = new URLSearchParams(searchParams.toString());
    if (sp.get("open") === item.id) sp.delete("open");
    const q = sp.toString();
    if (pathname) {
      router.replace(q ? `${pathname}?${q}` : pathname, { scroll: false });
    }
  };

  const handleMoveToTrash = async () => {
    if (actionBusy) return;

    setActionBusy(true);
    setActionError("");

    try {
      const res = await fetch(`/api/admin/inquiries/${item.id}`, {
        method: "DELETE",
      });
      const data = (await res.json()) as { ok?: boolean };
      if (!res.ok || !data.ok) {
        setActionError("문의를 휴지통으로 이동하지 못했습니다.");
        return;
      }

      clearOpenQuery();
      router.refresh();
    } catch {
      setActionError("네트워크 오류가 발생했습니다.");
    } finally {
      setActionBusy(false);
      setConfirmTrashOpen(false);
    }
  };

  const handleRestore = async () => {
    if (actionBusy) return;

    setActionBusy(true);
    setActionError("");

    try {
      const res = await fetch(`/api/admin/inquiries/${item.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ trashed: false }),
      });
      const data = (await res.json()) as { ok?: boolean };
      if (!res.ok || !data.ok) {
        setActionError("문의를 복구하지 못했습니다.");
        return;
      }

      clearOpenQuery();
      router.refresh();
    } catch {
      setActionError("네트워크 오류가 발생했습니다.");
    } finally {
      setActionBusy(false);
    }
  };

  return (
    <li className="border-2 border-border bg-card">
      <button
        type="button"
        onClick={() => toggleOpen(!open)}
        className="w-full px-4 py-3 text-left transition-colors hover:bg-muted/40"
      >
        <div className="flex items-start gap-3">
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-sm font-bold">{title}</h2>
              {item.isHighBudget ? (
                <Badge className="border border-rose-200 bg-rose-50 text-[10px] font-mono font-bold uppercase tracking-[0.18em] text-rose-700">
                  우선 검토
                </Badge>
              ) : null}
              {!item.hasCompany ? (
                <Badge
                  variant="outline"
                  className="border border-amber-200 bg-amber-50 text-[10px] font-mono font-bold uppercase tracking-[0.18em] text-amber-700"
                >
                  회사 미입력
                </Badge>
              ) : null}
              {adminAssignee ? (
                <Badge
                  variant="outline"
                  className="border border-border bg-background text-[10px] font-mono font-bold uppercase tracking-[0.18em] text-foreground"
                >
                  담당 {adminAssignee}
                </Badge>
              ) : null}
              {item.isTrashed ? (
                <Badge className="border border-slate-300 bg-slate-100 text-[10px] font-mono font-bold uppercase tracking-[0.18em] text-slate-700">
                  휴지통
                </Badge>
              ) : null}
            </div>

            <p className="mt-1 font-mono text-[11px] tracking-tight text-muted-foreground">
              {metaLine}
            </p>
            <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
              {item.previewText}
            </p>
          </div>

          <div className="flex shrink-0 flex-col items-end gap-2">
            <div className="flex flex-wrap justify-end gap-2">
              <Badge
                variant="outline"
                className={`border text-[10px] font-mono font-bold uppercase tracking-[0.18em] ${statusBadgeClass(adminStatusCode)}`}
              >
                {STATUS_LABELS[adminStatusCode]}
              </Badge>
              <Badge
                variant="outline"
                className={`border text-[10px] font-mono font-bold uppercase tracking-[0.18em] ${typeBadgeClass(item.inquiryTypeCode)}`}
              >
                {item.inquiryTypeLabel}
              </Badge>
            </div>
            <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
              <span>{open ? "접기" : "열기"}</span>
              <ChevronDown
                className={`h-4 w-4 transition-transform ${open ? "rotate-180" : ""}`}
              />
            </div>
          </div>
        </div>
      </button>

      {open ? (
        <div className="grid gap-4 border-t-2 border-border px-4 py-4 xl:grid-cols-[320px,minmax(0,1fr)]">
          <div className="space-y-4">
            <AdminInquiryStatusControls
              inquiryId={item.id}
              status={adminStatusCode}
              assignee={adminAssignee}
              note={adminNote}
              onSaved={(meta) => {
                setAdminStatusCode(meta.status);
                setAdminAssignee(meta.assignee);
                setAdminNote(meta.note);
              }}
            />

            {item.oohQuoteId ? (
              <div className="rounded-lg border border-emerald-200 bg-emerald-50/80 p-3">
                <p className="font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-emerald-800">
                  [ 자동 견적 초안 ]
                </p>
                <p className="mt-1 text-xs text-emerald-900">
                  상태: {item.oohQuoteStatus ?? "draft"}
                  {item.oohQuoteAmount != null
                    ? ` · ₩${item.oohQuoteAmount.toLocaleString("ko-KR")}만`
                    : ""}
                </p>
                <div className="mt-2 flex flex-wrap gap-2">
                  <Link
                    href={`/admin/quotes?tab=booking&highlight=${item.oohQuoteId}`}
                    className="inline-flex items-center gap-1 rounded-md border border-emerald-300 bg-white px-2 py-1 text-xs font-medium text-emerald-900 hover:bg-emerald-50"
                  >
                    <FileText className="h-3 w-3" />
                    부킹 견적 관리
                  </Link>
                  <Link
                    href={`/quote/${item.oohQuoteId}/preview`}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 rounded-md border border-emerald-300 bg-white px-2 py-1 text-xs font-medium text-emerald-900 hover:bg-emerald-50"
                  >
                    <ArrowUpRight className="h-3 w-3" />
                    미리보기
                  </Link>
                  {(item.oohQuoteStatus === "draft" ||
                    item.oohQuoteStatus === "sent") && (
                    <button
                      type="button"
                      disabled={quoteSendBusy}
                      className="inline-flex items-center gap-1 rounded-md bg-hermes px-2 py-1 text-xs font-bold text-white hover:bg-hermes/90 disabled:opacity-50"
                      onClick={() => {
                        void (async () => {
                          setQuoteSendBusy(true);
                          try {
                            const res = await fetch(
                              `/api/admin/ooh-quotes/${item.oohQuoteId}/send-quote`,
                              {
                                method: "POST",
                                credentials: "include",
                              },
                            );
                            if (!res.ok) throw new Error("send_failed");
                            router.refresh();
                          } catch {
                            setActionError("견적 발송에 실패했습니다.");
                          } finally {
                            setQuoteSendBusy(false);
                          }
                        })();
                      }}
                    >
                      <Send className="h-3 w-3" />
                      {item.oohQuoteStatus === "draft"
                        ? "검토 완료 → 발송"
                        : "재발송"}
                    </button>
                  )}
                </div>
              </div>
            ) : null}

            <div className="space-y-1">
              <p className="font-mono text-[10px] font-bold uppercase tracking-[0.22em] text-muted-foreground">
                [ 연락 정보 ]
              </p>
              <div className="space-y-1.5 text-sm">
                <a
                  href={item.phoneHref}
                  className="flex items-center gap-2 font-medium text-foreground transition-colors hover:text-primary"
                >
                  <Phone className="h-4 w-4 text-muted-foreground" />
                  {item.phone}
                </a>
                {item.hasEmail ? (
                  <a
                    href={item.emailHref}
                    className="flex items-center gap-2 font-medium text-foreground transition-colors hover:text-primary"
                  >
                    <Mail className="h-4 w-4 text-muted-foreground" />
                    {item.email}
                  </a>
                ) : (
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Mail className="h-4 w-4" />
                    이메일 미입력
                  </div>
                )}
                <div className="flex items-center gap-2 text-muted-foreground">
                  <UserRound className="h-4 w-4" />
                  {adminAssignee || "담당자 미지정"}
                </div>
              </div>
            </div>

            <div className="space-y-1">
              <p className="font-mono text-[10px] font-bold uppercase tracking-[0.22em] text-muted-foreground">
                [ 빠른 액션 ]
              </p>
              <div className="flex flex-wrap gap-2">
                <a
                  href={item.phoneHref}
                  className="inline-flex items-center gap-1 border-2 border-border px-3 py-2 font-mono text-[11px] font-bold uppercase tracking-[0.18em] text-foreground transition-colors hover:bg-muted/50"
                >
                  전화
                  <ArrowUpRight className="h-3.5 w-3.5" />
                </a>
                {item.hasEmail ? (
                  <a
                    href={item.emailHref}
                    className="inline-flex items-center gap-1 border-2 border-border px-3 py-2 font-mono text-[11px] font-bold uppercase tracking-[0.18em] text-foreground transition-colors hover:bg-muted/50"
                  >
                    메일 답장
                    <ArrowUpRight className="h-3.5 w-3.5" />
                  </a>
                ) : null}
                {item.isTrashed ? (
                  <button
                    type="button"
                    onClick={handleRestore}
                    disabled={actionBusy}
                    className="inline-flex items-center gap-1 border-2 border-emerald-200 bg-emerald-50 px-3 py-2 font-mono text-[11px] font-bold uppercase tracking-[0.18em] text-emerald-700 transition-colors hover:bg-emerald-100 disabled:cursor-not-allowed disabled:opacity-70"
                  >
                    {actionBusy ? "복구 중..." : "복구"}
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => setConfirmTrashOpen(true)}
                    disabled={actionBusy}
                    className="inline-flex items-center gap-1 border-2 border-rose-200 bg-rose-50 px-3 py-2 font-mono text-[11px] font-bold uppercase tracking-[0.18em] text-rose-700 transition-colors hover:bg-rose-100 disabled:cursor-not-allowed disabled:opacity-70"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    휴지통 이동
                  </button>
                )}
              </div>
              {actionError ? (
                <p className="font-mono text-[10px] tracking-tight text-destructive">
                  {`// `}
                  {actionError}
                </p>
              ) : null}
            </div>
          </div>

          <div className="space-y-3">
            <div className="space-y-2">
              <p className="font-mono text-[10px] font-bold uppercase tracking-[0.22em] text-muted-foreground">
                [ 문의 내용 ]
              </p>
              <div className="border-2 border-border bg-background p-4 text-sm leading-relaxed text-foreground">
                <p className="whitespace-pre-wrap">{item.messageBody}</p>
              </div>
            </div>

            {adminNote ? (
              <div className="space-y-2">
                <p className="font-mono text-[10px] font-bold uppercase tracking-[0.22em] text-muted-foreground">
                  [ 관리 메모 미리보기 ]
                </p>
                <div className="border-2 border-border bg-background p-4 text-sm leading-relaxed text-foreground">
                  <p className="whitespace-pre-wrap">{adminNote}</p>
                </div>
              </div>
            ) : null}

            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 font-mono text-[11px] tracking-tight text-muted-foreground">
              <span className="inline-flex items-center gap-1">
                <Clock3 className="h-3.5 w-3.5" />
                {item.createdAtLabel}
              </span>
              <span className="inline-flex items-center gap-1">
                <Building2 className="h-3.5 w-3.5" />
                {item.hasCompany ? item.company : "회사명 없음"}
              </span>
              <span>{item.budgetLabel}</span>
            </div>
          </div>
        </div>
      ) : null}

      {confirmTrashOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/55 px-4">
          <div className="w-full max-w-md border-2 border-border bg-card p-5 shadow-2xl">
            <p className="font-mono text-[10px] font-bold uppercase tracking-[0.22em] text-rose-700">
              [ 휴지통 이동 확인 ]
            </p>
            <p className="mt-3 text-sm font-bold text-foreground">
              이 문의를 휴지통으로 이동할까요?
            </p>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
              목록에서는 사라지지만, 휴지통 보기에서 다시 복구할 수 있습니다.
            </p>
            <div className="mt-5 flex flex-wrap justify-end gap-2">
              <button
                type="button"
                onClick={() => setConfirmTrashOpen(false)}
                disabled={actionBusy}
                className="inline-flex items-center justify-center border-2 border-border px-3 py-2 font-mono text-[11px] font-bold uppercase tracking-[0.18em] text-foreground transition-colors hover:bg-muted/50 disabled:cursor-not-allowed disabled:opacity-70"
              >
                취소
              </button>
              <button
                type="button"
                onClick={handleMoveToTrash}
                disabled={actionBusy}
                className="inline-flex items-center justify-center border-2 border-rose-200 bg-rose-50 px-3 py-2 font-mono text-[11px] font-bold uppercase tracking-[0.18em] text-rose-700 transition-colors hover:bg-rose-100 disabled:cursor-not-allowed disabled:opacity-70"
              >
                {actionBusy ? "이동 중..." : "휴지통 이동"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </li>
  );
}
