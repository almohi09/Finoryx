import { useEffect, useState } from "react";
import {
  Plus,
  Trash2,
  Pencil,
  ArrowUpRight,
  ArrowDownRight,
  Wallet,
  Sparkles,
  Receipt,
  CalendarDays,
} from "lucide-react";
import { financeService } from "../../services/finance.service";
import { formatCurrency, formatDate, getCategoryInfo, getIncomeSourceInfo } from "../../utils/helpers";
import { EXPENSE_CATEGORIES } from "../../constants";
import Card from "../../components/ui/Card";
import Button from "../../components/ui/Button";
import Input from "../../components/ui/Input";
import Select from "../../components/ui/Select";
import Modal from "../../components/ui/Modal";
import ExpenseBreakdown from "../../components/charts/ExpenseBreakdown";
import toast from "react-hot-toast";

const tabs = ["All", "Income", "Expenses"];
const today = () => new Date().toISOString().split("T")[0];

const overviewCards = [
  { key: "income", label: "Income Flow", icon: ArrowUpRight, accent: "text-emerald-300", surface: "from-emerald-500/18 via-emerald-500/6 to-transparent" },
  { key: "expense", label: "Expense Load", icon: ArrowDownRight, accent: "text-rose-300", surface: "from-rose-500/18 via-rose-500/6 to-transparent" },
  { key: "balance", label: "Available Balance", icon: Wallet, accent: "text-amber-300", surface: "from-amber-500/18 via-amber-500/6 to-transparent" },
];

const getDefaultForm = (type = "expense", item = null) => {
  if (type === "income") {
    return {
      amount: item?.amount || "",
      source: item?.source || "",
      date: item?.date ? item.date.split("T")[0] : today(),
      notes: item?.notes || "",
    };
  }

  return {
    description: item?.description || "",
    amount: item?.amount || "",
    category: item?.category || "food",
    date: item?.date ? item.date.split("T")[0] : today(),
    notes: item?.notes || "",
  };
};

