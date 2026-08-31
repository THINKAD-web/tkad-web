"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { FileText, Loader2, Trash2, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { adminFetchJson } from "@/lib/admin-client-fetch";

type ProposalState = {
  proposalUrl: string | null;
  proposalFileName: string | null;
  hasProposal: boolean;
};

type Props = {
  mediaId: string;
  initial?: ProposalState | null;
  onUpdated?: (next: ProposalState) => void;
};

export function AdminMediaProposalUpload({
  mediaId,
  initial,
  onUpdated,
}: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [state, setState] = useState<ProposalState>({
    proposalUrl: initial?.proposalUrl ?? null,
    proposalFileName: initial?.proposalFileName ?? null,
    hasProposal: initial?.hasProposal ?? false,
  });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (initial) setState(initial);
  }, [initial]);

  const upload = useCallback(
    async (file: File) => {
      setBusy(true);
      setError(null);
      try {
        const fd = new FormData();
        fd.append("file", file);
        fd.append("fileName", file.name);
        const res = await fetch(
          `/api/admin/medias/${encodeURIComponent(mediaId)}/proposal-upload`,
          {
            method: "POST",
            credentials: "include",
            body: fd,
          },
        );
        const data = (await res.json().catch(() => ({}))) as {
          error?: string;
          media?: ProposalState & { id: string };
        };
        if (!res.ok) {
          setError(data.error ?? `업로드 실패 (HTTP ${res.status})`);
          return;
        }
        const next: ProposalState = {
          proposalUrl: data.media?.proposalUrl ?? null,
          proposalFileName: data.media?.proposalFileName ?? file.name,
          hasProposal: data.media?.hasProposal ?? true,
        };
        setState(next);
        onUpdated?.(next);
      } catch (e) {
        setError(
          e instanceof Error ? e.message : "제안서 업로드에 실패했습니다.",
        );
      } finally {
        setBusy(false);
      }
    },
    [mediaId, onUpdated],
  );

  const remove = useCallback(async () => {
    setBusy(true);
    setError(null);
    try {
      const result = await adminFetchJson(
        `/api/admin/medias/${encodeURIComponent(mediaId)}/proposal-upload`,
        { method: "DELETE", credentials: "include" },
      );
      if (!result.ok) {
        setError(result.message);
        return;
      }
      const raw = result.data as { media?: ProposalState };
      const next: ProposalState = {
        proposalUrl: raw.media?.proposalUrl ?? null,
        proposalFileName: raw.media?.proposalFileName ?? null,
        hasProposal: raw.media?.hasProposal ?? false,
      };
      setState(next);
      onUpdated?.(next);
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "제안서 삭제에 실패했습니다.",
      );
    } finally {
      setBusy(false);
    }
  }, [mediaId, onUpdated]);

  return (
    <div className="rounded-xl border-2 border-border bg-muted/40 p-4">
      <div className="mb-2 flex items-center gap-2">
        <FileText className="h-4 w-4 text-[color:var(--qp-accent)]" />
        <span className="tkad-type-title text-foreground">
          제안서 PDF 업로드
        </span>
      </div>
      <p className="mb-3 tkad-type-caption leading-relaxed text-muted-foreground">
        BunnyCDN 경로:{" "}
        <code className="rounded bg-card px-1">
          tkad/proposals/{mediaId}/proposal.pdf
        </code>
      </p>

      {state.hasProposal && state.proposalUrl ? (
        <div className="mb-3 space-y-1 rounded-lg border border-border bg-card px-3 py-2 text-xs">
          <p className="font-medium text-foreground">
            {state.proposalFileName ?? "proposal.pdf"}
          </p>
          <a
            href={state.proposalUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="break-all text-[color:var(--qp-accent)] underline"
          >
            {state.proposalUrl}
          </a>
        </div>
      ) : (
        <p className="mb-3 text-xs text-muted-foreground">
          업로드된 제안서가 없습니다. 공개 상세에서는 기본 PDF가 자동 생성됩니다.
        </p>
      )}

      {error ? (
        <p className="mb-2 text-xs text-red-600" role="alert">
          {error}
        </p>
      ) : null}

      <div className="flex flex-wrap gap-2">
        <input
          ref={inputRef}
          type="file"
          accept="application/pdf,.pdf"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) void upload(f);
            e.target.value = "";
          }}
        />
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="gap-1"
          disabled={busy}
          onClick={() => inputRef.current?.click()}
        >
          {busy ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <Upload className="h-3.5 w-3.5" />
          )}
          PDF 선택
        </Button>
        {state.hasProposal ? (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="gap-1 text-red-600 hover:bg-red-50 hover:text-red-700"
            disabled={busy}
            onClick={() => void remove()}
          >
            <Trash2 className="h-3.5 w-3.5" />
            제거
          </Button>
        ) : null}
      </div>
    </div>
  );
}
