"use client";

import { useCallback, useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Search, UserCog } from "lucide-react";

type Role = "advertiser" | "agency" | "owner" | "admin";

type User = {
  id: string;
  email: string;
  name: string;
  company: string | null;
  phone: string | null;
  role: Role;
  emailVerifiedAt: string | null;
  lastLoginAt: string | null;
  createdAt: string;
};

const ROLE_LABEL: Record<Role, string> = {
  advertiser: "광고주",
  agency: "대행사",
  owner: "매체사",
  admin: "관리자",
};

const ROLE_STYLE: Record<Role, string> = {
  advertiser: "bg-blue-100 text-blue-800 hover:bg-blue-100",
  agency: "bg-purple-100 text-purple-800 hover:bg-purple-100",
  owner: "bg-emerald-100 text-emerald-800 hover:bg-emerald-100",
  admin: "bg-amber-100 text-amber-900 hover:bg-amber-100",
};

function formatDate(s: string | null): string {
  if (!s) return "-";
  return new Date(s).toLocaleDateString("ko-KR");
}

export default function UsersAdminClient() {
  const [items, setItems] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
  const [q, setQ] = useState("");
  const [roleFilter, setRoleFilter] = useState<"" | Role>("");
  const [changing, setChanging] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const qs = new URLSearchParams();
      if (q) qs.set("q", q);
      if (roleFilter) qs.set("role", roleFilter);
      const res = await fetch(`/api/admin/users?${qs.toString()}`, { cache: "no-store" });
      const data = await res.json();
      if (data.ok) setItems(data.data.items);
      else setItems([]);
    } finally {
      setLoading(false);
    }
  }, [q, roleFilter]);

  useEffect(() => {
    const t = setTimeout(load, 300);
    return () => clearTimeout(t);
  }, [load]);

  async function changeRole(userId: string, role: Role) {
    setChanging(userId);
    try {
      const res = await fetch(`/api/admin/users/${userId}/role`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role }),
      });
      if (res.ok) {
        setItems((prev) => prev.map((u) => (u.id === userId ? { ...u, role } : u)));
      }
    } finally {
      setChanging(null);
    }
  }

  return (
    <>
      <Card>
        <CardContent className="p-4">
          <div className="grid grid-cols-1 sm:grid-cols-[1fr_200px] gap-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="search"
                placeholder="이메일 · 이름 · 회사 검색"
                value={q}
                onChange={(e) => setQ(e.target.value)}
                className="w-full h-10 pl-9 pr-3 border border-slate-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
              />
            </div>
            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value as "" | Role)}
              className="h-10 px-3 border border-slate-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
            >
              <option value="">역할 전체</option>
              <option value="advertiser">광고주</option>
              <option value="agency">대행사</option>
              <option value="owner">매체사</option>
              <option value="admin">관리자</option>
            </select>
          </div>
        </CardContent>
      </Card>

      <Card className="mt-4">
        <CardContent className="p-0 overflow-x-auto">
          {loading ? (
            <div className="py-10 text-center text-sm text-slate-400">불러오는 중…</div>
          ) : items.length === 0 ? (
            <div className="py-10 text-center">
              <UserCog className="w-8 h-8 text-slate-300 mx-auto mb-2" />
              <p className="text-sm text-bx-gray-dim">조건에 맞는 사용자가 없습니다</p>
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="text-left px-4 py-2.5 text-xs font-medium text-bx-gray-dim uppercase tracking-wider">이름</th>
                  <th className="text-left px-4 py-2.5 text-xs font-medium text-bx-gray-dim uppercase tracking-wider">이메일</th>
                  <th className="text-left px-4 py-2.5 text-xs font-medium text-bx-gray-dim uppercase tracking-wider hidden md:table-cell">회사</th>
                  <th className="text-left px-4 py-2.5 text-xs font-medium text-bx-gray-dim uppercase tracking-wider hidden sm:table-cell">가입일</th>
                  <th className="text-left px-4 py-2.5 text-xs font-medium text-bx-gray-dim uppercase tracking-wider hidden lg:table-cell">마지막 로그인</th>
                  <th className="text-left px-4 py-2.5 text-xs font-medium text-bx-gray-dim uppercase tracking-wider">역할</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {items.map((u) => (
                  <tr key={u.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3">
                      <div className="font-medium text-bx-black dark:text-bx-white">{u.name}</div>
                      {u.phone && <div className="text-xs text-bx-gray-dim mt-0.5">{u.phone}</div>}
                    </td>
                    <td className="px-4 py-3">
                      <div className="text-slate-700 truncate max-w-[200px]">{u.email}</div>
                      {!u.emailVerifiedAt && (
                        <span className="text-[10px] text-amber-600 font-medium">미인증</span>
                      )}
                    </td>
                    <td className="px-4 py-3 hidden md:table-cell text-bx-black/90 dark:text-bx-white/90">{u.company ?? "-"}</td>
                    <td className="px-4 py-3 hidden sm:table-cell text-bx-gray-dim text-xs">{formatDate(u.createdAt)}</td>
                    <td className="px-4 py-3 hidden lg:table-cell text-bx-gray-dim text-xs">{formatDate(u.lastLoginAt)}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <Badge className={ROLE_STYLE[u.role]}>{ROLE_LABEL[u.role]}</Badge>
                        <select
                          value={u.role}
                          onChange={(e) => changeRole(u.id, e.target.value as Role)}
                          disabled={changing === u.id}
                          className="text-xs h-7 px-2 border border-slate-200 rounded-md bg-white"
                        >
                          <option value="advertiser">광고주</option>
                          <option value="agency">대행사</option>
                          <option value="owner">매체사</option>
                          <option value="admin">관리자</option>
                        </select>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>
    </>
  );
}
