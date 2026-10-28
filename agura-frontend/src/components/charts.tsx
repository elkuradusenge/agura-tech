/**
 * Recharts wrappers. Series colours come from the tokens, read at render time and
 * recomputed when the theme changes, so a chart never hardcodes a colour.
 */

import { useMemo } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { usePreferences } from "../app/providers";
import { chartAxisColor, chartGridColor, chartPalette } from "../styles/tokens";
import { formatPercent } from "../lib/utils";

export interface SeriesPoint {
  label: string;
  value: number | null;
}

function useChartTheme() {
  const { theme } = usePreferences();
  return useMemo(
    () => ({
      series: chartPalette(6),
      grid: chartGridColor(),
      axis: chartAxisColor(),
    }),
    // The theme class is applied to <html>, so the tokens change with it.
    [theme],
  );
}

function Empty() {
  return <p className="muted p-4 text-sm">-</p>;
}

/** A horizontal bar chart for ranked shares. Null values are dropped, not zeroed. */
export function ShareBarChart({
  data,
  height = 260,
  percent = true,
}: {
  data: SeriesPoint[];
  height?: number;
  percent?: boolean;
}) {
  const { axis } = useChartTheme();
  const rows = data.filter((point) => point.value !== null);
  if (!rows.length) return <Empty />;

  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={rows} layout="vertical" margin={{ left: 8, right: 16, top: 4, bottom: 4 }}>
        <CartesianGrid className="chart-grid" strokeDasharray="3 3" horizontal={false} />
        <XAxis
          type="number"
          className="chart-axis"
          tick={{ fontSize: 12, fill: axis }}
          tickFormatter={(value: number) => (percent ? formatPercent(value, 0) : String(value))}
        />
        <YAxis type="category" dataKey="label" width={110} className="chart-axis" tick={{ fontSize: 12, fill: axis }} />
        <Tooltip
          formatter={(value: number) => (percent ? formatPercent(value) : value)}
          contentStyle={{ borderRadius: 12, borderColor: "var(--line)", background: "var(--surface)" }}
        />
        <Bar dataKey="value" radius={[0, 6, 6, 0]}>
          {rows.map((row, index) => (
            <Cell key={row.label} className={`chart-series-${(index % 6) + 1}`} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

export function TrendLineChart({ data, height = 240 }: { data: SeriesPoint[]; height?: number }) {
  const { axis } = useChartTheme();
  if (!data.length) return <Empty />;
  return (
    <ResponsiveContainer width="100%" height={height}>
      <LineChart data={data} margin={{ left: 0, right: 16, top: 8, bottom: 4 }}>
        <CartesianGrid className="chart-grid" strokeDasharray="3 3" />
        <XAxis dataKey="label" tick={{ fontSize: 12, fill: axis }} className="chart-axis" />
        <YAxis tick={{ fontSize: 12, fill: axis }} allowDecimals={false} className="chart-axis" />
        <Tooltip contentStyle={{ borderRadius: 12, borderColor: "var(--line)", background: "var(--surface)" }} />
        <Line type="monotone" dataKey="value" strokeWidth={2} dot={false} className="chart-series-1" />
      </LineChart>
    </ResponsiveContainer>
  );
}

export function FunnelBarChart({ data, height = 260 }: { data: SeriesPoint[]; height?: number }) {
  const { axis } = useChartTheme();
  if (!data.length) return <Empty />;
  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data} margin={{ left: 0, right: 16, top: 8, bottom: 4 }}>
        <CartesianGrid className="chart-grid" strokeDasharray="3 3" vertical={false} />
        <XAxis dataKey="label" tick={{ fontSize: 12, fill: axis }} className="chart-axis" />
        <YAxis tick={{ fontSize: 12, fill: axis }} allowDecimals={false} className="chart-axis" />
        <Tooltip contentStyle={{ borderRadius: 12, borderColor: "var(--line)", background: "var(--surface)" }} />
        <Bar dataKey="value" radius={[6, 6, 0, 0]} className="chart-series-1" />
      </BarChart>
    </ResponsiveContainer>
  );
}

export function CompositionPieChart({ data, height = 240 }: { data: SeriesPoint[]; height?: number }) {
  const rows = data.filter((point) => point.value !== null && point.value > 0);
  if (!rows.length) return <Empty />;
  return (
    <ResponsiveContainer width="100%" height={height}>
      <PieChart>
        <Pie data={rows} dataKey="value" nameKey="label" outerRadius={80} label className="chart-axis">
          {rows.map((row, index) => (
            <Cell key={row.label} className={`chart-series-${(index % 6) + 1}`} />
          ))}
        </Pie>
        <Tooltip
          formatter={(value: number) => formatPercent(value)}
          contentStyle={{ borderRadius: 12, borderColor: "var(--line)", background: "var(--surface)" }}
        />
        <Legend />
      </PieChart>
    </ResponsiveContainer>
  );
}
