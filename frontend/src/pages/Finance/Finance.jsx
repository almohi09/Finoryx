import { useEffect, useState } from "react";
import {
  Plus,
  Trash2,
  Pencil,
  ArrowUpRight,
  ArrowDownRight,
  Wallet,
  Sparkles,
  CalendarDays,
  Landmark,
  RefreshCw,
  BrainCircuit,
} from "lucide-react";
import { financeService } from "../../services/finance.service";
import {
  formatCurrency,
  formatDate,
  formatRelativeTime,
  getCategoryInfo,
  getIncomeSourceInfo,
} from "../../utils/helpers";
import { BANK_ACCOUNT_TYPES, EXPENSE_CATEGORIES } from "../../constants";
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
  { key: "balance", label: "Tracked Balance", icon: Wallet, accent: "text-amber-300", surface: "from-amber-500/18 via-amber-500/6 to-transparent" },
  { key: "linkedBalance", label: "Linked Accounts", icon: Landmark, accent: "text-sky-300", surface: "from-sky-500/18 via-sky-500/6 to-transparent" },
];

const getDefaultTransactionForm = (type = "expense", item = null) => {
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

const defaultBankForm = {
  institutionName: "",
  accountName: "",
  accountType: "checking",
  mask: "",
  balance: "",
};

const Finance = () => {
  const [activeTab, setActiveTab] = useState("All");
  const [incomes, setIncomes] = useState([]);
  const [expenses, setExpenses] = useState([]);
  const [bankAccounts, setBankAccounts] = useState([]);
  const [bankTransactions, setBankTransactions] = useState([]);
  const [advisorData, setAdvisorData] = useState({ insights: [], summary: {} });
  const [showTransactionModal, setShowTransactionModal] = useState(false);
  const [showBankModal, setShowBankModal] = useState(false);
  const [modalType, setModalType] = useState("expense");
  const [editItem, setEditItem] = useState(null);
  const [form, setForm] = useState(getDefaultTransactionForm());
  const [bankForm, setBankForm] = useState(defaultBankForm);
  const [saving, setSaving] = useState(false);
  const [syncingId, setSyncingId] = useState("");
  const [linkingPlaid, setLinkingPlaid] = useState(false);
  const [institutionQuery, setInstitutionQuery] = useState("");
  const [institutionSuggestions, setInstitutionSuggestions] = useState([]);
  const [institutionSearchOpen, setInstitutionSearchOpen] = useState(false);
  const [institutionSearchLoading, setInstitutionSearchLoading] = useState(false);

  const loadPlaidScript = async () => {
    if (window.Plaid?.create) return;

    await new Promise((resolve, reject) => {
      const existing = document.querySelector('script[data-plaid-link="true"]');
      if (existing) {
        existing.addEventListener("load", resolve, { once: true });
        existing.addEventListener("error", reject, { once: true });
        return;
      }

      const script = document.createElement("script");
      script.src = "https://cdn.plaid.com/link/v2/stable/link-initialize.js";
      script.async = true;
      script.dataset.plaidLink = "true";
      script.onload = () => resolve();
      script.onerror = () => reject(new Error("Unable to load Plaid Link"));
      document.body.appendChild(script);
    });
  };

  const fetchData = async () => {
    try {
      const [incRes, expRes, accountRes, txRes, advisorRes] = await Promise.allSettled([
        financeService.getIncomes(),
        financeService.getExpenses(),
        financeService.getBankAccounts(),
        financeService.getBankTransactions(),
        financeService.getAdvisorInsights(),
      ]);

      setIncomes(incRes.status === "fulfilled" ? incRes.value.data?.incomes || [] : []);
      setExpenses(expRes.status === "fulfilled" ? expRes.value.data?.expenses || [] : []);
      setBankAccounts(accountRes.status === "fulfilled" ? accountRes.value.data?.accounts || [] : []);
      setBankTransactions(txRes.status === "fulfilled" ? txRes.value.data?.transactions || [] : []);
      setAdvisorData(advisorRes.status === "fulfilled" ? advisorRes.value.data || { insights: [], summary: {} } : { insights: [], summary: {} });
    } catch {
      setIncomes([]);
      setExpenses([]);
      setBankAccounts([]);
      setBankTransactions([]);
      setAdvisorData({ insights: [], summary: {} });
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    if (!showBankModal) return;
    const query = institutionQuery.trim();
    if (!query || query.length < 2) {
      setInstitutionSuggestions([]);
      setInstitutionSearchOpen(false);
      return;
    }

    const timer = setTimeout(async () => {
      setInstitutionSearchLoading(true);
      try {
        const { data } = await financeService.searchBankInstitutions(query, 10);
        setInstitutionSuggestions(data?.institutions || []);
        setInstitutionSearchOpen(true);
      } catch {
        setInstitutionSuggestions([]);
      } finally {
        setInstitutionSearchLoading(false);
      }
    }, 250);

    return () => clearTimeout(timer);
  }, [institutionQuery, showBankModal]);

  const openAdd = (type) => {
    setModalType(type);
    setEditItem(null);
    setForm(getDefaultTransactionForm(type));
    setShowTransactionModal(true);
  };

  const openEdit = (item, type) => {
    setModalType(type);
    setEditItem(item);
    setForm(getDefaultTransactionForm(type, item));
    setShowTransactionModal(true);
  };

  const handleSave = async () => {
    if (modalType === "expense" && !form.description.trim()) return toast.error("Description is required");
    if (modalType === "income" && !form.source.trim()) return toast.error("Income source is required");
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
      setShowTransactionModal(false);
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

  const handleAddBankAccount = async () => {
    if (!bankForm.institutionName.trim() || !bankForm.accountName.trim()) {
      return toast.error("Institution and account name are required");
    }

    setSaving(true);
    try {
      await financeService.addBankAccount(bankForm);
      toast.success("Bank account linked");
      setBankForm(defaultBankForm);
      setInstitutionQuery("");
      setInstitutionSuggestions([]);
      setInstitutionSearchOpen(false);
      setShowBankModal(false);
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to link bank account");
    } finally {
      setSaving(false);
    }
  };

  const handleSync = async (accountId) => {
    setSyncingId(accountId);
    try {
      await financeService.syncBankAccount(accountId);
      toast.success("Account synced");
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to sync account");
    } finally {
      setSyncingId("");
    }
  };

  const handlePlaidConnect = async () => {
    setLinkingPlaid(true);
    try {
      const { data } = await financeService.createBankLinkToken();
      const linkToken = data?.linkToken;
      if (!linkToken) {
        throw new Error("Missing link token");
      }

      await loadPlaidScript();
      const handler = window.Plaid.create({
        token: linkToken,
        onSuccess: async (publicToken) => {
          try {
            await financeService.exchangeBankPublicToken(publicToken);
            toast.success("Bank accounts linked");
            fetchData();
          } catch (error) {
            toast.error(error.response?.data?.message || "Failed to finalize bank link");
          }
        },
        onExit: () => {},
      });
      handler.open();
    } catch (error) {
      toast.error(error.response?.data?.message || error.message || "Failed to initialize Plaid Link");
    } finally {
      setLinkingPlaid(false);
    }
  };

  const handleSelectInstitution = (institution) => {
    setBankForm((prev) => ({ ...prev, institutionName: institution.name || prev.institutionName }));
    setInstitutionQuery(institution.name || "");
    setInstitutionSearchOpen(false);
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
  const linkedBalance = bankAccounts.reduce((sum, item) => sum + (item.balance || 0), 0);
  const categoryData = EXPENSE_CATEGORIES.map((cat) => ({
    name: cat.label,
    value: expenses.filter((item) => item.category === cat.value).reduce((sum, item) => sum + (item.amount || 0), 0),
  })).filter((item) => item.value > 0);
  const summaryValues = { income: totalIncome, expense: totalExpense, balance, linkedBalance };
  const savingsRate = totalIncome > 0 ? Math.max(0, Math.round((balance / totalIncome) * 100)) : 0;
  const topExpenseCategory = categoryData.slice().sort((a, b) => b.value - a.value)[0] || null;

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
                  Link bank accounts, auto-sync transactions, and review AI-driven guidance alongside your manual bookkeeping.
                </p>
              </div>
              <div className="hidden md:flex items-center gap-2 px-3 py-2 rounded-2xl border text-sm font-display font-700 bg-sky-500/12 text-sky-300 border-sky-500/20">
                <Landmark size={16} />
                {bankAccounts.length} linked account{bankAccounts.length !== 1 ? "s" : ""}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 mt-5">
              {overviewCards.map((item, index) => {
                const Icon = item.icon;
                return (
                  <div
                    key={item.key}
                    className={`rounded-2xl border p-4 animate-fade-up animate-delay-${(index + 1) * 100} bg-gradient-to-br ${item.surface}`}
                    style={{ borderColor: "var(--border-light)" }}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-xs uppercase tracking-[0.18em] muted-text font-display font-600">{item.label}</span>
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
                      {item.key === "linkedBalance" && `${bankTransactions.length} synced transaction${bankTransactions.length !== 1 ? "s" : ""}`}
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
              <h3 className="section-title mt-2">Advisor snapshot</h3>
            </div>
            <span className="p-2 rounded-xl bg-white/5 text-sky-300">
              <BrainCircuit size={15} />
            </span>
          </div>

          <div className="space-y-3 mt-4">
            {(advisorData.insights || []).slice(0, 3).map((insight) => {
              const toneClass = insight.tone === "warning"
                ? "border-rose-500/20 bg-rose-500/8"
                : insight.tone === "positive"
                  ? "border-emerald-500/20 bg-emerald-500/8"
                  : "border-sky-500/20 bg-sky-500/8";

              return (
                <div key={insight.id} className={`rounded-2xl p-4 border ${toneClass}`}>
                  <p className="text-sm font-display font-700">{insight.title}</p>
                  <p className="text-xs muted-text mt-2 leading-5">{insight.summary}</p>
                  <p className="text-xs mt-2 text-white/80 leading-5">{insight.action}</p>
                </div>
              );
            })}

            {advisorData.insights?.length === 0 ? (
              <div className="rounded-2xl p-4 border" style={{ background: "var(--bg-secondary)", borderColor: "var(--border)" }}>
                <p className="text-sm font-display font-700">No advisor signals yet</p>
                <p className="text-xs muted-text mt-2">Add transactions and link an account to generate recommendations.</p>
              </div>
            ) : null}
          </div>
        </Card>
      </div>

      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 animate-fade-up animate-delay-100">
        <div>
          <p className="text-xs uppercase tracking-[0.18em] muted-text font-display font-600">Actions</p>
          <p className="muted-text text-sm mt-1">Capture manual records fast, then connect accounts for automatic tracking.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="ghost" size="sm" className="min-w-[9rem]" onClick={() => openAdd("expense")}>
            <Plus size={13} /> Add Expense
          </Button>
          <Button variant="ghost" size="sm" className="min-w-[9rem]" onClick={() => openAdd("income")}>
            <Plus size={13} /> Add Income
          </Button>
          <Button variant="ghost" size="sm" className="min-w-[11rem]" loading={linkingPlaid} onClick={handlePlaidConnect}>
            <Landmark size={13} /> Connect Plaid
          </Button>
          <Button
            size="sm"
            className="min-w-[10rem]"
            onClick={() => {
              setInstitutionQuery(bankForm.institutionName || "");
              setInstitutionSearchOpen(false);
              setShowBankModal(true);
            }}
          >
            <Landmark size={13} /> Link Account
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-[1.05fr_0.95fr] gap-5 animate-fade-up animate-delay-200 items-start">
        <Card className="overflow-hidden">
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-xs uppercase tracking-[0.18em] muted-text font-display font-600">Integrations</p>
              <h3 className="section-title mt-2">Linked Bank Accounts</h3>
            </div>
            <span className="badge-gold">{bankAccounts.length} connected</span>
          </div>

          <div className="grid gap-3">
            {bankAccounts.length === 0 ? (
              <div className="text-center py-12 muted-text text-sm">No bank accounts linked yet</div>
            ) : bankAccounts.map((account) => (
              <div key={account._id} className="rounded-2xl border p-4" style={{ background: "var(--bg-secondary)", borderColor: "var(--border)" }}>
                <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
                  <div>
                    <p className="text-base font-display font-700">{account.accountName}</p>
                    <p className="text-xs uppercase tracking-[0.16em] muted-text mt-1">
                      {account.institutionName} | {account.accountType} | {account.maskedNumber}
                    </p>
                    <p className="text-xs muted-text mt-3">
                      Last sync {account.lastSyncedAt ? formatRelativeTime(account.lastSyncedAt) : "not yet"}
                    </p>
                  </div>
                  <div className="md:text-right">
                    <div className="text-2xl font-display font-800 text-sky-300">{formatCurrency(account.balance)}</div>
                    <Button
                      size="sm"
                      className="mt-3"
                      loading={syncingId === account._id}
                      onClick={() => handleSync(account._id)}
                    >
                      <RefreshCw size={13} /> Sync Now
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </Card>

        <Card className="overflow-hidden self-start">
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-xs uppercase tracking-[0.18em] muted-text font-display font-600">Auto tracking</p>
              <h3 className="section-title mt-2">Synced Transactions</h3>
            </div>
            <span className="p-2 rounded-xl bg-white/5 text-amber-300">
              <CalendarDays size={15} />
            </span>
          </div>

          <div className="space-y-3 max-h-[30rem] overflow-y-auto pr-1">
            {bankTransactions.length === 0 ? (
              <div className="text-center py-12 muted-text text-sm">Sync a linked account to populate this feed</div>
            ) : bankTransactions.slice(0, 12).map((tx) => {
              const isCredit = tx.direction === "credit";
              return (
                <div key={tx._id} className="rounded-2xl border p-4" style={{ background: "var(--bg-secondary)", borderColor: "var(--border)" }}>
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <p className="text-sm font-display font-700 break-words">{tx.description}</p>
                      <p className="text-xs uppercase tracking-[0.16em] muted-text mt-1 break-words">
                        {tx.institutionName} | {tx.accountName} | {tx.category}
                      </p>
                      <p className="text-xs muted-text mt-2">{formatDate(tx.date)}</p>
                    </div>
                    <div className={`text-right text-lg font-display font-800 ${isCredit ? "text-emerald-300" : "text-rose-300"}`}>
                      {isCredit ? "+" : "-"}{formatCurrency(tx.amount)}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
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
              <h3 className="section-title mt-2">Manual Transactions</h3>
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
            {[["Income records", incomes.length, "Tracked inflows", "text-emerald-300"],
              ["Expense records", expenses.length, "Tracked outflows", "text-rose-300"],
              ["Top category", topExpenseCategory?.name || "No data", "Largest expense slice", "text-amber-300"]].map(([label, value, sub, tone]) => (
              <div key={label} className="rounded-2xl border p-3.5" style={{ background: "var(--bg-secondary)", borderColor: "var(--border)" }}>
                <p className="text-xs uppercase tracking-[0.16em] muted-text font-display font-600">{label}</p>
                <div className={`text-lg font-display font-800 ${tone} mt-2`}>{value}</div>
                <p className="text-xs muted-text mt-1">{sub}</p>
              </div>
            ))}
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
              const badgeClass = tx.type === "income" ? "badge-green" : "badge-red";
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
                  <div className="px-4 py-2.5 border-b flex flex-wrap items-center justify-between gap-3" style={{ borderColor: "rgba(255,255,255,0.06)" }}>
                    <div className="flex items-center gap-2">
                      <span className={badgeClass}>{tx.type === "income" ? "Income" : "Expense"}</span>
                      <span className="text-xs muted-text">{formatDate(tx.date || tx.createdAt)}</span>
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

                  <div className="p-5">
                    <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-base font-display font-700 leading-6 break-words">{detailLabel}</p>
                        <p className="text-xs uppercase tracking-[0.16em] muted-text mt-1 break-words">{metaLabel}</p>
                        {tx.notes ? <p className="text-sm muted-text mt-3 leading-6 break-words">{tx.notes}</p> : null}
                      </div>

                      <div className="md:text-right shrink-0">
                        <div className={`text-xl font-display font-800 ${amountClass}`}>
                          {tx.type === "income" ? "+" : "-"}{formatCurrency(tx.amount)}
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

      <Modal
        isOpen={showTransactionModal}
        onClose={() => setShowTransactionModal(false)}
        title={`${editItem ? "Edit" : "Add"} ${modalType === "income" ? "Income" : "Expense"}`}
        size="lg"
      >
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
            <Button variant="ghost" className="flex-1" onClick={() => setShowTransactionModal(false)}>Cancel</Button>
            <Button className="flex-1" loading={saving} onClick={handleSave}>{editItem ? "Update Entry" : "Save Entry"}</Button>
          </div>
        </div>
      </Modal>

      <Modal
        isOpen={showBankModal}
        onClose={() => {
          setInstitutionSearchOpen(false);
          setShowBankModal(false);
        }}
        title="Link Bank Account"
        size="lg"
      >
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="relative">
              <Input
                label="Institution"
                placeholder="Search institution (e.g. Chase, Wells Fargo)"
                value={institutionQuery}
                onChange={(e) => {
                  const value = e.target.value;
                  setInstitutionQuery(value);
                  setBankForm((prev) => ({ ...prev, institutionName: value }));
                  setInstitutionSearchOpen(true);
                }}
              />
              {institutionSearchOpen ? (
                <div
                  className="absolute z-30 mt-1 w-full rounded-xl border max-h-52 overflow-y-auto"
                  style={{ background: "var(--bg-elevated)", borderColor: "var(--border-light)" }}
                >
                  {institutionSearchLoading ? (
                    <div className="px-3 py-2 text-xs muted-text">Searching institutions...</div>
                  ) : institutionSuggestions.length === 0 ? (
                    <div className="px-3 py-2 text-xs muted-text">No matching institutions</div>
                  ) : institutionSuggestions.map((institution) => (
                    <button
                      type="button"
                      key={institution.institutionId || institution.name}
                      className="w-full text-left px-3 py-2 hover:bg-white/5 transition-colors"
                      onClick={() => handleSelectInstitution(institution)}
                    >
                      <p className="text-sm font-display font-700">{institution.name}</p>
                      {institution.url ? <p className="text-xs muted-text mt-1">{institution.url}</p> : null}
                    </button>
                  ))}
                </div>
              ) : null}
            </div>
            <Input
              label="Account Name"
              placeholder="e.g. Primary Salary Account"
              value={bankForm.accountName}
              onChange={(e) => setBankForm({ ...bankForm, accountName: e.target.value })}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Select
              label="Type"
              value={bankForm.accountType}
              onChange={(e) => setBankForm({ ...bankForm, accountType: e.target.value })}
              options={BANK_ACCOUNT_TYPES}
            />
            <Input
              label="Last 4 digits"
              maxLength={4}
              placeholder="1234"
              value={bankForm.mask}
              onChange={(e) => setBankForm({ ...bankForm, mask: e.target.value.replace(/\D/g, "").slice(0, 4) })}
            />
            <Input
              label="Current Balance"
              type="number"
              placeholder="0"
              value={bankForm.balance}
              onChange={(e) => setBankForm({ ...bankForm, balance: e.target.value })}
            />
          </div>

          <div className="rounded-2xl border p-4 text-sm muted-text" style={{ background: "var(--bg-secondary)", borderColor: "var(--border)" }}>
            Use Plaid Link in production to connect and authorize accounts securely, then run sync to pull recent posted and pending transactions.
          </div>

          <div className="flex gap-3 pt-2">
            <Button variant="ghost" className="flex-1" onClick={() => setShowBankModal(false)}>Cancel</Button>
            <Button className="flex-1" loading={saving} onClick={handleAddBankAccount}>Link Account</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default Finance;
