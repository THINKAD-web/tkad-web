"use client";

import { useCallback, useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Mail, Send } from "lucide-react";

type Template = {
  id: string;
  slug: string;
  name: string;
  subject: string;
  bodyHtml: string;
  bodyText: string | null;
};

export default function AdminEmailTemplatesPage() {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [sel, setSel] = useState<string | null>(null);
  const [draft, setDraft] = useState({
    subject: "",
    bodyHtml: "",
    bodyText: "",
  });
  const [sendTo, setSendTo] = useState("");
  const [company, setCompany] = useState("");
  const [contactName, setContactName] = useState("");
  const [sending, setSending] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const load = useCallback(async () => {
    const res = await fetch("/api/admin/crm/email-templates");
    const data = (await res.json()) as { templates?: Template[] };
    if (res.ok) {
      setTemplates(data.templates ?? []);
      if (!sel && data.templates?.[0]) setSel(data.templates[0].id);
    }
  }, [sel]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    const t = templates.find((x) => x.id === sel);
    if (t) {
      setDraft({
        subject: t.subject,
        bodyHtml: t.bodyHtml,
        bodyText: t.bodyText ?? "",
      });
    }
  }, [sel, templates]);

  const selected = templates.find((t) => t.id === sel);

  const saveTemplate = async () => {
    if (!sel) return;
    const res = await fetch(`/api/admin/crm/email-templates/${sel}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(draft),
    });
    setMsg(res.ok ? "저장됨" : "저장 실패");
    if (res.ok) load();
  };

  const sendOneClick = async () => {
    if (!sel || !sendTo.trim()) return;
    setSending(true);
    setMsg(null);
    try {
      const res = await fetch(`/api/admin/crm/email-templates/${sel}/send`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          to: sendTo.trim(),
          company: company.trim(),
          contactName: contactName.trim(),
        }),
      });
      const data = await res.json();
      setMsg(data.sent ? "발송 완료" : data.code ?? "발송 실패");
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="space-y-6 p-4 md:p-6">
      <div>
        <h1 className="text-2xl font-bold">이메일 템플릿</h1>
        <p className="text-muted-foreground text-sm">
          팔로업·견적·재계약·캠페인 완료 메일. 변수: {"{{company}}"}, {"{{contactName}}"}, {"{{assignedTo}}"}, {"{{campaignName}}"}, {"{{quoteLink}}"}, {"{{dashboardLink}}"}
        </p>
      </div>

      <div className="grid gap-4 lg:grid-cols-[240px_1fr]">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">템플릿</CardTitle>
          </CardHeader>
          <CardContent className="space-y-1 p-2">
            {templates.map((t) => (
              <button
                key={t.id}
                type="button"
                className={`w-full border-2 px-3 py-2 text-left text-sm ${
                  sel === t.id
                    ? "border-primary bg-muted"
                    : "border-transparent hover:bg-muted"
                }`}
                onClick={() => setSel(t.id)}
              >
                {t.name}
                <span className="block text-xs text-muted-foreground">{t.slug}</span>
              </button>
            ))}
          </CardContent>
        </Card>

        {selected ? (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Mail className="h-4 w-4" />
                {selected.name}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-xs font-medium">제목</label>
                <Input
                  value={draft.subject}
                  onChange={(e) =>
                    setDraft((d) => ({ ...d, subject: e.target.value }))
                  }
                />
              </div>
              <div>
                <label className="text-xs font-medium">본문 (HTML)</label>
                <Textarea
                  rows={10}
                  value={draft.bodyHtml}
                  onChange={(e) =>
                    setDraft((d) => ({ ...d, bodyHtml: e.target.value }))
                  }
                />
              </div>
              <Button onClick={saveTemplate}>템플릿 저장</Button>

              <hr className="border-border" />

              <p className="text-sm font-medium">원클릭 발송</p>
              <div className="grid gap-2 sm:grid-cols-3">
                <Input
                  placeholder="수신 이메일 *"
                  value={sendTo}
                  onChange={(e) => setSendTo(e.target.value)}
                />
                <Input
                  placeholder="회사명"
                  value={company}
                  onChange={(e) => setCompany(e.target.value)}
                />
                <Input
                  placeholder="담당자명"
                  value={contactName}
                  onChange={(e) => setContactName(e.target.value)}
                />
              </div>
              <Button
                disabled={sending || !sendTo.trim()}
                onClick={sendOneClick}
              >
                <Send className="mr-2 h-4 w-4" />
                발송
              </Button>
              {msg ? <p className="text-sm text-muted-foreground">{msg}</p> : null}
            </CardContent>
          </Card>
        ) : null}
      </div>
    </div>
  );
}
