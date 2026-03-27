import {
  PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend,
} from "recharts";
import { formatCurrency } from "../../utils/helpers";

const COLORS = ["#f59e0b", "#22c55e", "#60a5fa", "#a78bfa", "#fb7185", "#34d399", "#fbbf24", "#f472b6", "#38bdf8", "#94a3b8"];

const CustomTooltip = ({ active, payload }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="card-elevated text-sm px-3 py-2 shadow-xl">
      <p className="font-display font-600">{payload[0].name}</p>
      <p style={{ color: payload[0].payload.fill }}>{formatCurrency(payload[0].value)}</p>
      <p className="muted-text text-xs">{payload[0].payload.percent?.toFixed(1)}%</p>
    </div>
  );
};

const ExpenseBreakdown = ({ data = [] }) => {
  const total = data.reduce((s, d) => s + d.value, 0);
  const enriched = data.map((d) => ({ ...d, percent: total ? (d.value / total) * 100 : 0 }));

  return (
    <ResponsiveContainer width="100%" height={220}>
      <PieChart>
        <Pie
          data={enriched}
          cx="50%"
          cy="50%"
          innerRadius={55}
          outerRadius={85}
          paddingAngle={3}
          dataKey="value"
        >
          {enriched.map((entry, index) => (
            <Cell key={entry.name} fill={COLORS[index % COLORS.length]} />
          ))}
        </Pie>
        <Tooltip content={<CustomTooltip />} />
        <Legend
          formatter={(value) => (
            <span style={{ color: "var(--text-secondary)", fontSize: 11 }}>{value}</span>
          )}
          iconSize={8}
          iconType="circle"
        />
      </PieChart>
    </ResponsiveContainer>
  );
};

export default ExpenseBreakdown;
