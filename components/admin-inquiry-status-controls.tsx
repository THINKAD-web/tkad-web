"use client";

import { useState, useTransition } from "react";
import type { InquiryAdminStatusCode } from "@/lib/contact-inquiry-labels";

type Props = {
  inquiryId: string;
  status: InquiryAdminStatusCode;
  assignee: string;
  note: string;
  onSaved?: (meta: {
    status: InquiryAdminStatusCode;
    assignee: string;
    note: string;
  }) => void;
};

const OPTIONS: Array<{ value: InquiryAdminStatusCode; label: string }> = [
  { value: "new", label: "미처리" },
  { value: "in_progress", label: "진행중" },
  { value: "done", label: "답변완료" },
];

export default function AdminInquiryStatusControls({
  inquiryId,
  status,
  assignee,
  note,
  onSaved,
}: Props) {
  const [draftStatus, setDraftStatus] = useState<InquiryAdminStatusCode>(status);
  const [draftAssignee, setDraftAssignee] = useState(assignee);
  const [draftNote, setDraftNote] = useState(note);
  const [error, setError] = useState("");
  const [isPending, startTransition] = useTransition();
  const dirty =
    draftStatus !== status ||
    draftAssignee.trim() !== assignee.trim() ||
    draftNote.trim() !== note.trim();

  const saveMeta = () => {
    if (!dirty || isPending) return;

    setError("");

    startTransition(async () => {
      try {
        const res = await fetch(`/api/admin/inquiries/${inquiryId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            status: draftStatus,
            assignee: draftAssignee.trim(),
            note: draftNote.trim(),
          }),
        });
        const data = (await res.json()) as { ok?: boolean };
        if (!res.ok || !data.ok) {
          setError("관리 정보를 저장하지 못했습니다.");
          return;
        }
        onSaved?.({
          status: draftStatus,
          assignee: draftAssignee.trim(),
          note: draftNote.trim(),
        });
      } catch {
        setError("네트워크 오류가 발생했습니다.");
      }
    });
  };

  return (
    <div className="space-y-3">
      <p className="font-display text-xs font-medium uppercase tracking-[0.22em] text-muted-foreground">
        [ 관리 정보 ]
      </p>
      <div className="flex flex-wrap gap-2">
        {OPTIONS.map((option) => {
          const active = draftStatus === option.value;
          return (
            <button
              key={option.value}
              type="button"
              onClick={() => setDraftStatus(option.value)}
              disabled={isPending}
              className={[
                "inline-flex items-center justify-center border-2 px-3 py-2 font-display text-xs font-medium uppercase tracking-[0.18em] transition-colors disabled:cursor-not-allowed disabled:opacity-70",
                active
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border bg-background text-foreground hover:bg-muted/50",
              ].join(" ")}
            >
              {option.label}
            </button>
          );
        })}
      </div>

      <div className="space-y-1">
        <label className="font-display text-xs font-medium uppercase tracking-[0.22em] text-muted-foreground">
          담당자
        </label>
        <input
          type="text"
          value={draftAssignee}
          onChange={(e) => setDraftAssignee(e.target.value)}
          placeholder="예: 재헌 / 세일즈팀"
          maxLength={120}
          className="h-10 w-full border-2 border-border bg-background px-3 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none"
        />
      </div>

      <div className="space-y-1">
        <label className="font-display text-xs font-medium uppercase tracking-[0.22em] text-muted-foreground">
          관리 메모
        </label>
        <textarea
          value={draftNote}
          onChange={(e) => setDraftNote(e.target.value)}
          placeholder="연락 시각, 논의 포인트, 후속 액션 등을 기록"
          rows={5}
          maxLength={4000}
          className="min-h-[120px] w-full resize-y border-2 border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none"
        />
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={saveMeta}
          disabled={!dirty || isPending}
          className="inline-flex items-center justify-center border-2 border-border bg-foreground px-4 py-2 font-display text-xs font-medium uppercase tracking-[0.18em] text-background transition-colors hover:bg-primary hover:border-primary hover:text-primary-foreground disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isPending ? "저장 중..." : "관리 정보 저장"}
        </button>
        {dirty && !isPending ? (
          <span className="text-[10px] tracking-tight text-amber-700">
            {`// `}변경 사항 있음
          </span>
        ) : null}
      </div>

      {error ? (
        <p className="text-[10px] tracking-tight text-destructive">
          {`// `}
          {error}
        </p>
      ) : isPending ? (
        <p className="text-[10px] tracking-tight text-muted-foreground">
          {`// `}저장 중...
        </p>
      ) : null}
    </div>
  );
}
