"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Activity } from "lucide-react";

interface WeeklyActivityData {
  day: string;
  lessons: number;
}

export function WeeklyActivityChart({ data }: { data: WeeklyActivityData[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Activity className="h-4 w-4" />
          今週の学習
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={180}>
          <BarChart data={data}>
            <XAxis dataKey="day" fontSize={12} tickLine={false} />
            <YAxis fontSize={12} tickLine={false} allowDecimals={false} />
            <Tooltip
              formatter={(value) => [`${value} レッスン`, "完了数"]}
              labelFormatter={(label) => `${label}`}
            />
            <Bar dataKey="lessons" fill="#2563eb" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
