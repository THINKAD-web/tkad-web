"use client";

import { useEffect, useState } from "react";
import { Link, useRouter } from "@/i18n/navigation";
import {
  CheckCircle2,
  ExternalLink,
  Film,
  Image as ImageIcon,
  Loader2,
  Pencil,
  Save,
  Trash2,
} from "lucide-react";
import { BtnBlock } from "@/components/brutalist";
import { useToast } from "@/components/toast-provider";
import { formatFileSize, formatDuration } from "@/components/creatives/creative-card";
import type { CreativeDetail } from "@/lib/creatives/types";

export function CreativeDetailClient({ id }: { id: string }) {
  const router = useRouter();
  const { toast } = useToast();
  const [detail, setDetail] = useState<CreativeDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState("");
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const r = await fetch(`/api/my/creatives/${encodeURIComponent(id)}`, {
        cache: "no-store",
      });
      if (cancelled) return;
      if (r.status === 401) {
        router.replace(`/login?redirect=/creatives/${id}`);
        return;
      }
      if (r.status === 404) {
        router.replace("/creatives");
        return;
      }
      const d = await r.json();
      if (d?.ok) {
        setDetail(d.data as CreativeDetail);
        setName(d.data.name);
        setTags(d.data.tags);
      }
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [id, router]);

  const handleSave = async () => {
    if (!detail) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/my/creatives/${detail.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim(), tags }),
      });
      const d = await res.json();
      if (!res.ok || !d?.ok) {
        toast("error", d?.error?.message ?? "저장에 실패했습니다.");
        return;
      }
      setDetail({ ...detail, name: d.data.name, tags: d.data.tags });
      setEditing(false);
      toast("success", "저장했습니다.");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!detail) return;
    if (!confirm("이 소재를 라이브러리에서 삭제하시겠습니까?\n(기존 예약·플레이리스트 참조는 영향 없음)")) return;
    const res = await fetch(`/api/my/creatives/${detail.id}`, {
      method: "DELETE",
    });
    if (res.ok) {
      toast("success", "삭제했습니다.");
      router.push("/creatives");
      router.refresh();
    } else {
      toast("error", "삭제에 실패했습니다.");
    }
  };

  if (loading || !detail) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1.4fr,1fr]">
      <div className="space-y-4">
        <div className="overflow-hidden rounded-2xl border-2 border-border bg-card">
          <div className="aspect-[16/10] w-full bg-black/5 dark:bg-black/30">
            {detail.type === "video" ? (
              <video
                src={detail.url}
                controls
                playsInline
                className="h-full w-full object-contain"
              />
            ) : (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={detail.url}
                alt={detail.name}
                className="h-full w-full object-contain"
              />
            )}
          </div>
          <div className="flex flex-col gap-1 p-4 sm:p-5">
            {editing ? (
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                maxLength={100}
                className="h-10 w-full rounded-md border-2 border-border bg-card px-3 font-mono text-sm font-bold text-foreground focus:border-accent focus:outline-none"
              />
            ) : (
              <p className="text-lg font-bold tracking-tight text-foreground">
                {detail.name}
              </p>
            )}
            <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
              {detail.type === "video" ? "VIDEO" : "IMAGE"} ·{" "}
              {detail.width && detail.height ? `${detail.width}×${detail.height}` : "—"} ·{" "}
              {formatFileSize(detail.fileSize)}
              {detail.type === "video" && detail.duration ? ` · ${formatDuration(detail.duration)}` : ""}
            </p>
          </div>
        </div>

        <div className="rounded-2xl border-2 border-border bg-muted/40 p-4 sm:p-5">
          <div className="mb-3 flex items-center justify-between">
            <p className="font-mono text-[10px] font-bold uppercase tracking-[0.22em] text-accent">
              [ 태그 ]
            </p>
            {editing ? null : (
              <button
                type="button"
                onClick={() => setEditing(true)}
                className="inline-flex items-center gap-1 font-mono text-[10px] font-bold uppercase tracking-[0.18em] text-muted-foreground hover:text-foreground"
              >
                <Pencil className="h-3 w-3" /> 편집
              </button>
            )}
          </div>
          {editing ? (
            <div className="flex flex-wrap gap-2">
              {tags.map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setTags((cur) => cur.filter((x) => x !== t))}
                  className="inline-flex items-center gap-1 rounded-md border-2 border-border bg-card px-2 py-1 font-mono text-[10px] font-bold uppercase tracking-[0.14em] text-foreground hover:border-destructive hover:text-destructive"
                >
                  #{t}
                  <Trash2 className="h-3 w-3" />
                </button>
              ))}
              <input
                type="text"
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    const t = tagInput.trim();
                    if (t && !tags.includes(t) && tags.length < 12) {
                      setTags([...tags, t.slice(0, 30)]);
                      setTagInput("");
                    }
                  }
                }}
                maxLength={30}
                placeholder="추가 (Enter)"
                className="h-7 w-40 rounded-md border-2 border-dashed border-border bg-card px-2 font-mono text-[11px] focus:border-accent focus:outline-none"
              />
            </div>
          ) : detail.tags.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {detail.tags.map((t) => (
                <span
                  key={t}
                  className="rounded-md border-2 border-border bg-card px-2 py-1 font-mono text-[10px] font-bold uppercase tracking-[0.14em] text-foreground"
                >
                  #{t}
                </span>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">태그가 없습니다.</p>
          )}
          {editing ? (
            <div className="mt-4 flex flex-wrap gap-2">
              <BtnBlock variant="accent" size="md" onClick={handleSave} disabled={saving}>
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                저장
              </BtnBlock>
              <BtnBlock
                variant="secondary"
                size="md"
                onClick={() => {
                  setEditing(false);
                  setName(detail.name);
                  setTags(detail.tags);
                }}
              >
                취소
              </BtnBlock>
            </div>
          ) : null}
        </div>
      </div>

      <aside className="space-y-4">
        <div className="rounded-2xl border-2 border-border bg-card p-4 sm:p-5">
          <p className="font-mono text-[10px] font-bold uppercase tracking-[0.22em] text-accent">
            [ 사용 이력 ]
          </p>
          {detail.usages.length === 0 ? (
            <p className="mt-3 text-sm text-muted-foreground">
              아직 어디에도 사용되지 않은 소재입니다.
            </p>
          ) : (
            <ul className="mt-3 space-y-2">
              {detail.usages.map((u) => (
                <li
                  key={`${u.kind}-${u.id}`}
                  className="flex items-start gap-2 rounded-lg border-2 border-border bg-muted/40 px-3 py-2 text-sm"
                >
                  {u.kind === "instant_booking" ? (
                    <Film className="mt-0.5 h-3.5 w-3.5 shrink-0 text-accent" />
                  ) : (
                    <ImageIcon className="mt-0.5 h-3.5 w-3.5 shrink-0 text-accent" />
                  )}
                  <Link
                    href={u.href}
                    className="flex flex-1 items-center justify-between text-foreground hover:text-accent"
                  >
                    <div className="min-w-0">
                      <p className="line-clamp-2 text-[13px] font-medium leading-snug">
                        {u.title}
                      </p>
                      <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
                        {new Date(u.createdAt).toLocaleDateString("ko-KR")}
                        {u.status ? ` · ${u.status}` : ""}
                      </p>
                    </div>
                    <ExternalLink className="ml-2 h-3.5 w-3.5 shrink-0" />
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="rounded-2xl border-2 border-border bg-card p-4 sm:p-5">
          <p className="font-mono text-[10px] font-bold uppercase tracking-[0.22em] text-accent">
            [ 메타 ]
          </p>
          <dl className="mt-3 grid grid-cols-2 gap-3 font-mono text-[11px] uppercase tracking-[0.14em] text-muted-foreground">
            <Meta label="유형" value={detail.type} />
            <Meta label="등록일" value={new Date(detail.createdAt).toLocaleDateString("ko-KR")} />
            <Meta label="해상도" value={detail.width && detail.height ? `${detail.width}×${detail.height}` : "—"} />
            <Meta label="용량" value={formatFileSize(detail.fileSize)} />
            {detail.type === "video" ? (
              <Meta label="길이" value={formatDuration(detail.duration)} />
            ) : null}
            <Meta label="원본 파일명" value={detail.fileName ?? "—"} />
          </dl>
          {detail.usages.length === 0 ? (
            <div className="mt-4">
              <BtnBlock
                variant="secondary"
                size="md"
                onClick={handleDelete}
                className="w-full"
              >
                <Trash2 className="h-4 w-4" /> 라이브러리에서 삭제
              </BtnBlock>
            </div>
          ) : (
            <div className="mt-4 inline-flex items-center gap-1 font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
              <CheckCircle2 className="h-3 w-3 text-accent" />
              사용 중인 소재라 삭제할 수 없습니다.
            </div>
          )}
        </div>
      </aside>
    </div>
  );
}

function Meta({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt>{label}</dt>
      <dd className="mt-0.5 normal-case tracking-normal text-foreground">{value}</dd>
    </div>
  );
}
