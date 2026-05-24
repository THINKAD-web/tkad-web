"use client";

import {
  Cell,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { InquiryTypeSlice, WeeklyInquiryPoint } from "@/lib/admin-dashboard-data";

const PIE_COLORS = ["#a855f7", "#22d3ee", "#ec4899", "#f59e0b", "#94a3b8"];

type Props = {
  weeklyInquiries: WeeklyInquiryPoint[];
  inquiriesByType: InquiryTypeSlice[];
};

export function AdminDashboardCharts({
  weeklyInquiries,
  inquiriesByType,
}: Props) {
  const pieData = inquiriesByType.filter((d) => d.count > 0);

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
      <div className="rounded-2xl border border-border/60 bg-card/50 p-4 backdrop-blur">
        <p className="font-display text-xs font-medium uppercase tracking-[0.2em] text-muted-foreground">
          [ 최근 4주 문의 추이 ]
        </p>
        <div className="mt-4 h-56 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={weeklyInquiries}>
              <XAxis
                dataKey="label"
                tick={{ fill: "currentColor", fontSize: 11 }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                allowDecimals={false}
                tick={{ fill: "currentColor", fontSize: 11 }}
                axisLine={false}
                tickLine={false}
                width={28}
              />
              <Tooltip
                contentStyle={{
                  background: "rgba(0,0,0,0.85)",
                  border: "1px solid rgba(255,255,255,0.12)",
                  borderRadius: 12,
                  fontSize: 12,
                }}
              />
              <Line
                type="monotone"
                dataKey="count"
                name="문의"
                stroke="#22d3ee"
                strokeWidth={2.5}
                dot={{ r: 4, fill: "#a855f7" }}
                activeDot={{ r: 6 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="rounded-2xl border border-border/60 bg-card/50 p-4 backdrop-blur">
        <p className="font-display text-xs font-medium uppercase tracking-[0.2em] text-muted-foreground">
          [ 문의 유형별 ]
        </p>
        <div className="mt-4 flex h-56 flex-col items-center sm:flex-row sm:gap-4">
          {pieData.length === 0 ? (
            <p className="flex flex-1 items-center justify-center text-xs text-muted-foreground">
              {`// `}최근 문의 데이터 없음
            </p>
          ) : (
            <>
              <div className="h-48 w-full flex-1">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={pieData}
                      dataKey="count"
                      nameKey="label"
                      cx="50%"
                      cy="50%"
                      innerRadius={44}
                      outerRadius={72}
                      paddingAngle={2}
                    >
                      {pieData.map((_, i) => (
                        <Cell
                          key={i}
                          fill={PIE_COLORS[i % PIE_COLORS.length]}
                        />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{
                        background: "rgba(0,0,0,0.85)",
                        border: "1px solid rgba(255,255,255,0.12)",
                        borderRadius: 12,
                        fontSize: 12,
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <ul className="w-full shrink-0 space-y-1.5 sm:w-36">
                {pieData.map((d, i) => (
                  <li
                    key={d.type}
                    className="flex items-center justify-between gap-2 text-xs"
                  >
                    <span className="flex min-w-0 items-center gap-2">
                      <span
                        className="h-2 w-2 shrink-0 rounded-full"
                        style={{
                          background: PIE_COLORS[i % PIE_COLORS.length],
                        }}
                      />
                      <span className="truncate">{d.label}</span>
                    </span>
                    <span className="font-display font-bold tabular-nums">
                      {d.count}
                    </span>
                  </li>
                ))}
              </ul>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
