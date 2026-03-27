import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from "recharts";
import { formatCurrency } from "../../utils/helpers";

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="card-elevated text-sm px-4 py-3 shadow-xl">
      <p className="muted-text mb-1">{label}</p>
      {payload.map((p) => (
        <p key={p.name} style={{ color: p.color }} className="font-display font-600">
          {p.name}: {formatCurrency(p.value)}
        </p>
      ))}
    </div>
  );
};

const NetWorthChart = ({ data = [] }) => {
  return (
    <ResponsiveContainer width="100%" height={220}>
      <AreaChart data={data} margin={{ top: 5, right: 5, left: -10, bottom: 0 }}>
        <defs>
          <linearGradient id="netWorthGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.25} />
            <stop offset="95%" stopColor="#f59e0b" stopOpacity={0} />
          </linearGradient>
          <linearGradient id="savingsGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#22c55e" stopOpacity={0.2} />
            <stop offset="95%" stopColor="#22c55e" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="month" tick={{ fontSize: 11 }} />
        <YAxis tickFormatter={(v) => formatCurrency(v)} tick={{ fontSize: 10 }} />
        <Tooltip content={<CustomTooltip />} />
        <Area
          type="monotone"
          dataKey="netWorth"
          name="Net Worth"
          stroke="#f59e0b"
          strokeWidth={2}
          fill="url(#netWorthGrad)"
          dot={false}
          activeDot={{ r: 4, fill: "#f59e0b" }}
        />
        <Area
          type="monotone"
          dataKey="savings"
          name="Savings"
          stroke="#22c55e"
          strokeWidth={2}
          fill="url(#savingsGrad)"
          dot={false}
          activeDot={{ r: 4, fill: "#22c55e" }}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
};

export default NetWorthChart;
