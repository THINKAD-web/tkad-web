"use client";

import { useCallback, useEffect, useState } from "react";
import { Spinner } from "@/components/ui/spinner";

type Stats = {
  totalIssued: number;
  totalRedeemed: number;
  totalExpired: number;
  circulatingBalance: number;
};

type UserRow = {
  id: string;
  email: string;
  name: string;
  userPoint: { balance: number; totalEarned: number; totalSpent: number } | null;
};

export default function AdminPointsClient() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [users, setUsers] = useState<UserRow[]>([]);
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(true);
  const [selectedUserId, setSelectedUserId] = useState("");
  const [adjustAmount, setAdjustAmount] = useState("");
  const [adjustDesc, setAdjustDesc] = useState("");
  const [bulkAmount, setBulkAmount] = useState("");
  const [bulkDesc, setBulkDesc] = useState("");
  const [msg, setMsg] = useState<string | null>(null);

  const load = useCallback(async (query = q) => {
    setLoading(true);
    const qs = query.trim() ? `?q=${encodeURIComponent(query.trim())}` : "";
    const res = await fetch(`/api/admin/points${qs}`, { cache: "no-store" });
    const data = await res.json();
    if (data.ok) {
      setStats(data.stats);
      setUsers(data.users);
    }
    setLoading(false);
  }, [q]);

  useEffect(() => {
    void load("");
  }, [load]);

  async function handleAdjust(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedUserId || !adjustAmount || !adjustDesc) return;
    const res = await fetch("/api/admin/points", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        userId: selectedUserId,
        amount: Number(adjustAmount),
        description: adjustDesc,
      }),
    });
    const data = await res.json();
    setMsg(data.ok ? "조정 완료" : data.error ?? "실패");
    void load();
  }

  async function handleBulk(e: React.FormEvent) {
    e.preventDefault();
    if (!bulkAmount || !bulkDesc) return;
    const res = await fetch("/api/admin/points", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "bulk",
        amount: Number(bulkAmount),
        description: bulkDesc,
      }),
    });
    const data = await res.json();
    setMsg(data.ok ? `${data.count}명 지급 완료` : data.error ?? "실패");
    void load();
  }

  return (
    <div className="space-y-8">
      {stats ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[
            ["총 발행", stats.totalIssued],
            ["총 사용", stats.totalRedeemed],
            ["총 만료", stats.totalExpired],
            ["유통 잔액", stats.circulatingBalance],
          ].map(([label, value]) => (
            <div key={label} className="rounded-xl border bg-card p-4">
              <p className="text-xs text-muted-foreground">{label}</p>
              <p className="mt-1 text-2xl font-bold tabular-nums">
                {Number(value).toLocaleString()}P
              </p>
            </div>
          ))}
        </div>
      ) : null}

      <form
        className="flex flex-wrap gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          void load(q);
        }}
      >
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="이메일·이름 검색"
          className="min-w-[200px] flex-1 rounded-lg border bg-background px-3 py-2 text-sm"
        />
        <button type="submit" className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground">
          검색
        </button>
      </form>

      {msg ? <p className="text-sm text-primary">{msg}</p> : null}

      <div className="grid gap-6 lg:grid-cols-2">
        <form onSubmit={handleAdjust} className="space-y-3 rounded-xl border p-4">
          <h2 className="font-bold">수동 적립/차감</h2>
          <select
            value={selectedUserId}
            onChange={(e) => setSelectedUserId(e.target.value)}
            className="w-full rounded-lg border bg-background px-3 py-2 text-sm"
            required
          >
            <option value="">사용자 선택</option>
            {users.map((u) => (
              <option key={u.id} value={u.id}>
                {u.name} ({u.email}) — {(u.userPoint?.balance ?? 0).toLocaleString()}P
              </option>
            ))}
          </select>
          <input
            type="number"
            value={adjustAmount}
            onChange={(e) => setAdjustAmount(e.target.value)}
            placeholder="금액 (+/-)"
            className="w-full rounded-lg border bg-background px-3 py-2 text-sm"
            required
          />
          <input
            value={adjustDesc}
            onChange={(e) => setAdjustDesc(e.target.value)}
            placeholder="사유"
            className="w-full rounded-lg border bg-background px-3 py-2 text-sm"
            required
          />
          <button type="submit" className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground">
            적용
          </button>
        </form>

        <form onSubmit={handleBulk} className="space-y-3 rounded-xl border p-4">
          <h2 className="font-bold">이벤트 일괄 지급</h2>
          <input
            type="number"
            min={1}
            value={bulkAmount}
            onChange={(e) => setBulkAmount(e.target.value)}
            placeholder="지급 포인트"
            className="w-full rounded-lg border bg-background px-3 py-2 text-sm"
            required
          />
          <input
            value={bulkDesc}
            onChange={(e) => setBulkDesc(e.target.value)}
            placeholder="이벤트명 (예: 오픈 기념)"
            className="w-full rounded-lg border bg-background px-3 py-2 text-sm"
            required
          />
          <button type="submit" className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground">
            전 회원 지급
          </button>
        </form>
      </div>

      {loading ? (
        <div className="py-12 text-center">
          <Spinner />
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-left">
              <tr>
                <th className="px-3 py-2">이름</th>
                <th className="px-3 py-2">이메일</th>
                <th className="px-3 py-2 text-right">잔액</th>
                <th className="px-3 py-2 text-right">적립</th>
                <th className="px-3 py-2 text-right">사용</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id} className="border-t">
                  <td className="px-3 py-2">{u.name}</td>
                  <td className="px-3 py-2 font-mono text-xs">{u.email}</td>
                  <td className="px-3 py-2 text-right tabular-nums">
                    {(u.userPoint?.balance ?? 0).toLocaleString()}P
                  </td>
                  <td className="px-3 py-2 text-right tabular-nums">
                    {(u.userPoint?.totalEarned ?? 0).toLocaleString()}P
                  </td>
                  <td className="px-3 py-2 text-right tabular-nums">
                    {(u.userPoint?.totalSpent ?? 0).toLocaleString()}P
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
