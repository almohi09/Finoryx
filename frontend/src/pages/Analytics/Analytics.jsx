import { useEffect, useState } from "react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, LineChart, Line, Legend,
} from "recharts";
import Card from "../../components/ui/Card";
import NetWorthChart from "../../components/charts/NetWorthChart";
import ExpenseBreakdown from "../../components/charts/ExpenseBreakdown";
import { formatCurrency } from "../../utils/helpers";
import { dashboardService } from "../../services/dashboard.service";
import { financeService } from "../../services/finance.service";
import { habitService } from "../../services/habit.service";

const EMPTY_MONTHS = Array.from({ length: 6 }, (_, index) => {
  const date = new Date();
  date.setMonth(date.getMonth() - (5 - index));
  return {
    month: date.toLocaleDateString("en-US", { month: "short" }),
    income: 0,
    expenses: 0,
    savings: 0,
    netWorth: 0,
    investments: 0,
  };
});

const EMPTY_HABIT_TREND = Array.from({ length: 8 }, (_, index) => ({
  week: `W${index + 1}`,
  rate: 0,
}));

const buildHabitTrend = (habits = []) => {
  const now = new Date();

  return Array.from({ length: 8 }, (_, index) => {
    const start = new Date(now);
    start.setHours(0, 0, 0, 0);
    start.setDate(now.getDate() - now.getDay() - ((7 - index) * 7) + 1);

    const end = new Date(start);
    end.setDate(start.getDate() + 6);
    end.setHours(23, 59, 59, 999);

    const completedCount = habits.filter((habit) => (
      habit.completedDates || []
    ).some((date) => {
      const completedAt = new Date(date);
      return completedAt >= start && completedAt <= end;
    })).length;

    return {
      week: `${start.toLocaleDateString("en-US", { month: "short" })} ${start.getDate()}`,
      rate: habits.length ? Math.round((completedCount / habits.length) * 100) : 0,
    };
  });
};

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="card-elevated text-sm px-3 py-2 shadow-xl">
      <p className="muted-text mb-1">{label}</p>
      {payload.map((p) => (
        <p key={p.name} style={{ color: p.color }} className="font-display font-600">
          {p.name}: {typeof p.value === "number" && p.name !== "Completion Rate"
            ? formatCurrency(p.value)
            : `${p.value}${p.name === "Completion Rate" ? "%" : ""}`}
        </p>
      ))}
    </div>
  );
};

