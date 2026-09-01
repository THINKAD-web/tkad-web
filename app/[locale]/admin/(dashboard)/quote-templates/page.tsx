"use client";

import { useCallback, useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FileDown, Mail, Plus } from "lucide-react";

type Template = {
  id: string;
  name: string;
  headerHtml: string | null;
  bodyHtml: string;
  footerHtml: string | null;
  isDefault: boolean;
};

const DEFAULT_VARS = `사용 가능한 치환: {{company}} {{name}} {{phone}} {{email}} {{amount}} {{period}} {{message}}`;

export default function AdminQuoteTemplatesPage() {
  const [list, setList] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  const [sel, setSel] = useState<Template | null>(null);
  const [pdfEmail, setPdfEmail] = useState("");
  const [varsJson, setVarsJson] = useState(
    JSON.stringify(
      {
        company: "주식회사 예시",
        name: "홍길동",
        phone: "010-0000-0000",
        email: "hello@example.com",
        amount: "12,000,000",
        period: "2026년 4월",
        message: "VAT 별도, 집행 일정은 협의",
      },
      null,
      2,
    ),
  );

  const [form, setForm] = useState({
    name: "",
    headerHtml: "",
    bodyHtml: "",
    footerHtml: "",
    isDefault: false,
  });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/quote-templates");
      const data = (await res.json()) as { templates?: Template[] };
      setList(data.templates ?? []);
    } catch {
      setList([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const saveNew = async () => {
    if (!form.name.trim() || !form.bodyHtml.trim()) return;
    await fetch("/api/admin/quote-templates", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    setForm({
      name: "",
      headerHtml: "",
      bodyHtml: "",
      footerHtml: "",
      isDefault: false,
    });
    await load();
  };

  const updateSel = async () => {
    if (!sel) return;
    await fetch(`/api/admin/quote-templates/${sel.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: sel.name,
        headerHtml: sel.headerHtml,
        bodyHtml: sel.bodyHtml,
        footerHtml: sel.footerHtml,
        isDefault: sel.isDefault,
      }),
    });
    await load();
  };

  const genPdf = async (mode: "download" | "email") => {
    let vars: Record<string, string> = {};
    try {
      vars = JSON.parse(varsJson) as Record<string, string>;
    } catch {
      alert("변수 JSON 형식이 올바르지 않습니다.");
      return;
    }
    const body: Record<string, unknown> = {
      vars,
      templateId: sel?.id,
    };
    if (mode === "email") {
      if (!pdfEmail.trim()) {
        alert("이메일을 입력하세요.");
        return;
      }
      body.emailTo = pdfEmail.trim();
      body.emailSubject = "[THINKAD] 견적서 PDF";
    }
    const res = await fetch("/api/admin/quote-pdf", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = (await res.json()) as {
      pdfBase64?: string;
      emailed?: boolean;
      error?: string;
      code?: string;
    };
    if (!res.ok) {
      alert(data.error ?? "실패");
      return;
    }
    if (data.emailed) {
      alert("메일을 발송했습니다.");
      return;
    }
    if (data.pdfBase64) {
      const a = document.createElement("a");
      a.href = `data:application/pdf;base64,${data.pdfBase64}`;
      a.download = "thinkad-quote.pdf";
      a.click();
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <p className="tkad-type-label text-muted-foreground">
          [ QUOTE TEMPLATES ]
        </p>
        <h2 className="mt-2 text-lg font-bold tracking-tight text-foreground">
          견적서 PDF · 템플릿
        </h2>
        <p className="mt-1 tkad-type-caption tracking-tight text-muted-foreground">
          {`// `}HTML 템플릿을 저장하고 PDF로 생성·다운로드하거나 이메일로 발송합니다.
        </p>
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">템플릿 목록</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {loading ? (
              <p className="tkad-type-label text-muted-foreground">
                {`// `}불러오는 중…
              </p>
            ) : (
              <ul className="max-h-48 space-y-1 overflow-y-auto text-sm">
                {list.map((t) => (
                  <li key={t.id}>
                    <button
                      type="button"
                      className={[
                        "w-full border-2 border-border bg-card px-2 py-2 text-left tkad-type-label transition-colors hover:bg-muted/50",
                        sel?.id === t.id
                          ? "bg-foreground text-background"
                          : "text-foreground",
                      ].join(" ")}
                      onClick={() => setSel({ ...t })}
                    >
                      {t.name}{" "}
                      {t.isDefault ? (
                        <span className="text-primary">(기본)</span>
                      ) : null}
                    </button>
                  </li>
                ))}
              </ul>
            )}
            <div className="space-y-2 border-t pt-3">
              <p className="tkad-type-label text-muted-foreground">
                [ 새 템플릿 ]
              </p>
              <Input
                placeholder="이름"
                value={form.name}
                onChange={(e) =>
                  setForm((f) => ({ ...f, name: e.target.value }))
                }
              />
              <textarea
                className="w-full rounded border p-2 text-xs"
                rows={2}
                placeholder="헤더 HTML (선택)"
                value={form.headerHtml}
                onChange={(e) =>
                  setForm((f) => ({ ...f, headerHtml: e.target.value }))
                }
              />
              <textarea
                className="w-full rounded border p-2 text-xs"
                rows={6}
                placeholder="본문 HTML"
                value={form.bodyHtml}
                onChange={(e) =>
                  setForm((f) => ({ ...f, bodyHtml: e.target.value }))
                }
              />
              <textarea
                className="w-full rounded border p-2 text-xs"
                rows={2}
                placeholder="푸터 HTML (선택)"
                value={form.footerHtml}
                onChange={(e) =>
                  setForm((f) => ({ ...f, footerHtml: e.target.value }))
                }
              />
              <label className="flex items-center gap-2 text-xs">
                <input
                  type="checkbox"
                  checked={form.isDefault}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, isDefault: e.target.checked }))
                  }
                />
                기본 템플릿으로 설정
              </label>
              <Button
                type="button"
                size="sm"
                className="border-2 border-border bg-foreground text-background transition-colors hover:bg-primary hover:border-primary hover:text-primary-foreground"
                onClick={saveNew}
              >
                <Plus className="mr-1 h-4 w-4" />
                추가
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">편집 · PDF</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {sel ? (
              <>
                <Input
                  value={sel.name}
                  onChange={(e) => setSel({ ...sel, name: e.target.value })}
                />
                <textarea
                  className="w-full rounded border p-2 text-xs"
                  rows={2}
                  value={sel.headerHtml ?? ""}
                  onChange={(e) =>
                    setSel({ ...sel, headerHtml: e.target.value })
                  }
                />
                <textarea
                  className="w-full rounded border p-2 text-xs"
                  rows={8}
                  value={sel.bodyHtml}
                  onChange={(e) =>
                    setSel({ ...sel, bodyHtml: e.target.value })
                  }
                />
                <textarea
                  className="w-full rounded border p-2 text-xs"
                  rows={2}
                  value={sel.footerHtml ?? ""}
                  onChange={(e) =>
                    setSel({ ...sel, footerHtml: e.target.value })
                  }
                />
                <label className="flex items-center gap-2 text-xs">
                  <input
                    type="checkbox"
                    checked={sel.isDefault}
                    onChange={(e) =>
                      setSel({ ...sel, isDefault: e.target.checked })
                    }
                  />
                  기본 템플릿
                </label>
                <Button type="button" size="sm" variant="outline" onClick={updateSel}>
                  변경 저장
                </Button>
              </>
            ) : (
              <p className="tkad-type-caption tracking-tight text-muted-foreground">
                {`// `}템플릿을 선택하거나 새로 만드세요.
              </p>
            )}
            <div className="border-t pt-3">
              <p className="mb-1 tkad-type-caption tracking-tight text-muted-foreground">
                {`// `}{DEFAULT_VARS}
              </p>
              <textarea
                className="w-full rounded border p-2 text-xs"
                rows={10}
                value={varsJson}
                onChange={(e) => setVarsJson(e.target.value)}
              />
              <div className="mt-2 flex flex-wrap gap-2">
                <Button
                  type="button"
                  size="sm"
                  variant="secondary"
                  onClick={() => genPdf("download")}
                >
                  <FileDown className="mr-1 h-4 w-4" />
                  PDF 다운로드
                </Button>
                <Input
                  className="max-w-xs"
                  placeholder="이메일 (발송)"
                  value={pdfEmail}
                  onChange={(e) => setPdfEmail(e.target.value)}
                />
                <Button
                  type="button"
                  size="sm"
                  className="border-2 border-border bg-foreground text-background transition-colors hover:bg-primary hover:border-primary hover:text-primary-foreground"
                  onClick={() => genPdf("email")}
                >
                  <Mail className="mr-1 h-4 w-4" />
                  이메일 발송
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
