import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  Wallet, TrendingUp, Target, ArrowUpRight, ArrowDownRight, Plus,
} from "lucide-react";
import { dashboardService } from "../../services/dashboard.service";
import { goalService } from "../../services/goal.service";
import { formatCurrency, formatDate, getCategoryInfo, getStreakLabel } from "../../utils/helpers";
import Card from "../../components/ui/Card";
import NetWorthChart from "../../components/charts/NetWorthChart";
import ProgressBar from "../../components/ui/ProgressBar";

const EMPTY_WEALTH = Array.from({ length: 6 }, (_, index) => {
  const date = new Date();
  date.setMonth(date.getMonth() - (5 - index));
  return {
    month: date.toLocaleDateString("en-US", { month: "short" }),
    netWorth: 0,
    savings: 0,
  };
});

const ANIMATION_DELAY_CLASSES = ["animate-delay-100", "animate-delay-200", "animate-delay-300", "animate-delay-400"];
const DASHBOARD_GOAL_COUNT = 3;

const Dashboard = () => {
  const [summary, setSummary] = useState({
    netWorth: 0,
    monthlyIncome: 0,
    monthlyExpenses: 0,
    totalSavings: 0,
  });
  const [wealthGrowth, setWealthGrowth] = useState(EMPTY_WEALTH);
  const [transactions, setTransactions] = useState([]);
  const [habits, setHabits] = useState([]);
  const [goals, setGoals] = useState([]);

  useEffect(() => {
    const fetchAll = async () => {
      const [sumRes, wealthRes, txRes, habitRes, goalRes] = await Promise.allSettled([
        dashboardService.getSummary(),
        dashboardService.getWealthGrowth(),
        dashboardService.getRecentTransactions(),
        dashboardService.getHabitOverview(),
        goalService.getGoals(),
      ]);

      if (sumRes.status === "fulfilled") {
        setSummary({
          netWorth: sumRes.value.data?.netWorth || 0,
          monthlyIncome: sumRes.value.data?.monthlyIncome || 0,
          monthlyExpenses: sumRes.value.data?.monthlyExpenses || 0,
          totalSavings: sumRes.value.data?.totalSavings || 0,
        });
      }

      if (wealthRes.status === "fulfilled") {
        const data = wealthRes.value.data?.wealthGrowth || [];
        setWealthGrowth(data.length > 0 ? data : EMPTY_WEALTH);
      }

      if (txRes.status === "fulfilled") {
        setTransactions(txRes.value.data?.transactions || []);
      }

      if (habitRes.status === "fulfilled") {
        setHabits(habitRes.value.data?.habits || []);
      }

      if (goalRes.status === "fulfilled") {
        setGoals(goalRes.value.data?.goals || []);
      }
    };

    fetchAll();
  }, []);

  const visibleGoals = goals.slice(0, DASHBOARD_GOAL_COUNT);
  const totalGoalTarget = goals.reduce((sum, goal) => sum + (goal.targetAmount || 0), 0);
  const totalGoalSaved = goals.reduce((sum, goal) => sum + (goal.currentAmount || 0), 0);
  const totalGoalProgress = totalGoalTarget > 0 ? Math.min(Math.round((totalGoalSaved / totalGoalTarget) * 100), 100) : 0;
  const savingsRate = summary.monthlyIncome > 0 ? Math.round((summary.totalSavings / summary.monthlyIncome) * 100) : 0;

  const stats = [
    {
      label: "Total Net Worth",
      value: summary.netWorth,
      detail: summary.netWorth > 0 ? "Current financial position" : "Start tracking finances to build this",
      icon: TrendingUp,
      color: "gold",
    },
    {
      label: "Monthly Income",
      value: summary.monthlyIncome,
      detail: summary.monthlyIncome > 0 ? "Tracked across your income records" : "No income records yet",
      icon: Wallet,
      color: "green",
    },
    {
      label: "Monthly Expenses",
      value: summary.monthlyExpenses,
      detail: summary.monthlyExpenses > 0 ? "Tracked across your expense records" : "No expense records yet",
      icon: ArrowDownRight,
      color: "red",
    },
    {
      label: "Total Savings",
      value: summary.totalSavings,
      detail: summary.monthlyIncome > 0 ? `${savingsRate}% savings rate` : "Income minus expenses",
      icon: Target,
      color: "blue",
    },
  ];

  const colorMap = {
    gold: "text-amber-400 bg-amber-400/10",
    green: "text-green-400 bg-green-400/10",
    blue: "text-blue-400 bg-blue-400/10",
    red: "text-red-400 bg-red-400/10",
  };

  return (
    <div className="space-y-6 max-w-7xl">
      <div className="flex items-center justify-between animate-fade-up">
        <div>
          <h1 className="page-title">Dashboard</h1>
          <p className="muted-text text-sm mt-1">Your financial snapshot at a glance</p>
        </div>
        <Link to="/finance" className="btn-primary flex items-center gap-2 text-sm">
          <Plus size={14} /> Add Transaction
        </Link>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat, i) => (
          <Card key={stat.label} className={`animate-fade-up ${ANIMATION_DELAY_CLASSES[i] || ""}`}>
            <div className="flex items-start justify-between mb-3">
              <span className="muted-text text-xs">{stat.label}</span>
              <span className={`p-2 rounded-xl ${colorMap[stat.color]}`}>
                <stat.icon size={14} />
              </span>
            </div>
            <div className="stat-value">{formatCurrency(stat.value)}</div>
            <div className="mt-1 text-xs flex items-center gap-1 muted-text">
              <ArrowUpRight size={11} />
              {stat.detail}
            </div>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 animate-fade-up animate-delay-300">
        <Card className="lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <h3 className="section-title">Wealth Growth</h3>
            <span className="badge-gold">Last 6 months</span>
          </div>
          <NetWorthChart data={wealthGrowth} />
        </Card>

        <Card>
          <div className="flex items-center justify-between mb-4">
            <h3 className="section-title">Today's Habits</h3>
            <Link to="/habits" className="text-xs gold-text hover:underline">View all</Link>
          </div>
          {habits.length === 0 ? (
            <div className="text-center py-12 muted-text text-sm">No habits yet</div>
          ) : (
            <div className="space-y-3">
              {habits.slice(0, 4).map((h) => (
                <div key={h._id} className="flex items-center gap-3 p-3 rounded-xl" style={{ background: "var(--bg-secondary)" }}>
                  <div className={`w-5 h-5 rounded-full border-2 flex-shrink-0 ${h.completedToday ? "bg-amber-400 border-amber-400" : "border-[var(--border-light)]"}`} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-display font-500 truncate">{h.name}</p>
                    <p className="text-xs muted-text">{getStreakLabel(h.streak)}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 animate-fade-up animate-delay-400">
        <Card>
          <div className="flex items-center justify-between mb-4">
            <h3 className="section-title">Recent Transactions</h3>
            <Link to="/finance" className="text-xs gold-text hover:underline">View all</Link>
          </div>
          <div className="space-y-2">
            {transactions.length === 0 ? (
              <div className="text-center py-12 muted-text text-sm">No transactions yet</div>
            ) : transactions.slice(0, 5).map((tx, i) => {
              const cat = getCategoryInfo(tx.category);
              return (
                <div key={tx._id || i} className="flex items-center gap-3 py-2.5 border-b last:border-0" style={{ borderColor: "var(--border)" }}>
                  <span className="text-lg">{cat.icon}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-display font-500 truncate">{tx.description}</p>
                    <p className="text-xs muted-text">{formatDate(tx.date || tx.createdAt)}</p>
                  </div>
                  <span className={`text-sm font-display font-700 ${tx.type === "income" ? "text-green-400" : "text-red-400"}`}>
                    {tx.type === "income" ? "+" : "-"}{formatCurrency(tx.amount)}
                  </span>
                </div>
              );
            })}
          </div>
        </Card>

        <Card>
          <div className="flex items-center justify-between mb-4">
            <h3 className="section-title">Savings Goals</h3>
            <Link to="/goals" className="text-xs gold-text hover:underline">View all</Link>
          </div>
          {goals.length === 0 ? (
            <>
              <div className="text-center py-12 muted-text text-sm">
                Create a goal to see progress here
              </div>
              <div className="mt-4">
                <ProgressBar value={0} max={100} showLabel={false} />
              </div>
            </>
          ) : (
            <>
              <div className="space-y-3">
                {visibleGoals.map((goal) => (
                  <div key={goal._id} className="p-3 rounded-xl" style={{ background: "var(--bg-secondary)" }}>
                    <div className="flex items-center justify-between gap-3 mb-2">
                      <div className="min-w-0">
                        <p className="text-sm font-display font-600 truncate">{goal.name}</p>
                        <p className="text-xs muted-text">
                          {formatCurrency(goal.currentAmount)} of {formatCurrency(goal.targetAmount)}
                        </p>
                      </div>
                      <span className="badge-gold">{goal.progress || 0}%</span>
                    </div>
                    <ProgressBar value={goal.currentAmount || 0} max={goal.targetAmount || 100} showLabel={false} />
                  </div>
                ))}
                <div className="flex items-center justify-between text-xs muted-text">
                  <span>{goals.length} active goal{goals.length > 1 ? "s" : ""}</span>
                  <span>{formatCurrency(totalGoalSaved)} saved</span>
                </div>
              </div>
              <div className="mt-4">
                <ProgressBar value={totalGoalProgress} max={100} showLabel={false} />
              </div>
            </>
          )}
        </Card>
      </div>
    </div>
  );
};

export default Dashboard;
