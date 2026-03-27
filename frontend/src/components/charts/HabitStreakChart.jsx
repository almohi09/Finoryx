import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell,
} from "recharts";

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="card-elevated text-sm px-3 py-2 shadow-xl">
      <p className="muted-text">{label}</p>
      <p className="font-display font-600 text-amber-400">{payload[0].value} completed</p>
    </div>
  );
};

const HabitStreakChart = ({ data = [] }) => {
  const max = Math.max(...data.map((d) => d.completed || 0), 1);

  return (
    <ResponsiveContainer width="100%" height={150}>
      <BarChart data={data} margin={{ top: 5, right: 5, left: -25, bottom: 0 }} barSize={12}>
        <XAxis dataKey="day" tick={{ fontSize: 10 }} />
        <YAxis allowDecimals={false} tick={{ fontSize: 10 }} />
        <Tooltip content={<CustomTooltip />} cursor={{ fill: "rgba(255,255,255,0.03)" }} />
        <Bar dataKey="completed" radius={[3, 3, 0, 0]}>
          {data.map((entry, index) => (
            <Cell
              key={index}
              fill={entry.completed > 0 ? "#f59e0b" : "var(--border-light)"}
              fillOpacity={0.4 + (entry.completed / max) * 0.6}
            />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
};

export default HabitStreakChart;
