"use client";

import { useState, useMemo } from "react";
import { Link } from "@/i18n/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Mail,
  Lock,
  LogOut,
  Phone,
  Building2,
  User,
  Loader2,
  LayoutDashboard,
} from "lucide-react";
import {
  CLIENT_SESSION_EMAIL_KEY,
  type Client,
  mockClients,
  statusMap,
} from "@/lib/client-portal-mock";

type Step = "login" | "code" | "portal";

export default function ClientPortalPage() {
  const [step, setStep] = useState<Step>("login");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [client, setClient] = useState<Client | null>(null);

  const projects = useMemo(() => client?.projects ?? [], [client]);

  const handleRequestCode = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!email.trim() || !email.includes("@")) {
      setError("유효한 이메일을 입력해 주세요.");
      return;
    }
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      setStep("code");
    }, 600);
  };

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!code.trim()) {
      setError("이메일로 전송된 코드를 입력해 주세요.");
      return;
    }
    setLoading(true);
    setTimeout(() => {
      const matched =
        mockClients.find(
          (c) => c.email.toLowerCase() === email.toLowerCase().trim(),
        ) ?? mockClients[0];
      setClient(matched);
      try {
        localStorage.setItem(CLIENT_SESSION_EMAIL_KEY, matched.email);
      } catch {
        /* ignore */
      }
      setStep("portal");
      setLoading(false);
    }, 600);
  };

  const handleLogout = () => {
    setClient(null);
    setEmail("");
    setCode("");
    setError(null);
    setStep("login");
    try {
      localStorage.removeItem(CLIENT_SESSION_EMAIL_KEY);
    } catch {
      /* ignore */
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 py-12">
      <div className="mx-auto flex max-w-5xl flex-col gap-8 px-4 lg:flex-row lg:items-start">
        <div className="w-full lg:w-1/3">
          <Card className="shadow-md">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg text-navy">
                <Mail className="h-5 w-5 text-gold" />
                클라이언트 전용 로그인
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-xs text-muted-foreground">
                등록된 이메일과 인증코드를 통해
                <br />
                진행 중인 문의 및 프로젝트 현황을 확인하실 수 있습니다.
              </p>

              {step === "login" && (
                <form className="space-y-4" onSubmit={handleRequestCode}>
                  <div>
                    <label className="mb-1.5 block text-xs font-medium text-navy">
                      이메일 주소
                    </label>
                    <Input
                      type="email"
                      placeholder="you@company.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                    />
                  </div>
                  {error && (
                    <p className="text-xs font-medium text-red-500">{error}</p>
                  )}
                  <Button
                    type="submit"
                    className="w-full bg-gold font-semibold text-navy hover:bg-gold-dark"
                    disabled={loading}
                  >
                    {loading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        코드 발송 중...
                      </>
                    ) : (
                      <>
                        <Mail className="mr-2 h-4 w-4" />
                        로그인 코드 받기
                      </>
                    )}
                  </Button>
                  <p className="text-[11px] text-muted-foreground">
                    ※ 실제 환경에서는 이메일로 일회용 코드가 발송되며,
                    본 화면은 데모용 간단 인증 방식입니다.
                  </p>
                </form>
              )}

              {step === "code" && (
                <form className="space-y-4" onSubmit={handleLogin}>
                  <div className="text-xs text-muted-foreground">
                    <p>
                      <span className="font-medium text-navy">
                        {email || "you@company.com"}
                      </span>{" "}
                      주소로 인증코드를 발송했습니다.
                    </p>
                    <p className="mt-1">
                      메일함을 확인 후 아래에 코드를 입력해 주세요.
                    </p>
                  </div>
                  <div>
                    <label className="mb-1.5 block text-xs font-medium text-navy">
                      인증 코드
                    </label>
                    <div className="flex gap-2">
                      <Input
                        placeholder="예: 123456"
                        value={code}
                        onChange={(e) => setCode(e.target.value)}
                      />
                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        onClick={() => setStep("login")}
                      >
                        <Mail className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                  {error && (
                    <p className="text-xs font-medium text-red-500">{error}</p>
                  )}
                  <Button
                    type="submit"
                    className="w-full bg-navy font-semibold text-white hover:bg-navy/90"
                    disabled={loading}
                  >
                    {loading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        확인 중...
                      </>
                    ) : (
                      <>
                        <Lock className="mr-2 h-4 w-4" />
                        로그인
                      </>
                    )}
                  </Button>
                  <p className="text-[11px] text-muted-foreground">
                    데모에서는 임의 코드 입력 시 로그인되며,
                    등록된 이메일에 따라 예시 프로젝트 정보가 노출됩니다.
                  </p>
                </form>
              )}

              {step === "portal" && client && (
                <div className="space-y-4">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="text-xs font-medium text-muted-foreground">
                        로그인 계정
                      </p>
                      <p className="text-sm font-semibold text-navy">
                        {client.company}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {client.contactName} · {client.email}
                      </p>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleLogout}
                    >
                      <LogOut className="mr-1.5 h-3.5 w-3.5" />
                      로그아웃
                    </Button>
                  </div>

                  <Link href="/client/dashboard" className="block">
                    <Button className="btn-gold w-full font-semibold">
                      <LayoutDashboard className="mr-2 h-4 w-4" />
                      캠페인 대시보드
                    </Button>
                  </Link>

                  <div className="space-y-2 rounded-md bg-slate-50 p-3">
                    <p className="text-xs font-medium text-muted-foreground">
                      담당 매니저 안내
                    </p>
                    <p className="text-sm text-navy">
                      각 프로젝트 카드에서 담당자 연락처를 확인하실 수 있습니다.
                    </p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="w-full lg:w-2/3">
          <Card className="shadow-md">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg text-navy">
                <Building2 className="h-5 w-5 text-gold" />
                내 문의 / 프로젝트 진행 현황
              </CardTitle>
            </CardHeader>
            <CardContent>
              {!client || step !== "portal" ? (
                <div className="flex flex-col items-center justify-center gap-3 py-16 text-center">
                  <Lock className="h-8 w-8 text-slate-300" />
                  <p className="text-sm font-medium text-navy">
                    로그인 후 진행 중인 문의와 프로젝트 현황을 확인하실 수 있습니다.
                  </p>
                  <p className="max-w-md text-xs text-muted-foreground">
                    이전에 싱커드를 통해 문의 또는 캠페인을 진행하신 고객사만
                    이용 가능합니다. 최초 이용 고객은 상단 내비게이션의
                    &ldquo;견적 문의&rdquo; 또는 &ldquo;문의하기&rdquo;를 통해
                    먼저 문의를 남겨 주세요.
                  </p>
                </div>
              ) : projects.length === 0 ? (
                <div className="py-12 text-center text-sm text-muted-foreground">
                  진행 중인 프로젝트가 없습니다.
                </div>
              ) : (
                <div className="space-y-6">
                  <StatusLegend />
                  <div className="grid gap-4 md:grid-cols-2">
                    {projects.map((project) => {
                      const status = statusMap[project.status];
                      return (
                        <div
                          key={project.id}
                          className="flex h-full flex-col rounded-xl border border-slate-100 bg-white p-4 shadow-sm"
                        >
                          <div className="mb-3 flex items-start justify-between gap-2">
                            <div>
                              <p className="text-xs font-mono text-muted-foreground">
                                {project.id}
                              </p>
                              <h3 className="mt-1 text-sm font-semibold text-navy">
                                {project.title}
                              </h3>
                            </div>
                            <Badge
                              variant="secondary"
                              className={`${status.className} border-0 text-[11px]`}
                            >
                              {status.labelKo}
                            </Badge>
                          </div>
                          <p className="text-xs leading-relaxed text-muted-foreground">
                            {project.summary}
                          </p>
                          <div className="mt-3 flex flex-wrap items-center gap-3 text-[11px] text-muted-foreground">
                            <span>접수일 {project.createdAt}</span>
                            <span className="h-1 w-1 rounded-full bg-slate-300" />
                            <span>마지막 업데이트 {project.updatedAt}</span>
                          </div>
                          <div className="mt-4 rounded-md bg-slate-50 p-3">
                            <p className="text-[11px] font-medium text-muted-foreground">
                              진행 상태 설명
                            </p>
                            <p className="mt-1 text-xs text-navy">
                              {status.descriptionKo}
                            </p>
                          </div>
                          <div className="mt-4 border-t border-slate-100 pt-3">
                            <p className="mb-1 text-[11px] font-medium text-muted-foreground">
                              담당자 연락처
                            </p>
                            <div className="flex flex-wrap items-center gap-2 text-xs text-navy">
                              <span className="inline-flex items-center gap-1">
                                <User className="h-3.5 w-3.5 text-gold" />
                                {project.manager.name} ({project.manager.role})
                              </span>
                              <span className="h-1 w-1 rounded-full bg-slate-300" />
                              <span className="inline-flex items-center gap-1">
                                <Phone className="h-3.5 w-3.5 text-gold" />
                                {project.manager.phone}
                              </span>
                              <span className="h-1 w-1 rounded-full bg-slate-300" />
                              <span>{project.manager.email}</span>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

function StatusLegend() {
  return (
    <div className="rounded-lg bg-slate-50 p-3">
      <p className="mb-2 text-[11px] font-medium text-muted-foreground">
        진행 상태 안내
      </p>
      <div className="grid gap-2 text-[11px] md:grid-cols-4">
        <LegendItem label="접수" colorClass="bg-slate-100 text-slate-700">
          문의가 정상적으로 접수되어 순차적으로 확인 중입니다.
        </LegendItem>
        <LegendItem label="검토중" colorClass="bg-amber-100 text-amber-700">
          전략/미디어 플래너가 캠페인 방향과 매체 구성을 검토하고 있습니다.
        </LegendItem>
        <LegendItem label="진행중" colorClass="bg-blue-100 text-blue-700">
          매체 집행, 운영, 리포팅이 진행 중입니다.
        </LegendItem>
        <LegendItem label="완료" colorClass="bg-emerald-100 text-emerald-700">
          캠페인이 종료되었으며, 필요 시 사후 리포트가 제공됩니다.
        </LegendItem>
      </div>
    </div>
  );
}

function LegendItem({
  label,
  colorClass,
  children,
}: {
  label: string;
  colorClass: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-start gap-2 rounded-md bg-white p-2 shadow-sm">
      <span
        className={`mt-0.5 inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold ${colorClass}`}
      >
        {label}
      </span>
      <p className="text-[11px] leading-relaxed text-muted-foreground">
        {children}
      </p>
    </div>
  );
}