const Analytics = () => {
  const [summary, setSummary] = useState({
    totalIncome: 0,
    totalExpense: 0,
    balance: 0,
  });
  const [wealthData, setWealthData] = useState(EMPTY_MONTHS);
  const [categoryData, setCategoryData] = useState([]);
  const [habitStats, setHabitStats] = useState({
    totalHabits: 0,
    completedToday: 0,
    completionRate: 0,
  });
  const [habitTrend, setHabitTrend] = useState(EMPTY_HABIT_TREND);

  useEffect(() => {
    const fetchAnalytics = async () => {
      const [summaryRes, wealthRes, categoriesRes, habitStatsRes, habitsRes] = await Promise.allSettled([
        financeService.getMonthlySummary(),
        dashboardService.getWealthGrowth(),
        financeService.getCategoryBreakdown(),
        habitService.getHabitStats(),
        habitService.getHabits(),
      ]);

      if (summaryRes.status === "fulfilled") {
        setSummary({
          totalIncome: summaryRes.value.data?.totalIncome || 0,
          totalExpense: summaryRes.value.data?.totalExpense || 0,
          balance: summaryRes.value.data?.balance || 0,
        });
      }

      if (wealthRes.status === "fulfilled") {
        const incoming = wealthRes.value.data?.wealthGrowth || [];
        const merged = EMPTY_MONTHS.map((month) => {
          const match = incoming.find((item) => item.month === month.month);
          return match ? { ...month, ...match } : month;
        });
        setWealthData(merged);
      }

      if (categoriesRes.status === "fulfilled") {
        const categories = categoriesRes.value.data?.categories || [];
        setCategoryData(
          categories.map((item) => ({
            name: item.category,
            value: item.amount,
          }))
        );
      }

      if (habitStatsRes.status === "fulfilled") {
        setHabitStats({
          totalHabits: habitStatsRes.value.data?.totalHabits || 0,
          completedToday: habitStatsRes.value.data?.completedToday || 0,
          completionRate: habitStatsRes.value.data?.completionRate || 0,
        });
      }

      if (habitsRes.status === "fulfilled") {
        setHabitTrend(buildHabitTrend(habitsRes.value.data?.habits || []));
      }
    };

    fetchAnalytics();
  }, []);

  const avgSavings = wealthData.length
    ? wealthData.reduce((sum, month) => sum + (month.monthlySavings || 0), 0) / wealthData.length
    : 0;
  const avgSavingRate = summary.totalIncome
    ? (summary.balance / summary.totalIncome) * 100
    : 0;
  const firstNetWorth = wealthData[0]?.netWorth || 0;
  const lastNetWorth = wealthData[wealthData.length - 1]?.netWorth || 0;
  const netWorthDelta = lastNetWorth - firstNetWorth;
  const netWorthGrowthLabel = firstNetWorth > 0
    ? `${netWorthDelta >= 0 ? "+" : ""}${(((netWorthDelta) / firstNetWorth) * 100).toFixed(1)}%`
    : netWorthDelta !== 0
      ? formatCurrency(netWorthDelta)
      : "0%";
  const netWorthGrowthSub = firstNetWorth > 0
    ? "across tracked period"
    : netWorthDelta !== 0
      ? "net worth added across tracked period"
      : "across tracked period";

  const kpis = [
    { label: "Avg Monthly Savings", value: formatCurrency(avgSavings), sub: "last 6 months", color: "text-green-400" },
    { label: "Avg Saving Rate", value: `${avgSavingRate.toFixed(1)}%`, sub: "of total income", color: "text-amber-400" },
    { label: "Net Worth Growth", value: netWorthGrowthLabel, sub: netWorthGrowthSub, color: "text-blue-400" },
    { label: "Habit Completion", value: `${habitStats.completionRate}%`, sub: `${habitStats.completedToday}/${habitStats.totalHabits} completed today`, color: "text-purple-400" },
  ];

  return (
    <div className="space-y-4 max-w-6xl mx-auto w-full">
      <div className="animate-fade-up">
        <h1 className="page-title">Analytics</h1>
        <p className="muted-text text-sm mt-1">Deep dive into your financial performance</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 animate-fade-up animate-delay-100">
        {kpis.map((k) => (
          <Card key={k.label}>
            <div className="muted-text text-xs mb-2">{k.label}</div>
            <div className={`text-2xl font-display font-800 ${k.color}`}>{k.value}</div>
            <div className="text-xs muted-text mt-1">{k.sub}</div>
          </Card>
        ))}
      </div>

      <Card className="animate-fade-up animate-delay-200">
        <h3 className="section-title mb-4">Net Worth Growth</h3>
        <NetWorthChart data={wealthData} />
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 animate-fade-up animate-delay-300">
        <Card>
          <h3 className="section-title mb-4">Income vs Expenses</h3>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={wealthData} margin={{ top: 5, right: 5, left: -10, bottom: 0 }} barSize={14}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" tick={{ fontSize: 11 }} />
              <YAxis tickFormatter={(v) => formatCurrency(v)} tick={{ fontSize: 10 }} />
              <Tooltip content={<CustomTooltip />} cursor={{ fill: "rgba(255,255,255,0.03)" }} />
              <Legend formatter={(v) => <span style={{ color: "var(--text-secondary)", fontSize: 11 }}>{v}</span>} />
              <Bar dataKey="income" name="Income" fill="#22c55e" fillOpacity={0.8} radius={[3, 3, 0, 0]} />
              <Bar dataKey="expenses" name="Expenses" fill="#f43f5e" fillOpacity={0.8} radius={[3, 3, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </Card>

        <Card>
          <h3 className="section-title mb-4">Expense Categories</h3>
          {categoryData.length > 0 ? (
            <ExpenseBreakdown data={categoryData} />
          ) : (
            <div className="text-center py-16 muted-text text-sm">No expense data yet</div>
          )}
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 animate-fade-up animate-delay-400">
        <Card>
          <h3 className="section-title mb-4">Monthly Savings Trend</h3>
          <ResponsiveContainer width="100%" height={180}>
            <LineChart data={wealthData} margin={{ top: 5, right: 5, left: -10, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" tick={{ fontSize: 11 }} />
              <YAxis tickFormatter={(v) => formatCurrency(v)} tick={{ fontSize: 10 }} />
              <Tooltip content={<CustomTooltip />} />
              <Line type="monotone" dataKey="monthlySavings" name="Savings" stroke="#f59e0b" strokeWidth={2.5} dot={{ fill: "#f59e0b", r: 4 }} activeDot={{ r: 6 }} />
            </LineChart>
          </ResponsiveContainer>
        </Card>

        <Card>
          <h3 className="section-title mb-4">Habit Completion Trend</h3>
          <ResponsiveContainer width="100%" height={180}>
            <LineChart data={habitTrend} margin={{ top: 5, right: 5, left: -10, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="week" tick={{ fontSize: 11 }} />
              <YAxis domain={[0, 100]} tickFormatter={(v) => `${v}%`} tick={{ fontSize: 10 }} />
              <Tooltip content={<CustomTooltip />} />
              <Line type="monotone" dataKey="rate" name="Completion Rate" stroke="#a78bfa" strokeWidth={2.5} dot={{ fill: "#a78bfa", r: 4 }} activeDot={{ r: 6 }} />
            </LineChart>
          </ResponsiveContainer>
          <p className="mt-3 text-xs muted-text">Weekly completion is based on the share of your habits completed at least once in each week.</p>
        </Card>
      </div>

      <Card className="animate-fade-up animate-delay-500">
        <h3 className="section-title mb-4">Monthly Breakdown</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b" style={{ borderColor: "var(--border)" }}>
                {["Month", "Income", "Expenses", "Savings", "Net Worth"].map((h) => (
                  <th key={h} className="text-left py-3 pr-6 text-xs font-display font-600 muted-text uppercase tracking-wider">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {wealthData.map((row) => (
                <tr key={row.month} className="border-b hover:bg-white/2 transition-colors" style={{ borderColor: "var(--border)" }}>
                  <td className="py-3 pr-6 font-display font-600">{row.month}</td>
                  <td className="py-3 pr-6 text-green-400">{formatCurrency(row.income || 0)}</td>
                  <td className="py-3 pr-6 text-red-400">{formatCurrency(row.expenses || 0)}</td>
                  <td className="py-3 pr-6 font-display font-600">{formatCurrency(row.monthlySavings || 0)}</td>
                  <td className="py-3 pr-6 text-blue-400">{formatCurrency(row.netWorth || 0)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
};

export default Analytics;


