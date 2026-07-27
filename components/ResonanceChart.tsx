"use client";

import {
  Area,
  AreaChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { format, subDays } from "date-fns";
import type { CheckinEntry } from "@/lib/store";

export default function ResonanceChart({ checkins }: { checkins: CheckinEntry[] }) {
  const last7 = Array.from({ length: 7 }, (_, index) => {
    const current = subDays(new Date(), 6 - index);
    const date = format(current, "yyyy-MM-dd");
    const entry = checkins.find((checkin) => checkin.date === date);
    return {
      day: format(current, "EEE"),
      score: entry ? Math.round(entry.resonanceScore ?? 50) : undefined,
    };
  });
  return (
    <div className="w-full">
      <ResponsiveContainer width="100%" height={180}>
        <AreaChart
          data={last7}
          margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
        >
          <defs>
            <linearGradient id="resonanceGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#F2D461" stopOpacity={0.52} />
              <stop offset="60%" stopColor="#F2D461" stopOpacity={0.12} />
              <stop offset="100%" stopColor="#F2D461" stopOpacity={0} />
            </linearGradient>
          </defs>
          <XAxis
            dataKey="day"
            stroke="transparent"
            tick={{ fontSize: 11, fill: "#A09890" }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            domain={[0, 100]}
            stroke="transparent"
            tick={{ fontSize: 11, fill: "#A09890" }}
            axisLine={false}
            tickLine={false}
            ticks={[0, 25, 50, 75, 100]}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: "#001D21",
              border: "1px solid rgba(242,212,97,0.3)",
              borderRadius: 12,
              color: "#F5F0E8",
              fontSize: 12,
              padding: "8px 12px",
            }}
            cursor={{ stroke: "#F2D461", strokeOpacity: 0.2, strokeWidth: 1 }}
            formatter={(value) => [`${value}`, "Resonance"]}
          />
          <Area
            type="monotone"
            dataKey="score"
            stroke="#F2D461"
            strokeWidth={2}
            fill="url(#resonanceGrad)"
            dot={{ fill: "#F2D461", r: 4, strokeWidth: 0 }}
            activeDot={{
              fill: "#F5F0E8",
              r: 5,
              strokeWidth: 0,
              filter: "drop-shadow(0 0 6px #F2D461)",
            }}
            connectNulls
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