const Finance = () => {
  const [activeTab, setActiveTab] = useState("All");
  const [incomes, setIncomes] = useState([]);
  const [expenses, setExpenses] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [modalType, setModalType] = useState("expense");
  const [editItem, setEditItem] = useState(null);
  const [form, setForm] = useState(getDefaultForm());
  const [saving, setSaving] = useState(false);

  const fetchData = async () => {
    try {
      const [incRes, expRes] = await Promise.allSettled([
        financeService.getIncomes(),
        financeService.getExpenses(),
      ]);
      if (incRes.status === "fulfilled") setIncomes(incRes.value.data?.incomes || []);
      if (expRes.status === "fulfilled") setExpenses(expRes.value.data?.expenses || []);
    } catch {
      setIncomes([]);
      setExpenses([]);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const openAdd = (type) => {
    setModalType(type);
    setEditItem(null);
    setForm(getDefaultForm(type));
    setShowModal(true);
  };

  const openEdit = (item, type) => {
    setModalType(type);
    setEditItem(item);
    setForm(getDefaultForm(type, item));
    setShowModal(true);
  };

  const handleSave = async () => {
    if (modalType === "expense" && !form.description.trim()) return toast.error("Description is required");
    if (modalType === "income" && !form.source) return toast.error("Income source is required");
    if (!form.amount) return toast.error("Amount is required");

    setSaving(true);
    try {
      if (modalType === "expense") {
        if (editItem) await financeService.updateExpense(editItem._id, form);
        else await financeService.addExpense(form);
      } else {
        const incomePayload = {
          amount: form.amount,
          date: form.date,
          notes: form.notes,
          source: form.source.trim(),
        };
        if (editItem) await financeService.updateIncome(editItem._id, incomePayload);
        else await financeService.addIncome(incomePayload);
      }

      toast.success(editItem ? "Updated!" : "Added successfully!");
      setShowModal(false);
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to save transaction");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id, type) => {
    if (!confirm("Delete this record?")) return;
    try {
      if (type === "expense") await financeService.deleteExpense(id);
      else await financeService.deleteIncome(id);
      toast.success("Deleted");
      fetchData();
    } catch {
      toast.error("Failed to delete");
    }
  };

  const allTx = [
    ...incomes.map((item) => ({ ...item, type: "income" })),
    ...expenses.map((item) => ({ ...item, type: "expense" })),
  ].sort((a, b) => new Date(b.date || b.createdAt) - new Date(a.date || a.createdAt));

  const displayed = activeTab === "All"
    ? allTx
    : activeTab === "Income"
      ? allTx.filter((tx) => tx.type === "income")
      : allTx.filter((tx) => tx.type === "expense");

  const totalIncome = incomes.reduce((sum, item) => sum + (item.amount || 0), 0);
  const totalExpense = expenses.reduce((sum, item) => sum + (item.amount || 0), 0);
  const balance = totalIncome - totalExpense;
  const categoryData = EXPENSE_CATEGORIES.map((cat) => ({
    name: cat.label,
    value: expenses.filter((item) => item.category === cat.value).reduce((sum, item) => sum + (item.amount || 0), 0),
  })).filter((item) => item.value > 0);
  const savingsRate = totalIncome > 0 ? Math.max(0, Math.round((balance / totalIncome) * 100)) : 0;
  const transactionCount = allTx.length;
  const latestTransaction = allTx[0] || null;
  const topExpenseCategory = categoryData.slice().sort((a, b) => b.value - a.value)[0] || null;
  const avgTransaction = transactionCount > 0 ? allTx.reduce((sum, item) => sum + (item.amount || 0), 0) / transactionCount : 0;
  const netTone = balance >= 0 ? "text-emerald-300" : "text-rose-300";
  const trendTone = balance >= 0
    ? "bg-emerald-500/12 text-emerald-300 border-emerald-500/20"
    : "bg-rose-500/12 text-rose-300 border-rose-500/20";
  const modalAccent = modalType === "income"
    ? {
        badge: "bg-emerald-500/12 text-emerald-300 border-emerald-500/20",
        iconWrap: "bg-emerald-500/12 text-emerald-300",
        title: "Income entry",
        description: "Log money coming in with only the fields needed for quick bookkeeping.",
      }
    : {
        badge: "bg-rose-500/12 text-rose-300 border-rose-500/20",
        iconWrap: "bg-rose-500/12 text-rose-300",
        title: "Expense entry",
        description: "Capture spending clearly so category insights and balance stay accurate.",
      };
  const summaryValues = {
    income: totalIncome,
    expense: totalExpense,
    balance,
  };

  return (
    <div className="space-y-6 max-w-7xl">
      <div className="grid grid-cols-1 xl:grid-cols-[1.35fr_0.9fr] gap-5 animate-fade-up items-start">
        <Card className="relative overflow-hidden p-0">
          <div
            className="absolute inset-0 opacity-90"
            style={{
              background:
                "radial-gradient(circle at top left, rgba(245, 158, 11, 0.18), transparent 34%), radial-gradient(circle at 78% 22%, rgba(96, 165, 250, 0.18), transparent 26%), linear-gradient(135deg, rgba(255,255,255,0.03), rgba(255,255,255,0))",
            }}
          />
          <div className="relative p-5 md:p-6">
            <div className="flex items-start justify-between gap-4">
              <div className="max-w-2xl">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border text-xs font-display font-600 tracking-[0.18em] uppercase text-amber-300 bg-amber-400/10 border-amber-400/15">
                  <Sparkles size={12} />
                  Financial command center
                </div>
                <h1 className="page-title mt-3">Finance</h1>
                <p className="muted-text text-sm md:text-[15px] mt-2 leading-6 max-w-xl">
                  Track cash flow, spot spending pressure quickly, and keep your monthly balance easy to read.
                </p>
              </div>
              <div className={`hidden md:flex items-center gap-2 px-3 py-2 rounded-2xl border text-sm font-display font-700 ${trendTone}`}>
                {balance >= 0 ? <ArrowUpRight size={16} /> : <ArrowDownRight size={16} />}
                {balance >= 0 ? "Healthy cash flow" : "Spending pressure"}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-5">
              {overviewCards.map((item, index) => {
                const Icon = item.icon;
                return (
                  <div
                    key={item.key}
                    className={`rounded-2xl border p-4 animate-fade-up animate-delay-${(index + 1) * 100} bg-gradient-to-br ${item.surface}`}
                    style={{ borderColor: "var(--border-light)" }}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-xs uppercase tracking-[0.18em] muted-text font-display font-600">
                        {item.label}
                      </span>
                      <span className={`p-2 rounded-xl bg-white/5 ${item.accent}`}>
                        <Icon size={15} />
                      </span>
                    </div>
                    <div className={`text-2xl md:text-[2rem] font-display font-800 mt-3 ${item.accent}`}>
                      {formatCurrency(summaryValues[item.key])}
                    </div>
                    <p className="text-xs muted-text mt-2">
                      {item.key === "income" && `${incomes.length} income record${incomes.length !== 1 ? "s" : ""}`}
                      {item.key === "expense" && `${expenses.length} expense record${expenses.length !== 1 ? "s" : ""}`}
                      {item.key === "balance" && `${savingsRate}% savings rate from tracked income`}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>
        </Card>

        <Card className="overflow-hidden self-start">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-xs uppercase tracking-[0.18em] muted-text font-display font-600">This month</p>
              <h3 className="section-title mt-2">Quick read</h3>
            </div>
            <span className="p-2 rounded-xl bg-white/5 text-sky-300">
              <CalendarDays size={15} />
            </span>
          </div>

          <div className="space-y-3 mt-4">
            <div className="rounded-2xl p-4 border" style={{ background: "var(--bg-secondary)", borderColor: "var(--border)" }}>
              <p className="text-xs uppercase tracking-[0.18em] muted-text font-display font-600">Net position</p>
              <div className={`text-3xl font-display font-800 mt-3 ${netTone}`}>{formatCurrency(balance)}</div>
              <p className="text-xs muted-text mt-2">
                {balance >= 0
                  ? "Income is covering expenses with room left over."
                  : "Expenses are higher than income. Review recent spending."}
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-2xl p-3.5 border" style={{ background: "var(--bg-secondary)", borderColor: "var(--border)" }}>
                <p className="text-xs uppercase tracking-[0.14em] muted-text font-display font-600">Transactions</p>
                <div className="text-xl font-display font-800 mt-2">{transactionCount}</div>
                <p className="text-xs muted-text mt-1">Average {formatCurrency(avgTransaction)}</p>
              </div>
              <div className="rounded-2xl p-3.5 border" style={{ background: "var(--bg-secondary)", borderColor: "var(--border)" }}>
                <p className="text-xs uppercase tracking-[0.14em] muted-text font-display font-600">Top category</p>
                <div className="text-lg font-display font-800 mt-2 truncate">{topExpenseCategory?.name || "No data"}</div>
                <p className="text-xs muted-text mt-1">
                  {topExpenseCategory ? formatCurrency(topExpenseCategory.value) : "Track expenses to see this"}
                </p>
              </div>
            </div>

            <div className="rounded-2xl p-3.5 border" style={{ background: "var(--bg-secondary)", borderColor: "var(--border)" }}>
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-xs uppercase tracking-[0.18em] muted-text font-display font-600">Latest activity</p>
                  <p className="text-sm font-display font-700 mt-2">
                    {latestTransaction
                      ? latestTransaction.type === "income"
                        ? latestTransaction.source
                        : latestTransaction.description
                      : "No transactions yet"}
                  </p>
                </div>
                <span className="p-2 rounded-xl bg-white/5 text-amber-300">
                  <Receipt size={15} />
                </span>
              </div>
              <p className="text-xs muted-text mt-2">
                {latestTransaction
                  ? `${formatDate(latestTransaction.date || latestTransaction.createdAt)} | ${latestTransaction.type === "income" ? "Income" : "Expense"}`
                  : "Add income or expense records to populate this timeline."}
              </p>
            </div>
          </div>
        </Card>
      </div>

      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 animate-fade-up animate-delay-100">
        <div>
          <p className="text-xs uppercase tracking-[0.18em] muted-text font-display font-600">Actions</p>
          <p className="muted-text text-sm mt-1">Log income fast or capture new spending before you forget it.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="ghost" size="sm" className="min-w-[9rem]" onClick={() => openAdd("expense")}>
            <Plus size={13} /> Add Expense
          </Button>
          <Button size="sm" className="min-w-[9rem]" onClick={() => openAdd("income")}>
            <Plus size={13} /> Add Income
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-[0.95fr_1.45fr] gap-5 animate-fade-up animate-delay-200 items-start">
        <Card className="overflow-hidden self-start">
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-xs uppercase tracking-[0.18em] muted-text font-display font-600">Analysis</p>
              <h3 className="section-title mt-2">Expense Breakdown</h3>
            </div>
            <span className="badge-gold">{categoryData.length} categories</span>
          </div>
          {categoryData.length > 0 ? (
            <>
              <ExpenseBreakdown data={categoryData} />
              <div className="space-y-2 mt-3">
                {categoryData
                  .slice()
                  .sort((a, b) => b.value - a.value)
                  .slice(0, 4)
                  .map((item) => {
                    const percentage = totalExpense > 0 ? Math.round((item.value / totalExpense) * 100) : 0;
                    return (
                      <div key={item.name} className="rounded-2xl p-3 border" style={{ background: "var(--bg-secondary)", borderColor: "var(--border)" }}>
                        <div className="flex items-center justify-between gap-3">
                          <div className="min-w-0">
                            <p className="text-sm font-display font-700 truncate">{item.name}</p>
                            <p className="text-xs muted-text mt-1">{percentage}% of total expenses</p>
                          </div>
                          <div className="text-right shrink-0">
                            <div className="text-sm font-display font-700">{formatCurrency(item.value)}</div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
              </div>
            </>
          ) : (
            <div className="text-center py-12 muted-text text-sm">No expense data yet</div>
          )}
        </Card>

        <Card className="overflow-hidden">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-4">
            <div>
              <p className="text-xs uppercase tracking-[0.18em] muted-text font-display font-600">Ledger</p>
              <h3 className="section-title mt-2">Transaction Flow</h3>
            </div>
            <div className="flex gap-1 p-1 rounded-xl w-fit" style={{ background: "var(--bg-secondary)" }}>
              {tabs.map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`px-4 py-1.5 rounded-lg text-sm font-display font-500 transition-all ${activeTab === tab ? "text-[var(--bg-primary)]" : "muted-text hover:text-white"}`}
                  style={{ background: activeTab === tab ? "var(--accent-gold)" : "transparent" }}
                >
                  {tab}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-5">
            <div className="rounded-2xl border p-3.5" style={{ background: "var(--bg-secondary)", borderColor: "var(--border)" }}>
              <p className="text-xs uppercase tracking-[0.16em] muted-text font-display font-600">Income records</p>
              <div className="text-lg font-display font-800 text-emerald-300 mt-2">{incomes.length}</div>
              <p className="text-xs muted-text mt-1">Tracked inflows</p>
            </div>
            <div className="rounded-2xl border p-3.5" style={{ background: "var(--bg-secondary)", borderColor: "var(--border)" }}>
              <p className="text-xs uppercase tracking-[0.16em] muted-text font-display font-600">Expense records</p>
              <div className="text-lg font-display font-800 text-rose-300 mt-2">{expenses.length}</div>
              <p className="text-xs muted-text mt-1">Tracked outflows</p>
            </div>
            <div className="rounded-2xl border p-3.5" style={{ background: "var(--bg-secondary)", borderColor: "var(--border)" }}>
              <p className="text-xs uppercase tracking-[0.16em] muted-text font-display font-600">Filter view</p>
              <div className="text-lg font-display font-800 text-amber-300 mt-2">{activeTab}</div>
              <p className="text-xs muted-text mt-1">Current ledger slice</p>
            </div>
          </div>

          <div className="grid gap-3 max-h-[36rem] overflow-y-auto pr-1">
            {displayed.length === 0 ? (
              <div className="text-center py-12 muted-text text-sm">No transactions yet</div>
            ) : displayed.map((tx) => {
              const categoryInfo = tx.type === "income"
                ? getIncomeSourceInfo(tx.source)
                : getCategoryInfo(tx.category);
              const detailLabel = tx.type === "income" ? categoryInfo.label : tx.description;
              const metaLabel = tx.type === "income" ? "Income" : categoryInfo.label;
              const txDate = formatDate(tx.date || tx.createdAt);
              const badgeClass = tx.type === "income" ? "badge-green" : "badge-red";
              const iconClass = tx.type === "income"
                ? "bg-emerald-500/12 text-emerald-300"
                : "bg-rose-500/12 text-rose-300";
              const amountClass = tx.type === "income" ? "text-emerald-300" : "text-rose-300";

              return (
                <div
                  key={tx._id}
                  className="group rounded-[1.35rem] border overflow-hidden transition-all hover:-translate-y-[1px]"
                  style={{
                    background:
                      tx.type === "income"
                        ? "linear-gradient(135deg, rgba(34,197,94,0.08), rgba(255,255,255,0.02) 35%, rgba(255,255,255,0.01))"
                        : "linear-gradient(135deg, rgba(244,63,94,0.08), rgba(255,255,255,0.02) 35%, rgba(255,255,255,0.01))",
                    borderColor: "var(--border)",
                  }}
                >
                  <div className="px-4 py-2.5 border-b flex items-center justify-between gap-3" style={{ borderColor: "rgba(255,255,255,0.06)" }}>
                    <div className="flex items-center gap-2">
                      <span className={badgeClass}>{tx.type === "income" ? "Income" : "Expense"}</span>
                      <span className="text-xs muted-text">{txDate}</span>
                    </div>
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button onClick={() => openEdit(tx, tx.type)} className="p-1.5 rounded-lg hover:bg-white/5 muted-text hover:text-white transition-colors">
                        <Pencil size={13} />
                      </button>
                      <button onClick={() => handleDelete(tx._id, tx.type)} className="p-1.5 rounded-lg hover:bg-red-500/10 text-red-400 transition-colors">
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>

                  <div className="p-4">
                    <div className="flex items-start gap-4">
                      <div className={`w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0 ${iconClass}`}>
                        <span className="text-lg">{categoryInfo.icon}</span>
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-3">
                          <div className="min-w-0">
                            <p className="text-base font-display font-700 truncate">{detailLabel}</p>
                            <p className="text-xs uppercase tracking-[0.16em] muted-text mt-1">{metaLabel}</p>
                            {tx.notes ? <p className="text-sm muted-text mt-3 leading-6">{tx.notes}</p> : null}
                          </div>

                          <div className="md:text-right shrink-0">
                            <div className={`text-xl font-display font-800 ${amountClass}`}>
                              {tx.type === "income" ? "+" : "-"}{formatCurrency(tx.amount)}
                            </div>
                            <p className="text-xs muted-text mt-1">
                              {tx.type === "income" ? "Added to cash flow" : "Reduced cash flow"}
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      </div>

      <Modal isOpen={showModal} onClose={() => setShowModal(false)} title={`${editItem ? "Edit" : "Add"} ${modalType === "income" ? "Income" : "Expense"}`} size="lg">
        <div className="grid grid-cols-1 lg:grid-cols-[0.8fr_1.2fr] gap-5">
          <div className="rounded-2xl border p-4 md:p-5 self-start" style={{ background: "var(--bg-secondary)", borderColor: "var(--border)" }}>
            <div className={`w-11 h-11 rounded-2xl flex items-center justify-center ${modalAccent.iconWrap}`}>
              {modalType === "income" ? <ArrowUpRight size={18} /> : <ArrowDownRight size={18} />}
            </div>
            <div className={`inline-flex mt-4 px-3 py-1 rounded-full border text-[11px] uppercase tracking-[0.16em] font-display font-700 ${modalAccent.badge}`}>
              {editItem ? "Edit mode" : "New entry"}
            </div>
            <h4 className="font-display font-800 text-xl mt-4">{modalAccent.title}</h4>
            <p className="text-sm muted-text leading-6 mt-2">{modalAccent.description}</p>

            <div className="space-y-3 mt-5">
              <div className="rounded-2xl p-3.5 border" style={{ background: "rgba(255,255,255,0.02)", borderColor: "var(--border)" }}>
                <p className="text-xs uppercase tracking-[0.16em] muted-text font-display font-600">Preview amount</p>
                <div className="text-2xl font-display font-800 mt-2">{formatCurrency(form.amount || 0)}</div>
              </div>
              <div className="rounded-2xl p-3.5 border" style={{ background: "rgba(255,255,255,0.02)", borderColor: "var(--border)" }}>
                <p className="text-xs uppercase tracking-[0.16em] muted-text font-display font-600">Classification</p>
                <div className="text-sm font-display font-700 mt-2">
                  {modalType === "income"
                    ? form.source?.trim() || "Income source pending"
                    : EXPENSE_CATEGORIES.find((item) => item.value === form.category)?.label || "Expense category"}
                </div>
                <p className="text-xs muted-text mt-1">{form.date ? formatDate(form.date) : "Choose a date"}</p>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            {modalType === "expense" ? (
              <Input
                label="Description"
                placeholder="e.g. Grocery, Rent, Electricity Bill"
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
              />
            ) : (
              <Input
                label="Income Source"
                placeholder="e.g. Salary, Freelance, Rental Income"
                value={form.source}
                onChange={(e) => setForm({ ...form, source: e.target.value })}
              />
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input label="Amount (INR)" type="number" placeholder="0.00" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} />
              <Input label="Date" type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} />
            </div>

            {modalType === "expense" ? (
              <Select
                label="Category"
                value={form.category}
                onChange={(e) => setForm({ ...form, category: e.target.value })}
                options={EXPENSE_CATEGORIES}
              />
            ) : null}

            <div>
              <label className="label">Notes</label>
              <textarea
                rows={4}
                placeholder="Optional context for this entry"
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
                className="input-field resize-none"
              />
            </div>

            <div className="flex gap-3 pt-2">
              <Button variant="ghost" className="flex-1" onClick={() => setShowModal(false)}>Cancel</Button>
              <Button className="flex-1" loading={saving} onClick={handleSave}>{editItem ? "Update Entry" : "Save Entry"}</Button>
            </div>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default Finance;
